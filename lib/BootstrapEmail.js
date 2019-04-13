const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sass = require('node-sass');
const parseCss = require('css-rules');
const ejs = require('ejs');

const __templates = {
	body: fs.readFileSync(path.join(__dirname, '../core/templates/body.ejs'), 'utf8'),
	table: fs.readFileSync(path.join(__dirname, '../core/templates/table.ejs'), 'utf8'),
	col: fs.readFileSync(path.join(__dirname, '../core/templates/col.ejs'), 'utf8'),
	row: fs.readFileSync(path.join(__dirname, '../core/templates/row.ejs'), 'utf8'),
	hr: fs.readFileSync(path.join(__dirname, '../core/templates/hr.ejs'), 'utf8'),
	div: fs.readFileSync(path.join(__dirname, '../core/templates/div.ejs'), 'utf8'),
	container: fs.readFileSync(path.join(__dirname, '../core/templates/container.ejs'), 'utf8'),
	'table-left': fs.readFileSync(path.join(__dirname, '../core/templates/table-left.ejs'), 'utf8')
};

class BootstrapEmail {

	//*****************************************
	// STATIC PROPERTIES
	//*****************************************
	static get DEFAULTS() {
		return {
			style: path.join(__dirname, '../core/bootstrap-email.scss'),
			head: path.join(__dirname, '../core/head.scss')
		}
	}

	//*****************************************
	// CONSTRUCTOR
	//*****************************************
	constructor({style = BootstrapEmail.DEFAULTS.style, head = BootstrapEmail.DEFAULTS.head, template}) {
		this._stylePath = style;
		this._headPath = head;

		if (typeof template === 'string') {
			template = [template];
		}

		this._templatePaths = template;
	}

	//*****************************************
	// PUBLIC METHODS
	//*****************************************
	async compile() {
		const head = await this._loadStyle(this._headPath);
		const style = parseCss(await this._loadStyle(this._stylePath));

		this._outData = [];

		for (let template of this._templatePaths) {
			this._outData.push(await this._handleTemplate(template, head, style));
		}
	}

	//*****************************************
	// PRIVATE METHODS
	//*****************************************
	async _loadStyle(stylePath) {
		if (['.scss', '.sass'].indexOf(path.extname(stylePath)) >= 0) {
			return sass.renderSync({file: stylePath}).css.toString();
		}
		return fs.readFileSync(stylePath, 'utf8');
	}

	async _handleTemplate(templatePath, head, style) {
		const data = fs.readFileSync(templatePath, 'utf8');
		const $ = cheerio.load(data);

		// INJECT HEADER STYLES
		//*****************************************
		//const headStyle = $('<style>').attr('type', 'text/css').text(head);
		//$('head').append(headStyle);

		// REPLACE TEMPLATES
		//*****************************************
		this._compileHtml($);
		this._inlineCss();

		console.log($.html());
	}

	_compileHtml($) {
		BootstrapEmail._replace($, '.btn', 'table');
		BootstrapEmail._replace($, '.badge', 'table-left');
		BootstrapEmail._replace($, '.alert', 'table');
		BootstrapEmail._replace($, '.card', 'table');
		BootstrapEmail._replace($, '.card-body', 'table');
		BootstrapEmail._replace($, 'hr', 'hr', 'hr');
		BootstrapEmail._replace($, '.container', 'container');
		BootstrapEmail._replace($, '.container-fluid', 'table');
		BootstrapEmail._replace($, '.row', 'row');
		BootstrapEmail._replace($, '*[class*="col"]', 'col');
		// TODO: align && align helper
		// TODO: padding
		// TODO: margin
		// TODO: spacer
		// TODO: table
		BootstrapEmail._replace($, 'body', 'body', 'body');
	}

	_inlineCss() {

	}

	//*****************************************
	// STATIC METHODS
	//*****************************************
	static _replace($, selector, tplName, additionalClasses = '', inner = false) {
		const elements = $(selector);

		elements.each((i, _el) => {
			const el = $(_el);

			let classes = $(el).attr('class') || '';
			let content;

			if (additionalClasses) {
				if (classes) {
					classes += ' ';
				}
				classes += additionalClasses;
			}

			if (inner) {
				content = el.html();
			} else {
				el.removeAttr('class');
				content = $.html(el);
				console.log(content + '\r\n\r\n\r\n\r\n');
			}

			const template = ejs.render(__templates[tplName], {content, classes});

			el.replaceWith(template);
		});
	}
}

module.exports = BootstrapEmail;
