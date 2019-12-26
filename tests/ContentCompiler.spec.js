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

	it('should have alignment constants', function () {
		expect(ContentCompiler.ALIGNMENT).to.exist
			.and.to.be.a('object');

		expect(ContentCompiler.ALIGNMENT.LEFT).to.exist
			.and.to.equal('.float-left');

		expect(ContentCompiler.ALIGNMENT.CENTER).to.exist
			.and.to.equal('.mx-auto');

		expect(ContentCompiler.ALIGNMENT.RIGHT).to.exist
			.and.to.equal('.float-right');
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

	describe('padding', function () {
		const $ = cheerio.load('<div class="px-3 py-5" data-origin><p data-content>Inner content</p></div>');
		new ContentCompiler($, logger).padding();
		const srcEl = $('[data-origin]');
		let firstChildren;

		it('should have spacing-container', function () {
			expect(srcEl.children()).to.have.lengthOf(1);

			firstChildren = srcEl.children().first();
			expect(firstChildren).to.exist;
			expect(firstChildren).to.have.class('bte-spacing-container');
			expect(firstChildren).to.have.class('bte-spacing-container--important');
		});

		it('should have correct spacing-classes', function () {
			expect(firstChildren).to.have.class('sx-3');
			expect(firstChildren).to.have.class('sy-5');
		});

		it('should keep content', function () {
			const content = $('[data-content]');
			expect(srcEl).to.have.descendants(content);
			expect(content).to.exist;
			expect(content).to.have.text('Inner content');
			expect(content.parent().get(0).tagName).to.equal('td');
		});

		it('should wrap void elements with padding', function () {
			const new$ = cheerio.load('<input type="text" name="foo" class="p-3 special-input">');
			new ContentCompiler(new$, logger).padding();
			const input = new$('input');

			expect(input).to.exist;
			expect(input.children()).to.have.lengthOf(0);
			expect(input.parent().get(0).tagName).to.equal('td');

			const spacingContainer = input.closest('.bte-spacing-container');
			expect(spacingContainer).to.exist;
			expect(spacingContainer).to.have.descendants(input);
			expect(spacingContainer).to.have.class('special-input');
		});
	});

	describe('margin', function () {
		const $ = cheerio.load('<div class="mx-3 my-5 container" data-origin><p data-content>Inner content</p></div>');
		new ContentCompiler($, logger).margin();
		const srcEl = $('[data-origin]');
		const spacingContainer = srcEl.closest('.bte-spacing-container');

		it('should be wrapped in spacing-container', function () {
			expect(spacingContainer).to.exist;
			expect(spacingContainer).to.have.class('sx-3');
			expect(spacingContainer).to.have.class('sy-5');
			expect(spacingContainer.hasClass('container')).to.be.false;
		});
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
		it('should create table', function () {
			const $ = cheerio.load('<p class="lead float-left" data-origin>Hello World</p>');
			new ContentCompiler($, logger).align(ContentCompiler.ALIGNMENT.LEFT);
			const el = $('[data-origin]');

			expect(el).to.exist;
			expect(el.get(0).tagName).to.be.equal('p');
			expect(el).to.have.class('float-left');
			expect(el).to.have.class('lead');
			expect(el.parent().get(0).tagName).to.be.equal('td');
			expect(el.closest('table')).to.exist;
			expect(el.closest('table')).to.have.attr('align', 'left');
			expect(el.closest('table')).to.have.attr('data-bte-added-attribute', 'align');
		});

		it('should set attribute to existing table', function () {
			const $ = cheerio.load('<table data-origin class="table float-left"><tbody><tr><td>Hello World</td></tr></tbody></table>')
			new ContentCompiler($, logger).align(ContentCompiler.ALIGNMENT.LEFT);
			const el = $('[data-origin]');

			expect(el).to.exist;
			expect(el).to.have.class('table');
			expect(el).to.have.class('float-left');
			expect(el).to.have.attr('align', 'left');
			expect(el).to.have.attr('data-bte-added-attribute', 'align');
		});

		it('should create center-tag', function () {
			const $ = cheerio.load('<p class="mx-auto" data-origin>Hello World</p>');
			new ContentCompiler($, logger).align(ContentCompiler.ALIGNMENT.CENTER);
			const el = $('[data-origin]');

			expect(el).to.exist;
			expect(el.parent()).to.exist;
			expect(el.parent().get(0).tagName).to.equal('center');
		});

		it('should create center-tag for tables', function () {
			const $ = cheerio.load('<table class="mx-auto" data-origin"><tbody><tr><td>Hello World</td></tr></tbody></table>')
			new ContentCompiler($, logger).align(ContentCompiler.ALIGNMENT.CENTER);
			const el = $('[data-origin]');

			expect(el).to.exist;
			expect(el.parent()).to.exist;
			expect(el.parent().get(0).tagName).to.equal('center');
			expect(el).to.not.have.attr('align');
		});

		it('should ignore on invalid direction', function () {
			const $ = cheerio.load('<div class="float-left" data-origin></div>');
			new ContentCompiler($, logger).align(ContentCompiler.ALIGNMENT.LEFT);
			const el = $('[data-origin]');

			expect(el.parent().get(0).tagName).to.not.equal('table');
			expect(el.parent()).to.not.have.attr('align');
		});
	});

	describe('grid', function () {
		// TODO: write tests
	});

	describe('_createGrid', function () {
		// TODO: write tests
	});

	describe('container', function () {
		// TODO: write tests
	});
});
