const ElementHelper = require('./ElementHelper');

class ComponentCompiler {
	constructor($, logger) {
		this._$ = $;
		this._logger = logger;
	}

	badge() {
		const $ = this._$;
		$('.badge').each((i, _el) => {
			const el = $(_el);
			const whitespace = '&#xA0;';
			const text = whitespace.repeat(2) + el.html() + whitespace.repeat(2);
			el.html(text);
		});
	}

	button() {
		const $ = this._$;
		$('.btn').each((i, _el) => {
			if (_el.name !== 'table') {
				ElementHelper.wrapContent($(_el), 'table');
			}
		});
	}
}

module.exports = ComponentCompiler;
