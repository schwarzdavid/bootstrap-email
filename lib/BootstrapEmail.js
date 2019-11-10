const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sass = require('node-sass');
const ejs = require('ejs');
const juice = require('juice');
const templateLoader = require('./template-loader');
const helper = require('./helper');

const __templates = templateLoader();

const __defaults = {
	style: path.join(__dirname, '../assets/bootstrap-email.scss'),
	head: path.join(__dirname, '../assets/head.scss'),
	containerWidthFallback: true
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
					style = __defaults.style,
					head = __defaults.head,
					containerWidthFallback = __defaults.containerWidthFallback,
					template,
					templates = [],
					content
				}) {

		this._stylePath = style;
		this._headPath = head;
		this._containerWidthFallback = containerWidthFallback;
		this._templates = [];

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
			//BootstrapEmail._wrapContent($, 'body', 'body', {classes: 'body'}, true);

			// HANDLE OUTER SPACING
			//*****************************************
			BootstrapEmail._marginHelper($);
			// BootstrapEmail._replaceElements($, '*[class*=s-]', 'table', {classes: 'w-100'});

			// HANDLE CONTAINERS AND GRIDS
			//*****************************************
			BootstrapEmail._replaceElements($, '.container', 'container-inner');
			BootstrapEmail._wrapElement($, '.container', 'container', {variables: {containerWidthFallback: this._containerWidthFallback}});

			BootstrapEmail._replaceElements($, '.container-fluid', 'container-inner');
			BootstrapEmail._wrapElement($, '.container-fluid', 'container', {variables: {fluid: true}});

			BootstrapEmail._gridHelper($);









			// Wrap design classes
			//*****************************************
			// BootstrapEmail._replaceElements($, 'hr', 'hr');
			// BootstrapEmail._wrapElement($, '.card', 'table');
			// BootstrapEmail._wrapElement($, '.card-body', 'table');
			// BootstrapEmail._wrapElement($, '.btn', 'table');
			// BootstrapEmail._wrapElement($, '.badge', 'table-left', {attributes: {align: 'left'}});
			// BootstrapEmail._wrapElement($, '.alert', 'table');

			// Wrap paddings if needed
			// BootstrapEmail._paddingHelper($);

			// Wrap alignment classes
			// BootstrapEmail._wrapElement($, '.float-left', 'align-left');
			// BootstrapEmail._wrapElement($, '.mx-auto', 'align-center');
			// BootstrapEmail._wrapElement($, '.float-right', 'align-right');

			// Add relevant attributes to tables
			// BootstrapEmail._tableHelper($);
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
		const elements = $(selector);

		elements.each((i, _el) => {
			BootstrapEmail._replaceElement($(_el), tplName, {classes, attributes, variables});
		});
	}

	/**
	 * Replaces one element with given template
	 * @param {cheerio} $ - Element to be replaced
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to template
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static _replaceElement($, tplName, {classes = [], attributes = {}, variables = {}} = {}){
		classes = BootstrapEmail._ensureArray(classes);
		attributes = BootstrapEmail._concatAttributes($, attributes);

		if (attributes.class) {
			classes.push(...attributes.class.split(' '));
			delete attributes.class;
		}

		const content = $.html();
		const template = cheerio(ejs.render(__templates[tplName], {variables, content}));

		template.attr(attributes);
		template.addClass(classes.join(' '));

		$.replaceWith(template);
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
	static _wrapContent($, selector, tplName, {classes, attributes = {}, variables = {}} = {}) {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);

			classes = BootstrapEmail._ensureArray(classes);
			attributes = BootstrapEmail._concatAttributes(attributes);

			if (attributes.class) {
				classes.push(...attributes.class.split(' '));
				delete attributes.class;
			}

			const content = el.html();
			const template = cheerio(ejs.render(__templates[tplName], {variables, content}));

			template.attr(attributes);
			template.addClass(classes.join(' '));

			el.html(template);
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
	static _wrapElement($, selector, tplName, {classes, attributes = {}, variables = {}} = {}) {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);

			classes = BootstrapEmail._ensureArray(classes);
			attributes = BootstrapEmail._concatAttributes(attributes);

			if (attributes.class) {
				classes.push(...attributes.class.split(' '));
				delete attributes.class;
			}

			// TODO: check this
			// CHECK ALIGN AND PADDING SPECIAL CASE
			//*****************************************
			//if (tplName.indexOf('align-') >= 0 && el[0].name === 'table') {
			//	const direction = tplName.split('-')[1];
			//	el.attr('align', direction);
			//} else {
			//const attributes = BootstrapEmail._concatAttributes(el, _attributes) || '';
			//el.attr('class', null);

			if (selector.charAt(0) === '.') {
				const classname = selector.substr(1);

				el.removeClass(classname);
				classes.push(classname);
			}

			const content = $.html(el);
			const template = cheerio(ejs.render(__templates[tplName], {content, variables}));

			template.attr(attributes);
			template.addClass(classes.join(' '));

			el.replaceWith(template);
			//}
		});
	}

	/**
	 * Replaces rows and columns to tables and set according separators
	 * @param {cheerio} $ - Element in which the rows and cols should be replaced
	 * @private
	 */
	static _gridHelper($){
		const rows = $('.row, .row-fluid');

		rows.each((rowIndex, _row) => {
			const row = $(_row);
			const cols = row.children('*[class*="col"]');

			// VALIDATE COL SIZES
			//*****************************************
			// TODO: create validator function
			// TODO: check if there are dynamic cols after all 12 cols are used
			let lgColCount = 0;
			let smColCount = 0;

			cols.each((colIndex, _col) => {
				const col = $(_col);
				const classes = (col.attr('class') || '').split(' ');

				if(classes.length === 0){
					return;
				}

				let lgSize = 0;
				let smSize = 0;
				classes.forEach(classname => {
					if(classname.startsWith('col-lg-')) {
						const size = parseInt(classname.replace('col-lg-', ''));
						if(isNaN(size)){
							console.warn(`Propably malformed column classname. Got ${classname}. Large col classes should be in this format: col-{lg-}-{1-12}`);
						} else {
							if(lgSize > 0){
								console.warn('Multiple col-lg-{1-12} classes on a single column.');
							}
							lgSize = size;
						}
					} else if (classname.startsWith('col-')){
						const size = parseInt(classname.replace('col-', ''));
						if(isNaN(size)){
							console.warn(`Propably malformed column classname. Got ${classname}. Col classes should be in this format: col-{1-12}`);
						} else {
							if(smSize > 0){
								console.warn('Multiple col-{1-12} classes on a single column.');
							}
							smSize = size;
						}
					}
				});

				smColCount += smSize;
				lgColCount += lgSize > 0 ? lgSize : smSize;
			});

			if(lgColCount > 12){
				console.warn(`Warning: The sum of lg-column sizes in a row is ${lgColCount} (max should be 12). Unexpected layour behavour can occur`);
			}
			if(smColCount > 12){
				console.warn(`Warning: The sum of column sizes in a row is ${lgColCount} (max should be 12). Unexpected layour behavour can occur`);
			}

			// REPLACE COLUMNS
			//*****************************************
			// TODO: add column offsets
			cols.each((colIndex, _col) => {
				const col = $(_col);

				if(colIndex > 0 && !row.hasClass('no-gutters')){
					col.before('<td class="col-separator">&nbsp;</td>');
				}

				BootstrapEmail._replaceElement(col, 'col');
			});

			// REPLACE ACTUAL ROW
			//*****************************************
			BootstrapEmail._replaceElement(row, 'row');
		});
	}





	static _marginHelper($){
		const elements = $('*[class*=my-], *[class*=mx-], *[class*=mt-], *[class*=mb-], *[class*=ml-], *[class*=mr-]');
		const regex = /m[btylrx]{1}-(lg-)?(\d)/;

		elements.each((i, _el) => {
			const el = $(_el);
			const classes = el.attr('class').split(' ').filter(classname => classname.match(regex));

			el.removeClass(classes.join(' '));

			const content = $.html(el);
			const template = cheerio(ejs.render(__templates['margin'], {content}));

			template.addClass(classes.join(' '));

			el.replaceWith(template);
		});
	}












	/**
	 * Replaces all margin classes to equivalent spacer elements
	 * @param {cheerio} $
	 * @private
	 */
	/*static _marginHelper($) {
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
	}*/










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
			if (helper.unsupportedPaddingElements.indexOf(_el.name) < 0) {
				return;
			}

			const el = $(_el);
			const cssDisplay = el.css('display');

			// Check if current element is block-element
			if (helper.blockElements.indexOf(_el.name) >= 0 && (cssDisplay === undefined || cssDisplay === 'block')) {
				el.addClass('w-100');
			}

			const attributes = BootstrapEmail._concatAttributes(_el) || '';
			el.attr('class', null);

			const content = $.html(el);
			const template = ejs.render(__templates['table'], {content, attributes});

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
			preview.html(content + '&nbsp;'.repeat(Math.max(100 - content.length, 0)));
			preview.addClass('preview');
			preview[0].tagName = 'div';
		}
	}


	//*****************************************
	// GENERAL STATIC METHODS
	//*****************************************

	/**
	 * Loads file from given sourcepath. If file is scss or sass, it will be compiled into css
	 * @static
	 * @param {string} stylePath
	 * @return {string} css content
	 * @private
	 */
	static _loadStyle(stylePath) {
		if (['.scss', '.sass'].includes(path.extname(stylePath))) {
			return sass.renderSync({file: stylePath, outputStyle: 'compressed'}).css.toString();
		}
		return fs.readFileSync(stylePath, 'utf8');
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
				attr = el.attr();
			}

			for (let i in attr) {
				output[i] = attr[i];
			}
		});

		return output;
	}

	/**
	 * @param {...object | cheerio} attributes
	 * @returns {string} HTML Syntax for given attribute objects. For example 'class="..." style="..."'
	 * @private
	 */
	static _formatAttributes(...attributes) {
		const concatenatedAttributes = BootstrapEmail._concatAttributes(...attributes);

		return Object.keys(concatenatedAttributes).reduce((output, key) => {
			return output + `${key}="${concatenatedAttributes[key]}" `;
		}, '');
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
}

module.exports = BootstrapEmail;
