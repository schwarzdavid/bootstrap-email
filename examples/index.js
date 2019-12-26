const path = require('path');
const BootstrapEmail = require('../src/BootstrapEmail');
const fs = require('fs');

const inputPath = path.join(__dirname, 'input');
/*const dir = fs.readdirSync(inputPath);
const files = dir.map(filename => {
	return path.join(inputPath, filename);
});*/

const tplPath = path.join(inputPath, '../test.html');

const bootstrapEmail = new BootstrapEmail(tplPath, {
	logLevel: BootstrapEmail.LOG_LEVEL.DEBUG
});
bootstrapEmail.compileAndSave(path.join(__dirname, 'output.html'));
