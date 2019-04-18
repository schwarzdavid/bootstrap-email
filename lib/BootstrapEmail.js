const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sass = require('node-sass');
const ejs = require('ejs');
const juice = require('juice');

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

class BootstrapEmail {

	//*****************************************
	// CONSTRUCTOR
	//*****************************************
	/**
	 * Creates a new BootstrapEmail instance
	 *
	 * @constructor
	 * @param {string} [style] Path to .css or .scss file that should be inlined
	 * @param {string} [head] Path to .css or .scss file taht should be injected into header
	 * @param {string} [template] Path to .html file, that should be compiled
	 * @param {string[]} [templates] Array with paths to .html files that should be compiled
	 */
	constructor({style = __defaults.style, head = __defaults.head, template, templates = []}) {
		this._stylePath = style;
		this._headPath = head;

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
		BootstrapEmail._replace($, 'body', 'body', 'body', true);

		// TODO: check this
		//BootstrapEmail._wrap($, '*[class*=p-], *[class*=pt-], *[class*=pr-], *[class*=pb-], *[class*=pl-], *[class*=px-], *[class*=py-]', 'div');

		// Handle outer spacing
		BootstrapEmail._marginHelper($);
		BootstrapEmail._replace($, '*[class*=s-]', 'table', 'w-100');

		// Wrap layout classes
		BootstrapEmail._replace($, '.container', 'container');
		BootstrapEmail._replace($, '.container-fluid', 'table');

		// Replace horizontal lines and grid
		BootstrapEmail._replace($, 'hr', 'hr', 'hr');
		BootstrapEmail._replace($, '*[class*="col"]', 'col');
		BootstrapEmail._gridHelper($);

		// Wrap alignment classes
		BootstrapEmail._wrap($, '.float-left', 'align-left');
		BootstrapEmail._wrap($, '.mx-auto', 'align-center');
		BootstrapEmail._wrap($, '.float-right', 'align-right');

		// Wrap design classes
		BootstrapEmail._wrap($, '.card', 'table');
		BootstrapEmail._wrap($, '.card-body', 'table');
		BootstrapEmail._wrap($, '.btn', 'table');
		BootstrapEmail._wrap($, '.badge', 'table-left');
		BootstrapEmail._wrap($, '.alert', 'table');

		// Add relevant attributes to tables
		BootstrapEmail._tableHelper($);

	}

	/**
	 * Replaces selected elements with given template
	 * @param {cheerio} $ - Template
	 * @param {string} selector - Items to compile
	 * @param {string} tplName - Name of the template to use
	 * @param {string} [additionalClasses] - Add additional classes to template
	 * @param {boolean} [inner=false] - Inject template into selector or replace it?
	 * @private
	 */
	static _replace($, selector, tplName, additionalClasses = '', inner = false) {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);

			let classes = $(el).attr('class') || '';

			if (additionalClasses) {
				if (classes) {
					classes += ' ';
				}
				classes += additionalClasses;
			}

			// Remove all classes. They will be attached to the wrapper element
			el.attr('class', null);

			const content = el.html();
			const template = ejs.render(__templates[tplName], {content, classes});

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
	 * @param {string} [additionalClasses]
	 * @private
	 */
	static _wrap($, selector, tplName, additionalClasses = '') {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);

			let classes = $(el).attr('class') || '';

			if (additionalClasses) {
				if (classes) {
					classes += ' ';
				}
				classes += additionalClasses;
			}

			// Remove all classes. They will be attached to the wrapper element
			el.attr('class', null);

			// CHECK ALIGN SPECIAL CASE
			//*****************************************
			if (tplName.indexOf('align-') >= 0 && el[0].name === 'table') {
				const direction = tplName.split('-')[1];
				el.attr('align', direction);
			} else {
				const content = $.html(el);
				const template = ejs.render(__templates[tplName], {content, classes});
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

	// TODO: check empty content
	static _gridHelper($) {
		const rows = $('.row');

		rows.each((i, _el) => {
			const el = $(_el);
			const container = el.closest('.container-inner').first();
			const classes = $(el).attr('class') || '';
			let wrapper = false;

			if (container.length > 0) {
				const afterContainer = container.clone();
				const afterContainerContent = afterContainer.children('tbody').children('tr').children('td');
				afterContainerContent.empty().append(el.nextAll());
				const hasPrevSiblings = el.prevAll().length > 0;

				if(afterContainerContent.children().length > 0) {
					container.after(afterContainer);
				}

				container.after(el);

				if(!hasPrevSiblings){
					container.remove();
				}

				wrapper = true;
			}

			const content = el.html();
			const template = ejs.render(__templates['row'], {content, classes, wrapper});

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
}

module.exports = BootstrapEmail;
