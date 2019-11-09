const doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">';

const blockElements = [
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

const unsupportedPaddingElements = [
	'p',
	'div'
];

module.exports = {
	doctype,
	blockElements,
	unsupportedPaddingElements
};
