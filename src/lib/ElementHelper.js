const cheerio = require('cheerio').default;
const ejs = require('ejs');
const TemplateLoader = require('./TemplateLoader');

const DEBUG_ATTRIBUTES = {
	CLASS_ADDED: 'data-bte-added-class',
	CLASS_REMOVED: 'data-bte-removed-class'
};

/**
 * @static
 */
class ElementHelper {

	//*****************************************
	// PUBLIC STATIC METHODS
	//*****************************************

	/**
	 * Replaces one element with given template
	 * @param {cheerio} el - Element to be replaced
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [variables] - Additional variables which will be passed to the template
	 * @private
	 */
	static replace(el, tplName, variables = {}) {
		const content = el.html();
		const template = cheerio(ejs.render(ElementHelper.templates[tplName], {content, variables}));
		template.attr(el.attr());
		el.replaceWith(template);
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
	static wrapContent(el, tplName, {classes = [], attributes = {}, variables = {}} = {}) {
		classes = ElementHelper._ensureArray(classes);
		attributes = ElementHelper._concatAttributes(attributes);

		const content = el.html();
		const template = cheerio(ejs.render(ElementHelper.templates[tplName], {variables, content}));

		template.attr(attributes);
		template.addClass(classes.join(' '));

		el.html(template);
	}

	/**
	 * Wraps given element with given template
	 * @param {cheerio} el - Element to be replaced
	 * @param {string} tplName - Name of the template to use
	 * @param {object} [assets] - Additional options for replacing elements
	 * @param {string | string[]} [assets.classes] - Add additional classes to append to the template root element
	 * @param {object} [assets.attributes] - Add additional attributes which will be added to template
	 * @param {object} [assets.variables] - Additional variables which will be passed to the template
	 * @param {boolean} [transcludeClasses=true] - Should be classes moved from source element to template
	 * @private
	 */
	static wrap(el, tplName, {classes = [], attributes = {}, variables = {}} = {}, transcludeClasses = true) {
		classes = ElementHelper._ensureArray(classes);
		attributes = ElementHelper._concatAttributes(attributes);

		if (attributes.class) {
			classes.push(...attributes.class.split(' '));
			delete attributes.class;
		}

		if (transcludeClasses) {
			const srcClassString = el.attr('class');
			classes.push(...srcClassString.split(' '));
			ElementHelper.removeClass(el, srcClassString);
		}

		const content = cheerio.html(el);
		const template = cheerio(ejs.render(ElementHelper.templates[tplName], {content, variables}));

		template.attr(attributes);
		ElementHelper.addClass(template, classes.join(' '));

		el.replaceWith(template);

		return el;
	}

	/**
	 * Removes given element, but keeps child contents
	 * @param {cheerio} el - Element to be replaced
	 * @private
	 */
	static unwrap(el) {
		const contents = el.html();
		const parsedContents = cheerio(contents);
		el.replaceWith(parsedContents);
	}

	/**
	 * Adds class to element and sets data-attributes for debugging reasons
	 * @param {cheerio} el
	 * @param {string} classname
	 */
	static addClass(el, classname) {
		this._appendToAttribute(el, DEBUG_ATTRIBUTES.CLASS_ADDED, classname).addClass(classname);
	}

	/**
	 * Removes class to element and sets data-attributes for debugging reasons
	 * @param {cheerio} el
	 * @param {string} classname
	 */
	static removeClass(el, classname) {
		this._appendToAttribute(el, DEBUG_ATTRIBUTES.CLASS_REMOVED, classname).removeClass(classname);
	}


	//*****************************************
	// PRIVATE METHODS
	//*****************************************

	/**
	 * Appends value to attribute
	 * @param {cheerio} el
	 * @param {string} attr
	 * @param {any} val
	 * @return {string}
	 * @private
	 */
	static _appendToAttribute(el, attr, val) {
		const currVal = el.attr(attr) || '';
		const newVal = (currVal + ' ' + val).trim();

		return el.attr(attr, newVal);
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

	/**
	 * Makes sure, given variable is an array. If not, it will be splitted into an array
	 * @param {string | string[]} arr
	 * @return {string[]}
	 * @private
	 */
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

/**
 * Contains loaded templates
 * @type {Object}
 * @see TemplateLoader.load
 * @readonly
 * @private
 */
ElementHelper.templates = Object.freeze(TemplateLoader.load());

ElementHelper.DEBUG_ATTRIBUTES = DEBUG_ATTRIBUTES;

module.exports = ElementHelper;
