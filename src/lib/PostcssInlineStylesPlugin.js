const postcss = require('postcss');

const DEFAULT_OPTIONS = {
	output: () => {
	},
	logger: console
};

const NOT_INLINEABLE = [
	':active',
	':any-link',
	':blank',
	':checked',
	':current',
	':default',
	':dir',
	':disabled',
	':focus',
	':focus-visible',
	':focus-within',
	':hover',
	':indeterminate',
	':in-range',
	':invalid',
	':lang',
	':left',
	':link',
	':local-link',
	':is',
	':optional',
	':placeholder-shown',
	':playing',
	':paused',
	':read-only',
	':read-write',
	':required',
	':right',
	':scope',
	':valid',
	':target',
	':visited',
	':before',
	':after',
	':first-line',
	':first-letter',
	':grammar-error',
	':selection',
	':spelling-error'
];

module.exports = postcss.plugin('postcss-inline-style', options => {
	options = Object.assign({}, DEFAULT_OPTIONS, options);

	function getNode(rule, container) {
		if (!container.nodes) {
			return undefined;
		}
		return container.nodes.find(node => (node.selector || node.params) === (rule.selector || rule.params));
	}

	return root => {
		const headerRoot = postcss.root();
		const extractRuleRegex = new RegExp(NOT_INLINEABLE.join('|'));

		function ruleHandler(rule, targetParent = headerRoot) {
			if (rule.type === 'decl') {
				targetParent.append(rule);
			} else {
				let headerRule = getNode(rule, targetParent);
				if (!headerRule) {
					switch (rule.type) {
						case 'atrule':
							headerRule = postcss.atRule({name: rule.name, params: rule.params});
							break;
						case 'rule':
							headerRule = postcss.rule({selector: rule.selector});
							break;
						case 'comment':
							return;
						default:
							this.logger.error(`Unknown type ${rule.type}. Will be ignored`);
					}

					targetParent.append(headerRule);
				}

				rule.each(node => ruleHandler(node, headerRule));
				rule.remove();
			}
		}

		root.walkAtRules(rule => ruleHandler(rule));
		root.walkRules(extractRuleRegex, rule => ruleHandler(rule));

		if (typeof options.output === 'function') {
			options.output(headerRoot.toString());
		}
	};
});
