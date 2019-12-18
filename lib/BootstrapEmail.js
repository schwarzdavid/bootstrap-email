const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sass = require('sass-extract');
const postcss = require('postcss');
const extractMQ = require('postcss-extract-media-query');
const ejs = require('ejs');
const juice = require('juice');
const tmp = require('tmp');
const templateLoader = require('./template-loader');
const helper = require('./helper');

const __templates = templateLoader();

const __defaultConfig = {
	style: path.join(__dirname, '../assets/bootstrap-email.scss'),
	head: path.join(__dirname, '../assets/head.scss'),
	containerWidthFallback: true
};

const __defaultVariables = {
	columns: 12
};


/**
 * TODO: ADD CUSTOM ERROR- & WARNING-HANDLER
 */
class BootstrapEmail {

	//*****************************************
	// CONSTRUCTOR
	//*****************************************

	/**
	 * Creates a new BootstrapEmail instance
	 *
	 * @constructor
	 * @param {object} options
	 * @param {string} [options.style] Path to .css or .scss file that should be inlined
	 * @param {string} [options.head] Path to .css or .scss file taht should be injected into header
	 * @param {boolean} [options.containerWidthFallback] Wether to place a conditional comment in the container template to improve max-width compatibility with older Outlook versions
	 * @param {string} [options.template] Path to .html file, that should be compiled
	 * @param {string[]} [options.templates] Array with paths to .html files that should be compiled
	 * @param {string} [options.content] HTML template as string. By using this, 'template(s)' option will be overwritten
	 */
	constructor({
					style = __defaultConfig.style,
					head = __defaultConfig.head,
					containerWidthFallback = __defaultConfig.containerWidthFallback,
					template,
					templates = [],
					content
				}) {

		this._stylePath = style;
		this._headPath = head;
		this._containerWidthFallback = containerWidthFallback;
		this._templates = [];

		this._vars = {...__defaultVariables};

		const templatePaths = [];

		// HANDLE TEMPLATES-PARAMETER
		//*****************************************
		if (!Array.isArray(templates)) {
			if (typeof templates === 'string') {
				console.warn('Use "template" to compile a single template');
				templatePaths.push(templates);
			} else {
				console.warn(`Parameter 'templates' must be an array. Got: ${typeof templates}. Given parameter will be ignored`);
			}
		} else {
			templates.forEach(templatePath => {
				if (typeof templatePath !== 'string') {
					console.warn(`Template paths must be strings. Value ${templatePath} is a ${typeof templatePath} and will be ignored.`);
					return;
				}
				templatePaths.push(templatePath);
			});
		}

		// HANDLE TEMPLATE PARAMETER
		//*****************************************
		if (template !== undefined) {
			if (typeof template === 'string') {
				templatePaths.push(template);
			} else {
				console.warn(`Template property must be a string. Got ${typeof template}`);
			}
		}

		// HANDLE CONTENT PARAMETER
		//*****************************************
		if (typeof content === 'string') {
			this._templates = [{
				$: cheerio.load(content),
				name: `compiled-email-${Date.now().toString().substr(-4)}.html`,
				abstract: true
			}];
		}

		// LOAD ALL TEMPLATE PATHS
		//*****************************************
		for (let filePath of templatePaths) {
			try {
				const data = fs.readFileSync(filePath, 'utf8');
				this._templates.push({
					$: cheerio.load(data),
					name: path.basename(filePath)
				});
			} catch (err) {
				if (err.code === 'ENOENT') {
					console.warn(`Given file ${filePath} does not exist or is not readable. Template will be ignored`);
				} else {
					throw err;
				}
			}
		}

		// LOAD STYLES
		//*****************************************
		const {css, vars, queries} = BootstrapEmail._processStyle(this._stylePath);
		this._inlineStyles = css;
		this._queryStyles = queries;

		if (vars['$grid-columns']) {
			this._vars.columns = parseInt(vars['$grid-columns'].value);
		}
	}


	//*****************************************
	// PUBLIC METHODS
	//*****************************************

	/**
	 * Performs a full compile and returns compiled templates
	 * @return {(string|[{path:string,document:string}])} If only one templates has been compiled, returns the compiled html code, otherwise an array containing the path and compiled document
	 */
	compile() {
		this._compileHtml();
		this._inlineCss();
		this._injectHead();

		return this._output();
	}

	/**
	 * Performs a full compile and saves documents to given destination
	 * @param {string} filePath - If only one template is compiled, filePath takes a full path including filename and extension. Otherwise it takes only the directory name and uses the filename from inputfiles
	 * @returns void
	 */
	compileAndSave(filePath) {
		const outputs = this.compile();

		if (typeof outputs === 'string') {
			fs.writeFileSync(filePath, outputs);
		} else {
			for (let output of outputs) {
				fs.writeFileSync(path.join(filePath, output.name), output.document);
			}
		}
	}


	//*****************************************
	// PRIVATE METHODS
	//*****************************************

	/**
	 * Replaces bootstrap classes with saved workarounds
	 * @private
	 */
	_compileHtml() {
		for (let template of this._templates) {
			const $ = template.$;

			// HIDE PREVIEW TEXT
			//*****************************************
			BootstrapEmail._preview($);

			// WRAP BODY
			//*****************************************
			BootstrapEmail._wrapContents($, 'body', 'body', {classes: 'body'}, true);

			// HANDLE MARGINS
			//*****************************************
			BootstrapEmail._marginHelper($);
			BootstrapEmail._paddingHelper($);

			// HANDLE CONTAINERS AND GRIDS
			//*****************************************
			BootstrapEmail._replaceElements($, '.container', 'container-inner');
			BootstrapEmail._wrapElements($, '.container', 'container', {variables: {containerWidthFallback: this._containerWidthFallback}});

			BootstrapEmail._replaceElements($, '.container-fluid', 'container-inner');
			BootstrapEmail._wrapElements($, '.container-fluid', 'container', {variables: {containerWidthFallback: false}});

			BootstrapEmail._gridHelper($, this._vars.columns);

			// HANDLE UTIL CLASSES
			//*****************************************
			BootstrapEmail._alignmentHelper($, '.float-left', 'left');
			BootstrapEmail._alignmentHelper($, '.float-right', 'right');
			BootstrapEmail._alignmentHelper($, '.mx-auto', 'center');


			// Wrap design classes
			//*****************************************
			BootstrapEmail._replaceElements($, 'hr', 'hr');
			BootstrapEmail._wrapElements($, '.card', 'table');
			BootstrapEmail._wrapElements($, '.card-body', 'table');
			BootstrapEmail._wrapElements($, '.btn', 'table');
			BootstrapEmail._wrapElements($, '.badge', 'table-left', {attributes: {align: 'left'}});
			BootstrapEmail._wrapElements($, '.alert', 'table');


			// HANDLE DIVS
			//*****************************************
			BootstrapEmail._divHelper($);

			// Add relevant attributes to tables
			BootstrapEmail._tableHelper($);
		}
	}

	/**
	 * Inlines all css classes into style attributes
	 * @private
	 */
	_inlineCss() {
		for (let template of this._templates) {
			juice.inlineDocument(template.$, this._inlineStyles, {
				applyAttributesTableElements: true,
				applyHeightAttributes: true,
				applyWidthAttributes: true
			});
		}
	}

	/**
	 * Injects content of given head-file into the head of each template
	 * @private
	 */
	_injectHead() {
		const headCss = BootstrapEmail._processStyle(this._headPath).css;

		for (let template of this._templates) {
			const headStyle = template.$('<style>')
				.attr('type', 'text/css')
				.text(headCss);

			const charset = template.$('<meta>').attr({
				'http-equiv': 'Content-Type',
				'content': 'text/html; charset=utf-8'
			});

			const viewport = template.$('<meta>').attr({
				'name': 'viewport',
				'content': 'width=device-width, initial-scale=1'
			});

			const head = template.$('head')
				.append(charset)
				.append(viewport)
				.append(headStyle);

			if (this._queryStyles) {
				const queryStyles = template.$('<style>')
					.attr('type', 'text/css')
					.text(this._queryStyles);
				head.append(queryStyles);
			}
		}
	}

	/**
	 * Prepares user-friendly output structure
	 * @return {(string|[{path:string,document:string}])}
	 * @private
	 */
	_output() {
		const out = [];

		for (let template of this._templates) {
			out.push({
				name: template.name,
				document: helper.doctype + template.$.html()
			});
		}

		if (out.length === 1) {
			return out[0].document;
		}
		return out;
	}


	//*****************************************
	// STATIC HTML HELPER METHODS
	//*****************************************

	/**
	 * Replaces selected elements with given template
	 * @param {cheerio} $ - Template
	 * @param {string} selector - Items to compile
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static _replaceElements($, selector, tplName, {classes, attributes, variables} = {}) {
		$(selector).each((i, _el) => {
			BootstrapEmail._replaceElement($(_el), tplName, {classes, attributes, variables});
		});
	}

	/**
	 * Replaces one element with given template
	 * @param {cheerio} el - Element to be replaced
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static _replaceElement(el, tplName, {classes = [], attributes = {}, variables = {}} = {}) {
		classes = BootstrapEmail._ensureArray(classes);
		attributes = BootstrapEmail._concatAttributes(el, attributes);

		if (attributes.class) {
			classes.push(...attributes.class.split(' '));
			delete attributes.class;
		}

		const content = el.html();
		const template = cheerio(ejs.render(__templates[tplName], {variables, content}));

		template.attr(attributes);
		template.addClass(classes.join(' '));

		el.replaceWith(template);
	}

	/**
	 * Wraps the content of selected elements with given template
	 * @param {cheerio} $ - Template
	 * @param {string} selector - Items to compile
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static _wrapContents($, selector, tplName, {classes, attributes, variables} = {}) {
		$(selector).each((i, _el) => {
			BootstrapEmail._wrapContent($(_el), tplName, {classes, attributes, variables});
		});
	}

	/**
	 * Wraps the content of given element with given template
	 * @param {cheerio} el - Element to be replaced
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static _wrapContent(el, tplName, {classes = [], attributes = {}, variables = {}} = {}) {
		classes = BootstrapEmail._ensureArray(classes);
		attributes = BootstrapEmail._concatAttributes(attributes);

		const content = el.html();
		const template = cheerio(ejs.render(__templates[tplName], {variables, content}));

		template.attr(attributes);
		template.addClass(classes.join(' '));

		el.html(template);
	}

	/**
	 * Wraps selected elements with given template
	 * @param {cheerio} $
	 * @param {string} selector
	 * @param {string} tplName
	 * @param {object} [assets]
	 * @param {object} [assets.attributes] - Attributes which should be inherited to template
	 * @private
	 */
	static _wrapElements($, selector, tplName, {classes = [], attributes, variables} = {}) {
		classes = BootstrapEmail._ensureArray(classes);

		$(selector).each((i, _el) => {
			const el = $(_el);

			if (selector.charAt(0) === '.') {
				const classname = selector.substr(1);

				el.removeClass(classname);
				classes.push(classname);
			}

			BootstrapEmail._wrapElement(el, tplName, {classes, attributes, variables});
		});
	}

	/**
	 * Wraps given element with given template
	 * @param {cheerio} el - Element to be replaced
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static _wrapElement(el, tplName, {classes = [], attributes = {}, variables = {}} = {}) {
		classes = BootstrapEmail._ensureArray(classes);
		attributes = BootstrapEmail._concatAttributes(attributes);

		if (attributes.class) {
			classes.push(...attributes.class.split(' '));
			delete attributes.class;
		}

		const content = cheerio.html(el);
		const template = cheerio(ejs.render(__templates[tplName], {content, variables}));

		template.attr(attributes);
		template.addClass(classes.join(' '));

		el.replaceWith(template);

		return el;
	}

	// TODO: write jsdoc
	static _divHelper($) {
		const elements = $('div');

		elements.each((i, _el) => {
			const el = $(_el);

			const td = $('<td>');
			const tr = $('<tr>').append(td);
			const tbody = $('<tbody>').append(tr);
			const table = $('<table>').append(tbody);

			table.attr(el.attr());
			table.addClass('w-100');
			td.html(el.html());

			el.replaceWith(table);
		});
	}

	/**
	 * Replaces all margin classes to equivalent spacer elements
	 * @param {cheerio} $
	 * @private
	 */
	static _marginHelper($) {
		const elements = $('*[class*=my-], *[class*=mx-], *[class*=mt-], *[class*=mb-], *[class*=ml-], *[class*=mr-]').not('.mx-auto');
		const regex = /m[btylrx]{1}-(lg-)?(\d)/i;

		elements.each((i, _el) => {
			const el = $(_el);
			const cssDisplay = el.css('display');

			if ((cssDisplay === undefined && !helper.blockElements.includes(_el.name)) || cssDisplay === 'inline') {
				console.warn('Inline-Elements does not support margins. Got ' + _el.name);
				return;
			}

			const marginClasses = el.attr('class').split(' ').filter(classname => classname.match(regex));

			el.removeClass(marginClasses.join(' '));

			const appendClasses = marginClasses.map(classname => 's' + classname.substr(1));

			appendClasses.push('w-100');

			BootstrapEmail._wrapElement(el, 'spacing', {
				classes: appendClasses,
				attributes: {'data-src': 'margin'}
			});
		});
	}

	/**
	 * Handles all padding classes. If padding-element is not a table, wrap a table around
	 * @param {cheerio} $
	 * @private
	 */
	static _paddingHelper($) {
		const elements = $('*[class*=p-], *[class*=pt-], *[class*=pr-], *[class*=pb-], *[class*=pl-], *[class*=px-], *[class*=py-]');
		const regex = /p[btylrx]{1}-(lg-)?(\d)/i;

		elements.each((i, _el) => {
			const el = $(_el);
			const cssDisplay = el.css('display');
			const paddingClasses = el.attr('class').split(' ').filter(classname => classname.match(regex));

			el.removeClass(paddingClasses.join(' '));

			const appendClasses = paddingClasses.map(classname => 's' + classname.substr(1));

			if ((helper.blockElements.includes(_el.name) && cssDisplay === undefined) || cssDisplay === 'block') {
				appendClasses.push('w-100');
			}

			BootstrapEmail._wrapContent(el, 'spacing', {
				classes: appendClasses,
				attributes: {'data-src': 'padding'}
			});
		});
	}

	/**
	 * Handles floats and centered elements
	 * @param {cheerio} $
	 * @param {string} selector
	 * @param {('left' | 'center' | 'right')} direction
	 * @private
	 */
	static _alignmentHelper($, selector, direction) {
		$(selector).each((i, _el) => {
			const el = $(_el);

			if (direction === 'center') {
				BootstrapEmail._wrapElement(el, 'center');
			} else {
				if (_el.name === 'table') {
					el.attr('align', direction);
				} else {
					BootstrapEmail._wrapElement(el, 'table', {
						attributes: {
							align: direction
						}
					});
				}
			}
		});
	}

	/**
	 * Adds border, cellspacing and cellpadding attributes to all table elements
	 * @param {cheerio} $
	 * @private
	 */
	static _tableHelper($) {
		const tables = $('table');

		tables.each((i, _el) => {
			$(_el).attr({
				border: 0,
				cellpadding: 0,
				cellspacing: 0
			});
		});
	}

	/**
	 * Replaces preview tag with hidden div and extend content to 100 characters
	 * @param {cheerio} $
	 * @private
	 */
	static _preview($) {
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
	 * @param {cheerio} $ - Element in which the rows and cols should be replaced
	 * @param {number} columns - Amount of allowed columns in a row
	 * @private
	 */
	static _gridHelper($, columns) {
		$('.row').each((rowIndex, _row) => {
			const row = $(_row);

			const desktopGrid = BootstrapEmail._generateGrid($, row.clone(), columns, true);
			const mobileGrid = BootstrapEmail._generateGrid($, row, columns, false);

			row.empty().append(desktopGrid).append(mobileGrid);

			mobileGrid.before('<!--[if !mso]><!-->').after('<!--<![endif]-->');
		});
	}

	static _generateGrid($, rowSrc, columns, isLG) {
		const regex = /col-(lg-)?(\d){1,2}/i;

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

			// TODO: add support for different col amounts
			for (let rowCols = 0; colIndex < cols.length; colIndex++) {
				const col = $(cols[colIndex]);

				let colSize = 0;

				(col.attr('class') || '').split(' ').forEach(classname => {
					const match = classname.match(regex);

					if (match) {
						const size = parseInt(match.pop());
						const isColLG = !!match.pop();

						if (isNaN(size)) {
							// TODO: Implement better error message
							console.warn('Malformed column name. Ignored');
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
						BootstrapEmail._removeClass(col, classname);
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

		BootstrapEmail._removeClass(rowSrc, 'row');

		return grid;
	}


	//*****************************************
	// GENERAL STATIC METHODS
	//*****************************************

	/**
	 * Loads file from given sourcepath. If file is scss or sass, it will be compiled into css
	 * @static
	 * @param stylePath
	 * @return {{css: string, vars: Object}|{css: string}}
	 * @private
	 */
	static _loadStyle(stylePath) {
		if (['.scss', '.sass'].includes(path.extname(stylePath))) {
			const rendered = sass.renderSync({
				file: stylePath,
				outputStyle: 'compressed'
			});

			return {
				css: rendered.css.toString(),
				vars: rendered.vars.global
			}
		} else {
			return {
				css: fs.readFileSync(stylePath, 'utf8')
			}
		}
	}

	/**
	 * Loads style and extracts all media queries
	 * @static
	 * @param stylePath
	 * @return {{css: string, vars: Object, queries: string}}|{css: string}}
	 * @private
	 */
	static _processStyle(stylePath) {
		const style = BootstrapEmail._loadStyle(stylePath);

		const tmpDir = tmp.dirSync();

		const postcssPlugins = [
			extractMQ({
				output: {
					path: tmpDir.name
				},
				stats: false
			})
		];

		const mainCss = postcss(postcssPlugins).process(style.css).css;
		const queryCss = fs.readdirSync(tmpDir.name).reduce((output, file) => {
			return output + fs.readFileSync(path.join(tmpDir.name, file), 'utf8');
		}, '');

		tmpDir.removeCallback();

		return {
			vars: style.vars,
			css: mainCss,
			queries: queryCss
		};
	}

	/**
	 * @param {...object | cheerio} attributes - Attribute sources which should be concatenated
	 * @return {object} The concatenated attributes
	 * @private
	 */
	static _concatAttributes(...attributes) {
		let output = {};

		attributes.forEach(el => {
			let attr = el;

			if (el.cheerio) {
				attr = {...el.attr()};
			}

			for (let i in attr) {
				if (attr.hasOwnProperty(i)) {
					output[i] = attr[i];
				}
			}
		});

		return output;
	}

	static _ensureArray(arr) {
		if (['string', 'number'].includes(typeof arr)) {
			arr = arr.toString().split(' ');
		}
		if (!Array.isArray(arr)) {
			arr = [];
		}

		return arr;
	}

	static _removeClass(el, classname) {
		el
			.attr('data-class-removed', (el.attr('data-class-removed') + ' ' + classname).trim())
			.removeClass(classname);
	}
}

module.exports = BootstrapEmail;
