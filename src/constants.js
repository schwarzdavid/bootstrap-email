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

const voidElements = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'menuitem',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
	'basefont',
	'bgsound',
	'frame',
	'isindex'
];

const defaultVariables = {
	'$grid-columns': 12
};

module.exports = {
	doctype,
	blockElements,
	voidElements,
	defaultVariables
};
