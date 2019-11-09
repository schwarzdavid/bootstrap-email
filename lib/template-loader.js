const fs = require('fs');
const path = require('path');

const __templatesDir = path.join(__dirname, '../assets/templates');
const __encoding = 'utf8';
const __extname = '.ejs';

function readTemplateDir(dirPath = __templatesDir) {
	const files = fs.readdirSync(dirPath, {withFileTypes: true});
	const output = {};

	for(let file of files){
		if(!file.isFile() || path.extname(file.name) !== __extname){
			break;
		}

		const name = path.basename(file.name, __extname);

		output[name] = fs.readFileSync(path.join(dirPath, file.name), __encoding);
	}

	return output;
}

module.exports = readTemplateDir;
