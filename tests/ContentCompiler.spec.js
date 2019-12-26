const cheerio = require('cheerio');
const ContentCompiler = require('../src/lib/ContentCompiler');
const chai = require('chai');
const ChaiThings = require('chai-things');
const ChaiCheerio = require('chai-cheerio');
const Logger = require('bunyan');

const expect = chai.expect;
const whitespaceChar = '&#xA0;';

chai.use(ChaiThings);
chai.use(ChaiCheerio);

describe('ContentCompiler', function () {
	const logger = Logger.createLogger({
		name: 'Bootstrap Email',
		level: 20
	});

	describe('preview', function () {
		const content = 'Hello World';
		const $ = cheerio.load(`<preview>${content}</preview>`);
		const preview = $('preview');

		new ContentCompiler($, logger).preview();

		it('should replace element', function () {
			expect(preview).to.exist;
			expect(preview.get(0).tagName).to.equal('div');
			expect(preview).to.have.class('preview');
		});

		it('should fill empty content with whitespace', function () {
			const text = content + whitespaceChar.repeat(100 - content.length);
			expect(preview).to.have.html(text);
		});

		it('should accept longer content', function () {
			const new$ = cheerio.load(`<preview>${'a'.repeat(120)}</preview>`);
			const newPreview = new$('preview');

			new ContentCompiler(new$, logger);

			const text = newPreview.text();

			expect(text).to.have.lengthOf(120);
			expect(text).to.equal('a'.repeat(120));
			expect(text).not.to.include(whitespaceChar);
		});
	});

	describe('spacing', function () {

	});

	describe('div', function () {
		const $ = cheerio.load('<div class="one">Foo</div><div>Bar</div>');
		new ContentCompiler($, logger).div();

		it('should replace all divs', function () {
			expect($('div')).not.to.exist;
			expect($('table')).to.have.lengthOf(2);

			expect($('.one')).to.exist;
			expect($('.one > tbody > tr > td')).to.exist;
			expect($('.one > tbody > tr > td')).to.have.text('Foo');
		});
	});

	describe('align', function () {

	});

	describe('grid', function () {

	});
});
