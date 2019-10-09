const fs = require('fs');
const path = require('path');

const __templatesDir = path.join(__dirname, '../assets/templates');
const __encoding = 'utf8';
const __extname = '.ejs';

function readTemplateDir(dirPath = __templatesDir) {
	const files = fs.readdirSync(dirPath, {withFileTypes: true});
	const output = {};

	for(let file of files){
		if(!file.isFile() || path.extname(file.name !== __extname)){
			break;
		}

		const name = path.basename(file.name, __extname);
		const content = fs.readFileSync(file.name, __encoding);

		output[name] = content;
	}

	console.log(output);

	return output;
}

module.exports = readTemplateDir;
