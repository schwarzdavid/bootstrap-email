const path = require('path');
const fs = require('fs');
const BootstrapEmail = require('../src/BootstrapEmail');
const cheerio = require('cheerio');
const chai = require('chai');
const chaiThings = require('chai-things');

const expect = chai.expect;

const testDir = path.join(__dirname, '../tests');
const inputDir = path.join(testDir, 'input');
const outputDir = path.join(testDir, 'output');

chai.use(chaiThings);

function removeBreaks(str) {
	return str.replace(/(\r\n|\r|\n)/gm, '').toLowerCase();
}

describe('BootstrapEmail', function () {

	const outputTemplates = [];
	const inputFiles = [];

	{
		const fileNames = fs.readdirSync(inputDir);

		for (let fileName of fileNames) {
			const filePath = path.join(outputDir, fileName);
			const fileContent = fs.readFileSync(filePath, 'utf8');

			outputTemplates.push({
				name: fileName,
				$: cheerio.load(fileContent),
				content: removeBreaks(fileContent)
			});

			inputFiles.push({
				name: fileName,
				path: path.join(inputDir, fileName)
			});
		}
	}

	describe('compile one template', function () {
		inputFiles.forEach(function (template, index) {
			it(`should compile ${template.name} correctly`, function () {
				const email = new BootstrapEmail({
					template: template.path,
					containerWidthFallback: false
				});
				const document = removeBreaks(email.compile());

				return expect(document).to.equal(outputTemplates[index].content);
			});
		});
	});

	describe('compile multiple templates at once', function () {
		const email = new BootstrapEmail({
			templates: inputFiles.map(file => file.path),
			containerWidthFallback: false
		});
		const output = email.compile();

		it('output type should be array', function () {
			return expect(output).to.be.a('array');
		});

		it('output items should contain path and document', function () {
			expect(output).all.to.have.property('path').and.all.to.have.property('document');
		});
	});
});
