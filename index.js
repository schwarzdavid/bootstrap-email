const path = require('path');
const BootstrapEmail = require('./lib/BootstrapEmail');

const bootstrapEmail = new BootstrapEmail({
	template: path.resolve('./tests/preinlined/lyft.html')
});
bootstrapEmail.compileAndSave(path.join(__dirname, 'output.html'));
