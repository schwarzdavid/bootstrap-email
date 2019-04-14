const path = require('path');
const fs = require('fs');
const BootstrapEmail = require('./BootstrapEmail');
const cheerio = require('cheerio');
const expect = require('chai').expect;

const testDir = path.join(__dirname, '../tests');
const preinlinedDir = path.join(testDir, 'preinlined');
const inlinedDir = path.join(testDir, 'inlined');

function normalizeString(str) {
	return str.replace(/(\r\n|\r|\n|\s)/gm, '').toLowerCase();
}

describe('BootstrapEmail', function () {

	const outputTemplates = [];
	const inputFiles = [];

	{
		const fileNames = fs.readdirSync(inlinedDir);

		for (let fileName of fileNames) {
			const filePath = path.join(inlinedDir, fileName);
			const fileContent = fs.readFileSync(filePath, 'utf8');

			outputTemplates.push({
				name: fileName,
				$: cheerio.load(fileContent),
				content: fileContent
			});
			inputFiles.push({
				name: fileName,
				path: path.join(preinlinedDir, fileName)
			});
		}
	}

	it('should inject header correctly', function () {
		const selector = 'head';

		const email = new BootstrapEmail({template: inputFiles[0].path});
		email.injectHead();
		const $ = email.outputRaw();

		const emailHeader = normalizeString($(selector).html());
		const compareHeader = normalizeString(outputTemplates[0].$(selector).html());

		return expect(emailHeader).to.equal(compareHeader);
	});

	describe('compile templates', function () {
		inputFiles.forEach(function (template, index) {
			it(`should compile ${template.name} correctly`, function () {
				const selector = 'body';

				const email = new BootstrapEmail({
					template: template.path
				});
				email.compileHtml();
				email.inlineCss();
				const $ = email.outputRaw();

				outputTemplates[index].$('*').attr('style', null).attr('bgcolor', null);

				const emailBody = normalizeString($(selector).html());
				const compareBody = normalizeString(outputTemplates[index].$(selector).html());

				return expect(emailBody).to.equal(compareBody);
			});
		});
	});
});
