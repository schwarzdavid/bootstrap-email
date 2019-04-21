const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sass = require('node-sass');
const ejs = require('ejs');
const juice = require('juice');

// TODO: Load automatically all templates
const __templates = {
	body: fs.readFileSync(path.join(__dirname, '../assets/templates/body.ejs'), 'utf8'),
	table: fs.readFileSync(path.join(__dirname, '../assets/templates/table.ejs'), 'utf8'),
	col: fs.readFileSync(path.join(__dirname, '../assets/templates/col.ejs'), 'utf8'),
	row: fs.readFileSync(path.join(__dirname, '../assets/templates/row.ejs'), 'utf8'),
	hr: fs.readFileSync(path.join(__dirname, '../assets/templates/hr.ejs'), 'utf8'),
	div: fs.readFileSync(path.join(__dirname, '../assets/templates/div.ejs'), 'utf8'),
	container: fs.readFileSync(path.join(__dirname, '../assets/templates/container.ejs'), 'utf8'),
	'table-left': fs.readFileSync(path.join(__dirname, '../assets/templates/table-left.ejs'), 'utf8'),
	'align-left': fs.readFileSync(path.join(__dirname, '../assets/templates/align-left.ejs'), 'utf8'),
	'align-center': fs.readFileSync(path.join(__dirname, '../assets/templates/align-center.ejs'), 'utf8'),
	'align-right': fs.readFileSync(path.join(__dirname, '../assets/templates/align-right.ejs'), 'utf8')
};

const __doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">';

const __defaults = {
	style: path.join(__dirname, '../assets/bootstrap-email.scss'),
	head: path.join(__dirname, '../assets/head.scss')
};

const __blockElements = [
	'p',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'ol',
	'ul',
	'pre',
	'address',
	'blockquote',
	'dl',
	'div',
	'fieldset',
	'form',
	'hr',
	'noscript',
	'table'
];

const __unsupportedPaddingElements = [
	'p',
	'div'
];

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
	 * @param {string} [options.template] Path to .html file, that should be compiled
	 * @param {string[]} [options.templates] Array with paths to .html files that should be compiled
	 * @param {string} [options.content] HTML template as string. By using this, 'template(s)' option will be overwritten
	 */
	constructor({style = __defaults.style, head = __defaults.head, template, templates = [], content = ''}) {
		this._stylePath = style;
		this._headPath = head;

		if (content && typeof content === 'string') {
			this._templates = [{
				$: cheerio.load(content)
			}];
		} else {
			if (!Array.isArray(templates)) {
				if (typeof templates === 'string') {
					console.warn('Use "template" to compile a single template');
					templates = [templates];
				} else {
					throw new Error('Templates property must be an array. Got: ' + templates);
				}
			}

			if (typeof template === 'string') {
				templates.push(template);
			}

			this._templates = [];
			for (let path of templates) {
				this._templates.push(BootstrapEmail._prepareTemplate(path));
			}
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
				fs.writeFileSync(path.join(filePath, path.basename(output.path)), output.document);
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
			BootstrapEmail._compileHtml(template.$);
		}
	}

	/**
	 * Inlines all css classes into style attributes
	 * @private
	 */
	_inlineCss() {
		const style = BootstrapEmail._loadStyle(this._stylePath);

		for (let template of this._templates) {
			juice.inlineDocument(template.$, style, {
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
		const head = BootstrapEmail._loadStyle(this._headPath);

		for (let template of this._templates) {
			const headStyle = template.$('<style>').attr('type', 'text/css').text(head);

			const charset = template.$('<meta>').attr({
				'http-equiv': 'Content-Type',
				'content': 'text/html; charset=utf-8'
			});

			template.$('head').append(charset).append(headStyle);
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
				path: template.path,
				document: __doctype + template.$.html()
			});
		}

		if (out.length === 1) {
			return out[0].document;
		}
		return out;
	}

	//*****************************************
	// STATIC METHODS
	//*****************************************
	/**
	 * Reads file from given sourcepath and loads it with cheerio
	 * @static
	 * @param {string} tplPath
	 * @return {{$: cheerio, path: string}}
	 * @private
	 */
	static _prepareTemplate(tplPath) {
		const data = fs.readFileSync(tplPath, 'utf8');
		return {
			$: cheerio.load(data),
			path: tplPath
		};
	}

	/**
	 * Loads file from given sourcepath. If file is scss or sass, it will be compiled into css
	 * @static
	 * @param {string} stylePath
	 * @return {string} css content
	 * @private
	 */
	static _loadStyle(stylePath) {
		if (['.scss', '.sass'].indexOf(path.extname(stylePath)) >= 0) {
			return sass.renderSync({file: stylePath, outputStyle: 'compressed'}).css.toString();
		}
		return fs.readFileSync(stylePath, 'utf8');
	}

	/**
	 * Compiles given template into shitty email style
	 * @param {cheerio} $ - Template to compile
	 * @private
	 */
	static _compileHtml($) {
		// Hide preview text
		BootstrapEmail._preview($);

		// Wrap body
		BootstrapEmail._replace($, 'body', 'body', {classes: 'body'}, true);

		// Handle outer spacing
		BootstrapEmail._marginHelper($);
		BootstrapEmail._replace($, '*[class*=s-]', 'table', {classes: 'w-100'});

		// Wrap layout classes
		BootstrapEmail._replace($, '.container', 'container');
		BootstrapEmail._replace($, '.container-fluid', 'container');

		// Replace horizontal lines and grid
		BootstrapEmail._replace($, 'hr', 'hr', {classes: 'hr'});
		BootstrapEmail._replace($, '*[class*="col"]', 'col', {attributes: {valign: 'top'}});
		BootstrapEmail._gridHelper($);

		// Wrap design classes
		BootstrapEmail._wrap($, '.card', 'table');
		BootstrapEmail._wrap($, '.card-body', 'table');
		BootstrapEmail._wrap($, '.btn', 'table');
		BootstrapEmail._wrap($, '.badge', 'table-left', {attributes: {align: 'left'}});
		BootstrapEmail._wrap($, '.alert', 'table');

		// Wrap paddings if needed
		BootstrapEmail._paddingHelper($);

		// Wrap alignment classes
		BootstrapEmail._wrap($, '.float-left', 'align-left');
		BootstrapEmail._wrap($, '.mx-auto', 'align-center');
		BootstrapEmail._wrap($, '.float-right', 'align-right');

		// Add relevant attributes to tables
		BootstrapEmail._tableHelper($);

	}

	/**
	 * Replaces selected elements with given template
	 * @param {cheerio} $ - Template
	 * @param {string} selector - Items to compile
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add default attributes which will be inherited to template
	 * @param {boolean} [inner=false] - Inject template into selector or replace it?
	 * @private
	 */
	static _replace($, selector, tplName, {classes: _classes = '', attributes: _attributes = {}} = {}, inner = false) {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);


			if (_classes) {
				el.addClass(_classes);
			}


			const classes = $(el).attr('class') || '';
			const attributes = BootstrapEmail._sanitizeAttributes(_el, _attributes) || '';

			// Remove all classes. They will be attached to the wrapper element
			el.attr('class', null);

			const content = el.html();
			const template = ejs.render(__templates[tplName], {content, classes, attributes});

			if (inner) {
				el.html(template);
			} else {
				el.replaceWith(template);
			}
		});
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
	static _wrap($, selector, tplName, {attributes: _attributes = {}} = {}) {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);

			// CHECK ALIGN AND PADDING SPECIAL CASE
			//*****************************************
			if (tplName.indexOf('align-') >= 0 && el[0].name === 'table') {
				const direction = tplName.split('-')[1];
				el.attr('align', direction);
			} else {
				const attributes = BootstrapEmail._sanitizeAttributes(_el, _attributes) || '';
				el.attr('class', null);

				const content = $.html(el);
				const template = ejs.render(__templates[tplName], {content, attributes});

				el.replaceWith(template);
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
			const el = $(_el);

			el.attr('border', 0);
			el.attr('cellpadding', 0);
			el.attr('cellspacing', 0);
		});
	}

	/**
	 * Handles all padding classes. If padding-element is not a table, wrap a table around
	 * @param {cheerio} $
	 * @private
	 */
	static _paddingHelper($) {
		const elements = $('*[class*=p-], *[class*=pt-], *[class*=pr-], *[class*=pb-], *[class*=pl-], *[class*=px-], *[class*=py-]');

		elements.each((i, _el) => {
			if (__unsupportedPaddingElements.indexOf(_el.name) < 0) {
				return;
			}

			const el = $(_el);
			const cssDisplay = el.css('display');

			// Check if current element is block-element
			if (__blockElements.indexOf(_el.name) >= 0 && (cssDisplay === undefined || cssDisplay === 'block')) {
				el.addClass('w-100');
			}

			const attributes = BootstrapEmail._sanitizeAttributes(_el) || '';
			el.attr('class', null);

			const content = $.html(el);
			const template = ejs.render(__templates['table'], {content, attributes});

			el.replaceWith(template);
		});
	}

	/**
	 * Replaces all margin classes to equivalent spacer elements
	 * @param {cheerio} $
	 * @private
	 */
	static _marginHelper($) {
		const elements = $('*[class*=my-], *[class*=mt-], *[class*=mb-]');
		const regex = /m[bty]{1}-(lg-)?(\d)/;

		elements.each((i, _el) => {
			const el = $(_el);
			const classes = el.attr('class').split(' ');

			for (let cls of classes) {
				if (!cls.match(regex)) {
					continue;
				}

				const pos = cls.charAt(1);

				if (pos === 't' || pos === 'y') {
					const template = ejs.render(__templates['div'], {
						content: '&nbsp;',
						classes: 's-' + cls.replace(/m[ty]{1}-/, '')
					});
					el.before(template);
				}

				if (pos === 'b' || pos === 'y') {
					const template = ejs.render(__templates['div'], {
						content: '&nbsp;',
						classes: 's-' + cls.replace(/m[by]{1}-/, '')
					});
					el.after(template);
				}
			}
		});
	}

	/**
	 * Replaces all rows with row-template. If row is inside a container, move row outside of container-inner and move all following siblings into new container-inner element
	 * @param {cheerio} $
	 * @private
	 */
	static _gridHelper($) {
		const rows = $('.row, .row-fluid, .row-fluid-lg, .row-inset');

		rows.each((i, _el) => {
			const el = $(_el);
			const container = el.closest('.container-inner').first();
			let wrapper = false;

			if (container.length > 0 && !el.hasClass('row-inset')) {

				// Due bug in cheerio, do not use el.nextAll() and el.prevAl(). See https://github.com/cheeriojs/cheerio/issues/1301
				const prevSiblings = [];
				const nextSiblings = [];
				const elIndex = el.index();

				el.siblings().each((siblingIndex, sibling) => {
					if (elIndex > $(sibling).index()) {
						prevSiblings.push(sibling);
					} else {
						nextSiblings.push(sibling);
					}
				});

				// Append new inner container only, of row has next siblings
				if (nextSiblings.length > 0) {
					const afterContainer = container.clone();
					const afterContainerContent = afterContainer.children('tbody').children('tr').children('td').empty();

					for (let sibling of nextSiblings) {
						afterContainerContent.append(sibling);
					}
					container.after(afterContainer);
				}

				// Insert row after container
				container.after(el);

				// If row has now previous siblings, the previous container is not needed anymore
				if (prevSiblings.length === 0) {
					container.remove();
				}

				wrapper = true;
			}

			const attributes = BootstrapEmail._sanitizeAttributes(_el) || '';
			const content = el.html();
			const template = ejs.render(__templates['row'], {content, attributes, wrapper});

			el.replaceWith(template);
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
			preview.html(content + '&nbsp;'.repeat(100 - content.length));
			preview.addClass('preview');
			preview[0].tagName = 'div';
		}
	}

	/**
	 *
	 * @param {cheerio-node} el - The element to get attributes of
	 * @param {object} defaults - Default attributes which should be applied
	 * @return {string} The resulting attributes string. For example 'class="..." style="..."'
	 * @private
	 */
	static _sanitizeAttributes(el, defaults = {}) {
		let attributes = {...defaults};

		for (let i in el.attribs) {
			attributes[i] = el.attribs[i];
		}

		return Object.keys(attributes).reduce((output, key) => {
			return output + `${key}="${attributes[key]}" `;
		}, '');
	}
}

module.exports = BootstrapEmail;
