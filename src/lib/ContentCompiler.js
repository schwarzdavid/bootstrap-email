const ElementHelper = require('./ElementHelper');
const {VOID_ELEMENTS, BLOCK_ELEMENTS} = require('../constants');

/**
 * @enum {string}
 * @readonly
 * @memberOf ContentCompiler
 */
const ALIGNMENT = {
	/** .float-left*/
	LEFT: '.float-left',
	/** .mx-auto */
	CENTER: '.mx-auto',
	/** .float-right*/
	RIGHT: '.float-right'
};

/**
 * Utilclass for compiling
 */
class ContentCompiler {

	//*****************************************
	// CONSTRUCTOR
	//*****************************************

	/**
	 * @param {cheerio} $
	 * @param {Logger} logger
	 */
	constructor($, logger) {

		/**
		 * @type {cheerio}
		 * @private
		 */
		this._$ = $;

		/**
		 * @type {Logger}
		 * @private
		 */
		this._logger = logger;
	}


	//*****************************************
	// PUBLIC METHODS
	//*****************************************

	/**
	 * Replaces all divs with tables
	 * @private
	 */
	div() {
		const $ = this._$;
		const elements = $('div');

		elements.each((i, _el) => {
			const el = $(_el);

			if (!el.attr('style') && !el.attr('class')) {
				ElementHelper.unwrap(el);
			} else {
				const {td, table} = this._createTable();

				table.attr(el.attr());
				const hasWidth = (el.attr('class') || '').split(' ').find(cls => cls.startsWith('w-'));
				if (!hasWidth) {
					table.addClass('w-100');
				}
				td.html(el.html());

				el.replaceWith(table);
			}
		});
	}

	/**
	 * Replaces all margin classes to equivalent spacer elements
	 * @private
	 */
	margin() {
		const $ = this._$;
		const regex = /m[btylrx]?-(lg-)?(\d)/i;

		while(true) {
			const el = $('*[class*=m-], *[class*=my-], *[class*=mx-], *[class*=mt-], *[class*=mb-], *[class*=ml-], *[class*=mr-]').not('.mx-auto').first();
			if(!el.length) {
				break;
			}
			const cssDisplay = el.css('display');
			const tagName = el.prop('tagName').toLowerCase();
			if ((cssDisplay === undefined && !BLOCK_ELEMENTS.includes(tagName)) || cssDisplay === 'inline') {
				this._logger.warn('Inline-Elements does not support margins. Got ' + tagName);
				break;
			}

			const marginClasses = el.attr('class').split(' ').filter(classname => classname.match(regex));

			ElementHelper.removeClass(el, marginClasses.join(' '));

			const appendClasses = marginClasses.map(classname => 's' + classname.substr(1));
			appendClasses.push('w-100');

			ElementHelper.wrap(el, 'spacing', {
				classes: appendClasses,
				attributes: { 'data-src': 'margin' }
			}, false);
		}
	}

	/**
	 * Handles all padding classes. If padding-element is not a table, wrap a table around
	 * @private
	 */
	padding() {
		const $ = this._$;
		const regex = /p[btylrx]?-(lg-)?(\d)/i;

		while(true) {
			const el = $('*[class*=p-], *[class*=pt-], *[class*=pr-], *[class*=pb-], *[class*=pl-], *[class*=px-], *[class*=py-]').first();
			if(!el.length) {
				break;
			}
			const paddingClasses = el.attr('class').split(' ').filter(classname => classname.match(regex));

			ElementHelper.removeClass(el, paddingClasses.join(' '));

			const cssDisplay = el.css('display');
			const appendClasses = paddingClasses.map(classname => 's' + classname.substr(1));

			const tagName = el.prop('tagName').toLowerCase();
			if (
				(BLOCK_ELEMENTS.includes(tagName) && cssDisplay === undefined)
				|| cssDisplay === 'block'
				|| el.hasClass('d-block')
				|| el.hasClass('btn-block')
			) {
				appendClasses.push('w-100');
			}

			if (VOID_ELEMENTS.includes(tagName)) {
				ElementHelper.wrap(el, 'spacing', {
					classes: appendClasses,
					attributes: {'data-src': 'padding'}
				}, true);
			} else {
				ElementHelper.wrapContent(el, 'spacing', {
					classes: appendClasses,
					attributes: {'data-src': 'padding'}
				});
			}
		}
	}

	/**
	 * Handles floats and centered elements
	 * @param {ALIGNMENT} direction
	 * @private
	 */
	align(direction) {
		if (!(Object.values(ALIGNMENT).includes(direction))) {
			this._logger.warn(`Unknown direction ${direction}. Will be ignored`);
			return;
		}

		const $ = this._$;
		$(direction).each((i, _el) => {
			const el = $(_el);

			if (direction === ALIGNMENT.CENTER) {
				ElementHelper.wrap(el, 'center', {}, false);
			} else {
				const alignValue = Object.keys(ALIGNMENT).find(key => ALIGNMENT[key] === direction).toLowerCase();

				if (_el.name === 'table') {
					el.attr({
						'align': alignValue,
						'data-bte-added-attribute': 'align'
					});
				} else {
					ElementHelper.wrap(el, 'table', {
						attributes: {
							align: alignValue,
							'data-bte-added-attribute': 'align'
						}
					}, false);
				}
			}
		});
	}

	/**
	 * Adds border, cellspacing and cellpadding attributes to all table elements
	 * @private
	 */
	table() {
		const $ = this._$;
		$('table').each((i, _el) => {
			$(_el).attr({
				border: 0,
				cellpadding: 0,
				cellspacing: 0
			});
		});
	}

	/**
	 * Replaces preview tag with hidden div and extend content to 100 characters
	 * @private
	 */
	preview() {
		const $ = this._$;
		const preview = $('preview');

		if (preview.length > 0) {
			const content = preview.html();
			preview.html(content + '&nbsp;'.repeat(Math.max(100 - content.length, 0)));
			preview.addClass('preview');
			preview[0].tagName = 'div';
		}
	}

	/**
	 * Replaces rows and columns to tables and set according separators
	 * @param {number} columns - Amount of allowed columns in a row
	 * @private
	 */
	grid(columns) {
		const $ = this._$;
		$('.row').each((rowIndex, _row) => {
			const row = $(_row);

			const desktopGrid = this._generateGrid(row.clone(), columns, true);
			const mobileGrid = this._generateGrid(row, columns, false);

			row.empty().append(desktopGrid).append(mobileGrid);

			mobileGrid.before('<!--[if !mso]><!-->').after('<!--<![endif]-->');
		});
	}

	/**
	 * Wraps and replaces container
	 * @param {number} [width=630]
	 */
	container(width = 630) {
		const $ = this._$;

		$('.container, .container-fluid').each((i, _el) => {
			const el = $(_el);
			ElementHelper.wrap(el, 'container', {
				variables: {
					containerWidthFallback: !el.hasClass('container-fluid'),
					width
				}
			});
		});
		$('[data-bte-removed-class="container"], [data-bte-removed-class="container-fluid"]').each((i, _el) => {
			const el = $(_el);
			ElementHelper.replace(el, 'container-inner');
		});
	}

	/**
	 * Wraps body-content
	 */
	body() {
		ElementHelper.wrapContent(this._$('body'), 'body');
	}

	/**
	 * Replaces all hr tags with the according hr-template
	 */
	hr() {
		const $ = this._$;
		$('hr').each((i, _el) => {
			ElementHelper.replace($(_el), 'hr');
		});
	}

	/**
	 * Ensures that all components with given selector (class in most cases) are tables
	 * @param {string} selector
	 * @param {object} [addons] {@link ElementHelper.wrap}
	 */
	component(selector, addons) {
		const $ = this._$;
		$(selector).each((i, _el) => {
			if (_el.name !== 'table') {
				ElementHelper.wrap($(_el), 'table', addons);
			}
		});
	}


	//*****************************************
	// PRIVATE METHODS
	//*****************************************

	/**
	 * Generates markup for a grid
	 * @param rowSrc
	 * @param columns
	 * @param isLG
	 * @return {cheerio}
	 * @private
	 */
	_generateGrid(rowSrc, columns, isLG) {
		const $ = this._$;
		const regex = /col-(lg-)?(\d{1,2})/i;

		const gridBody = $('<tbody>');
		const grid = $('<table>')
			.addClass('bte-grid')
			.addClass('bte-grid--' + (isLG ? 'desktop' : 'mobile'))
			.append(gridBody);

		const cols = rowSrc.children('*[class*="col"]');

		for (let colIndex = 0; colIndex < cols.length;) {
			const row = $('<tr>').addClass('row');
			const rowBody = $('<tbody>').append(row);
			const rowTable = $('<table>').addClass('bte-grid__inner').append(rowBody);
			const gridCell = $('<td>').append(rowTable);
			const gridRow = $('<tr>').append(gridCell);

			for (let rowCols = 0; colIndex < cols.length; colIndex++) {
				const col = $(cols[colIndex]);

				let colSize = 0;

				(col.attr('class') || '').split(' ').forEach(classname => {
					const match = classname.match(regex);

					if (match) {
						const size = parseInt(match.pop());
						const isColLG = !!match.pop();

						if (isNaN(size)) {
							this._logger.warn('Malformed column name. Ignored');
						} else if (isColLG === isLG || (isLG && !colSize)) {
							colSize = size;
						}
					}
				});

				if (!colSize) {
					colSize = columns;
				}

				rowCols += colSize;

				if (rowCols > columns) {
					break;
				}

				if (rowCols > colSize && !rowSrc.hasClass('no-gutters')) {
					row.append('<td class="bte-col-separator">&nbsp;</td>');
				}

				const cell = $('<td>')
					.addClass(`bte-col-${colSize}`)
					.append(col);

				col.attr('class').split(' ').forEach(classname => {
					if (regex.test(classname)) {
						ElementHelper.removeClass(col, classname);
					}
				});

				row.append(cell).attr('data-cols', rowCols);
			}

			const colOffset = columns - parseInt(row.attr('data-cols'));
			if (colOffset > 0) {
				const cell = $('<td>').addClass('col-' + colOffset);
				row.append(cell);
			}

			gridBody.append(gridRow);
		}

		ElementHelper.removeClass(rowSrc, 'row');

		return grid;
	}

	/**
	 * Creates a table with all required childs
	 * @return {{td: cheerio, tbody: cheerio, table: cheerio, tr: cheerio}}
	 * @private
	 */
	_createTable() {
		const $ = this._$;

		const td = $('<td>');
		const tr = $('<tr>').append(td);
		const tbody = $('<tbody>').append(tr);
		const table = $('<table>').append(tbody);

		return {
			table,
			tbody,
			tr,
			td
		};
	}
}

ContentCompiler.ALIGNMENT = ALIGNMENT;

module.exports = ContentCompiler;
