const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sass = require('sass-extract');
const postcss = require('postcss');
const extractHeaderCss = require('./lib/PostcssInlineStylesPlugin');
const bunyan = require('bunyan');
const juice = require('juice');
const tmp = require('tmp');
const ContentCompiler = require('./lib/ContentCompiler');
const constants = require('./constants');


/**
 * @readonly
 * @enum {string}
 * @memberOf BootstrapEmail
 */
const STYLE_VARIABLES = {
	/** $grid-columns */
	COLUMNS: '$grid-columns',
	/** $container-max-width */
	CONTAINER_WIDTH: '$container-max-width'
};

/**
 * @readonly
 * @enum {number}
 * @memberOf BootstrapEmail
 * @see https://www.npmjs.com/package/bunyan#levels
 */
const LOG_LEVEL = {
	/** 20 */
	DEBUG: 20,
	/** 30 */
	INFO: 30,
	/** 40 */
	WARN: 40,
	/** 50 */
	ERROR: 50,
	/** 60 */
	FATAL: 60
};


const __defaultConfig = {
	style: path.join(__dirname, './assets/bootstrap-email.scss'),
	head: path.join(__dirname, './assets/head.scss'),
	containerWidthFallback: true
};

const __styleVariables = {
	[STYLE_VARIABLES.COLUMNS]: 12
};

class BootstrapEmail {

	//*****************************************
	// CONSTRUCTOR
	//*****************************************

	/**
	 * Creates a new BootstrapEmail instance
	 *
	 * @constructor
	 * @param {string|string[]} templates Path to file, string containing HTML code or array of filepaths
	 * @param {Object} [options]
	 * @param {string} [options.style] Path to .css or .scss file that should be inlined
	 * @param {string} [options.head] Path to .css or .scss file taht should be injected into header
	 * @param {LOG_LEVEL} [options.logLevel] Defaults to LOG_LEVEL.INFO
	 * @param {Object} [options.variables] Sets default SASS-Variables if not defined otherwise in SCSS-file
	 */
	constructor(templates, {
		style = __defaultConfig.style,
		head = __defaultConfig.head,
		logLevel = LOG_LEVEL.INFO,
		variables = {}
	} = {}) {

		/**
		 * Path to main (s)css file
		 * @type {string}
		 * @private
		 */
		this._stylePath = style;

		/**
		 * Path to (s)css file which should be injected to <head>
		 * @type {string}
		 * @private
		 */
		this._headPath = head;

		/**
		 * Merged object containing default styling variables
		 * @type {Object}
		 * @private
		 */
		this._vars = {...__styleVariables, ...variables};

		/**
		 * "Bunyan"-Instance for loggin
		 * @type {Logger}
		 * @private
		 */
		this._logger = bunyan.createLogger({
			name: 'Bootstrap Email',
			level: logLevel
		});

		/**
		 * Contains parsed html-templates which will be compiled
		 * @type {Array.<{$:cheerio,path:string}>}
		 * @private
		 */
		this._templates = [];

		// HANDLE TEMPLATES-PARAMETER
		//*****************************************
		const templatePaths = [];
		if (Array.isArray(templates)) {
			templates.forEach(templatePath => {
				if (typeof templatePath !== 'string') {
					this._logger.error(`Template paths must be strings. Value ${templatePath} is a ${typeof templatePath} and will be ignored.`);
					return;
				}
				templatePaths.push(templatePath);
			});
		} else {
			if (typeof templates === 'string') {
				templatePaths.push(templates);
			} else {
				this._logger.fatal(`Parameter 'templates' must be a string or string[]. Got: ${typeof templates}`);
				return;
			}
		}

		// LOAD ALL TEMPLATE PATHS
		//*****************************************
		templatePaths.forEach(filePath => {
			if (fs.existsSync(filePath)) {
				try {
					const data = fs.readFileSync(filePath, 'utf8');
					this._templates.push({
						$: cheerio.load(data),
						name: path.basename(filePath)
					});
					this._logger.debug(filePath + ' successfully loaded');
				} catch (err) {
					this._logger.error(err, 'Cannot read ' + filePath);
				}
			} else {
				if (filePath.trim().charAt(0) !== '<') {
					this._logger.error('Given template is not valid html or the file does not exist. Got: ' + filePath);
					return;
				}

				this._templates.push({
					$: cheerio.load(filePath),
					name: null
				});
				this._logger.debug('HTML template successfully loaded');
			}
		});

		// LOAD STYLES
		//*****************************************
		const {css, vars, queries} = this._processStyle(this._stylePath);
		this._inlineStyles = css;
		this._mobileStyles = queries;

		for (let i in this._vars) {
			if (vars.hasOwnProperty(i)) {
				this._vars[i] = parseInt(vars[i].value);
			}
		}
	}


	//*****************************************
	// PUBLIC METHODS
	//*****************************************

	/**
	 * Performs a full compile and returns compiled templates
	 * @return {string} If only one templates has been compiled, returns the compiled html code
	 * @return {Array.<{path: string, document: string}>} If multiple templates have been compiled, returns an array containing the path and compiled document
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
			this._logger.debug('Start compiling ' + template.path);
			const compiler = new ContentCompiler(template.$, this._logger);

			// HIDE PREVIEW TEXT
			//*****************************************
			compiler.preview();

			// WRAP BODY
			//*****************************************
			compiler.body();

			// COMPILE SPACINGS
			//*****************************************
			compiler.padding();
			compiler.margin();

			// COMPILE CONTAINERS AND GRIDS
			//*****************************************
			compiler.container(this._vars[BootstrapEmail.STYLE_VARIABLES.CONTAINER_WIDTH]);
			compiler.grid(this._vars[BootstrapEmail.STYLE_VARIABLES.COLUMNS]);

			// COMPILE NECESSARY ELEMENTS
			//*****************************************
			compiler.hr();

			// COMPILE ALIGNMENT CLASSES
			//*****************************************
			compiler.align(ContentCompiler.ALIGNMENT.LEFT);
			compiler.align(ContentCompiler.ALIGNMENT.RIGHT);
			compiler.align(ContentCompiler.ALIGNMENT.CENTER);

			// REPLACE DIVS
			//*****************************************
			compiler.div();

			// COMPILE BOOTSTRAP COMPONENTS
			//*****************************************
			compiler.component('.card');
			compiler.component('.card-body');
			compiler.component('.btn');
			//compiler.component('.badge');
			compiler.component('.alert');

			// ADD ATTRIBUTES TO TABLES
			//*****************************************
			compiler.table();
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
		const headCss = this._processStyle(this._headPath).css;

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

			if (this._mobileStyles) {
				const queryStyles = template.$('<style>')
					.attr('type', 'text/css')
					.text(this._mobileStyles);
				head.append(queryStyles);
			}
		}
	}

	/**
	 * Prepares user-friendly output structure
	 * @return {(string)}
	 * @returns {Array.<{path:string,document:string}>}
	 * @private
	 */
	_output() {
		const out = [];

		for (let template of this._templates) {
			out.push({
				name: template.name,
				document: constants.DOCTYPE + template.$.html()
			});
		}

		if (out.length === 1) {
			return out[0].document;
		}
		return out;
	}

	/**
	 * Loads style and extracts all media queries
	 * @param {string} stylePath
	 * @return {{css: string, vars: Object, queries: string}}|{css: string}}
	 * @private
	 */
	_processStyle(stylePath) {
		const style = this._loadStyle(stylePath);
		let headerCss = '';

		this._logger.debug('Extract not inlineable css from style');

		const postcssPlugins = [
			extractHeaderCss({output: css => headerCss = css})
		];
		const mainCss = postcss(postcssPlugins).process(style.css).css;

		this._logger.debug('Styles extracted successfully.');

		return {
			vars: style.vars,
			css: mainCss,
			queries: headerCss
		};
	}

	/**
	 * Loads file from given sourcepath. If file is scss or sass, it will be compiled into css
	 * @static
	 * @param stylePath
	 * @return {{css: string, vars: Object}|{css: string}}
	 * @private
	 */
	_loadStyle(stylePath) {
		if (['.scss', '.sass'].includes(path.extname(stylePath))) {
			this._logger.debug(stylePath + ' detected as sass-file');

			const rendered = sass.renderSync({
				file: stylePath,
				outputStyle: 'compressed'
			});

			this._logger.debug(stylePath + ' read and parsed successfully');

			return {
				css: rendered.css.toString(),
				vars: rendered.vars.global
			}
		} else {
			const css = fs.readFileSync(stylePath, 'utf8');
			this._logger.debug(stylePath + ' read successfully');
			return {css};
		}
	}
}

BootstrapEmail.LOG_LEVEL = Object.freeze(LOG_LEVEL);
BootstrapEmail.STYLE_VARIABLES = Object.freeze(STYLE_VARIABLES);

/**
 * Default variables. Can be overwritten in the constructor
 * @readonly
 * @type {Object}
 */
BootstrapEmail.defaultVariables = Object.freeze(constants.defaultVariables);

/**
 * Array containing all tagnames of block-elements. Block-elements will be compiled differently
 * @type {string[]}
 */
BootstrapEmail.blockElements = constants.blockElements;

/**
 * Array containing all tagnames of void-elements which cannot contain any
 * @type {string[]}
 */
BootstrapEmail.voidElements = constants.voidElements;

/**
 * Doctype which will be used for parsed templates
 * @type {string}
 */
BootstrapEmail.DOCTYPE = constants.DOCTYPE;

module.exports = BootstrapEmail;
