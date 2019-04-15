const path = require('path');
const BootstrapEmail = require('./lib/BootstrapEmail');
const fs = require('fs');

const inputPath = path.join(__dirname, 'tests/input');
const dir = fs.readdirSync(inputPath);
const files = dir.map(filename => {
	return path.join(inputPath, filename);
});

const bootstrapEmail = new BootstrapEmail({
	templates: files
});
bootstrapEmail.compileAndSave(path.join(__dirname, 'tests/output'));
