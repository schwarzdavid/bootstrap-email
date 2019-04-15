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

const __doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

const __defaults = {
	style: path.join(__dirname, '../assets/bootstrap-email.scss'),
	head: path.join(__dirname, '../assets/head.scss')
};

class BootstrapEmail {

	//*****************************************
	// CONSTRUCTOR
	//*****************************************
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
	compile() {
		this.compileHtml();
		this.inlineCss();
		this.injectHead();

		return this.output();
	}

	// TODO: save mutliple files
	compileAndSave(path) {
		const outputs = this.compile();
		fs.writeFileSync(path, outputs);
	}

	injectHead() {
		const head = BootstrapEmail._loadStyle(this._headPath);

		for (let $ of this._templates) {
			const headStyle = $('<style>').attr('type', 'text/css').text(head);

			const charset = $('<meta>').attr({
				'http-equiv': 'Content-Type',
				'content': 'text/html; charset=utf-8'
			});

			$('head').append(charset).append(headStyle);
		}
	}

	compileHtml() {
		for (let $ of this._templates) {
			BootstrapEmail._compileHtml($);
		}
	}

	inlineCss() {
		const style = BootstrapEmail._loadStyle(this._stylePath);

		for (let $ of this._templates) {
			juice.inlineDocument($, style, {
				applyAttributesTableElements: true,
				applyHeightAttributes: true,
				applyWidthAttributes: true
			});
		}
	}

	output() {
		const out = [];

		for (let $ of this._templates) {
			out.push(__doctype + $.html());
		}

		if (out.length === 1) {
			return out[0];
		}
		return out;
	}

	outputRaw() {
		if (this._templates.length === 1) {
			return this._templates[0];
		}
		return this._templates;
	}

	//*****************************************
	// STATIC METHODS
	//*****************************************
	static _prepareTemplate(tplPath) {
		const data = fs.readFileSync(tplPath, 'utf8');
		return cheerio.load(data);
	}

	static _loadStyle(stylePath) {
		if (['.scss', '.sass'].indexOf(path.extname(stylePath)) >= 0) {
			return sass.renderSync({file: stylePath, outputStyle: 'compressed'}).css.toString();
		}
		return fs.readFileSync(stylePath, 'utf8');
	}

	static _compileHtml($) {
		BootstrapEmail._wrap($, '.btn', 'table');
		BootstrapEmail._wrap($, '.badge', 'table-left');
		BootstrapEmail._wrap($, '.alert', 'table');
		BootstrapEmail._wrap($, '.card', 'table');
		BootstrapEmail._wrap($, '.card-body', 'table');
		BootstrapEmail._replace($, 'hr', 'hr', 'hr');
		BootstrapEmail._replace($, '.container', 'container');
		BootstrapEmail._replace($, '.container-fluid', 'table');
		BootstrapEmail._replace($, '*[class*="col"]', 'col');
		BootstrapEmail._replace($, '.row', 'row');
		BootstrapEmail._replace($, '.float-left', 'align-left');
		BootstrapEmail._replace($, '.mx-auto', 'align-center');
		BootstrapEmail._replace($, '.float-right', 'align-right');
		BootstrapEmail._replace($, '*[class*=p-], *[class*=pt-], *[class*=pr-], *[class*=pb-], *[class*=pl-], *[class*=px-], *[class*=py-]', 'div');
		BootstrapEmail._marginHelper($);
		BootstrapEmail._replace($, '*[class*=s-]', 'table', 'w-100');
		BootstrapEmail._tableAttrs($);
		BootstrapEmail._replace($, 'body', 'body', 'body', true);
		BootstrapEmail._preview($);
	}

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

			// CHECK ALIGN SPECIAL CASE
			//*****************************************
			if (tplName.indexOf('align-') >= 0 && el[0].name === 'table') {
				const direction = tplName.split('-')[1];
				el.attr('align', direction);
			} else {
				const content = el.html();
				const template = ejs.render(__templates[tplName], {content, classes});

				if (inner) {
					el.html(template);
				} else {
					el.replaceWith(template);
				}
			}
		});
	}

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

			el.attr('class', null);

			const content = $.html(el);
			const template = ejs.render(__templates[tplName], {content, classes});
			el.replaceWith(template);
		});
	}

	static _tableAttrs($) {
		const tables = $('table');

		tables.each((i, _el) => {
			const el = $(_el);

			el.attr('border', 0);
			el.attr('cellpadding', 0);
			el.attr('cellspacing', 0);
		});
	}

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
					el.before(template);
				}
			}
		});
	}

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
