const fs = require('fs');
const path = require('path');

/**
 * Util for loading template files
 * @static
 */
class TemplateLoader {

	/**
	 * @param {string} [dirPath] Defaults to TemplateLoader.templatesPath
	 * @return {Object} Contains all loaded files
	 */
	static load(dirPath = TemplateLoader.templatesPath) {
		const files = fs.readdirSync(dirPath, {withFileTypes: true});
		const output = {};

		for (let file of files) {
			if (!file.isFile() || path.extname(file.name) !== TemplateLoader.extname) {
				continue;
			}

			const name = path.basename(file.name, TemplateLoader.extname);

			output[name] = fs.readFileSync(path.join(dirPath, file.name), TemplateLoader.encoding);
		}

		return output;
	}
}

/**
 * Path to templates
 * @memberOf TemplateLoader
 * @default path-to-module/src/assets/templates
 * @type {string}
 */
TemplateLoader.templatesPath = path.join(__dirname, '../assets/templates');

/**
 * Default file encoding for templates
 * @memberOf TemplateLoader
 * @default
 * @type {string}
 */
TemplateLoader.encoding = 'utf8';

/**
 * Default extension for template files
 * @memberOf TemplateLoader
 * @default
 * @type {string}
 */
TemplateLoader.extname = '.ejs';

module.exports = TemplateLoader;
