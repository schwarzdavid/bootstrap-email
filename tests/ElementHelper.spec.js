const cheerio = require('cheerio');
const ElementHelper = require('../src/lib/ElementHelper');
const chai = require('chai');
const ChaiThings = require('chai-things');
const ChaiCheerio = require('chai-cheerio');

const expect = chai.expect;

chai.use(ChaiThings);
chai.use(ChaiCheerio);

describe('ElementHandler', function () {
	it('should have templates loaded', function () {
		expect(ElementHelper.templates)
			.to.be.a('object');
	});

	describe('_ensureArray', function () {
		it('take string param', function () {
			const arr = ElementHelper._ensureArray('foo bar');

			expect(arr).to.be.an('array').that.has.length(2);
		});

		it('take array param', function () {
			const arr = ElementHelper._ensureArray(['foo', 'bar']);

			expect(arr).to.be.an('array').that.has.lengthOf(2);

			arr.forEach((item, index) => {
				expect(item).to.be.a('string', `[${index}] is not a string`);
			});
		});
	});

	describe('_concatAttributes', function () {
		it('should concat two objects', function () {
			const in_1 = {
				foo: 'bar',
				override: 'hello world'
			};

			const in_2 = {
				bar: 'foo',
				override: 'not today'
			};

			const out = ElementHelper._concatAttributes(in_1, in_2);

			expect(out).to.be.an('object')
				.that.has.keys(['foo', 'bar', 'override'])
				.with.property('override', 'not today');
		});

		it('should concat object and cheerio', function () {
			const el = cheerio('<img class="img-fluid" src="path-to-image" alt="lorem ipsum" data-foo="bar"/>');
			const obj = {
				'data-foo': 'overwritten',
				'draggable': false
			};

			const out = ElementHelper._concatAttributes(el, obj);

			expect(out).to.be.an('object')
				.that.has.keys(['class', 'src', 'alt', 'data-foo', 'draggable'])
				.with.property('data-foo', 'overwritten');
		});

		it('should concat two cheerio objects', function () {
			const el_1 = cheerio('<div class="baum" data-foo="bar">Hallo Welt</div>');
			const el_2 = cheerio('<div class="overwritten" data-test="hello">');

			const out = ElementHelper._concatAttributes(el_1, el_2);

			expect(out).to.be.an('object')
				.that.has.keys(['class', 'data-foo', 'data-test'])
				.with.property('class', 'overwritten');
		});
	});

	describe('_appendToAttribute', function () {
		it('should append to non-existing attributes', function () {
			const el = cheerio('<div>Test</div>');

			ElementHelper._appendToAttribute(el, 'data-foo', 'bar');
			ElementHelper._appendToAttribute(el, 'class', 'container');

			expect(el).to.have.attr('data-foo', 'bar');
			expect(el).to.have.class('container');
		});

		it('should append to existing attributes', function () {
			const el = cheerio('<div class="hello-world", data-foo="bar">hello world</div>');

			ElementHelper._appendToAttribute(el, 'data-foo', 'xyz');
			ElementHelper._appendToAttribute(el, 'class', 'container');

			expect(el).to.have.attr('data-foo', 'bar xyz');
			expect(el).to.have.class('hello-world').and.class('container');
		});
	});

	describe('addClass', function () {
		it('should add debug dataset attribute', function () {
			const el = cheerio('<div class="container">Test</div>');

			ElementHelper.addClass(el, 'bar');
			ElementHelper.addClass(el, 'foo');

			expect(el).to.have.class('bar');
			expect(el).to.have.attr(ElementHelper.DEBUG_ATTRIBUTES.CLASS_ADDED, 'bar foo');
		});
	});

	describe('removeClass', function () {
		it('should add debug dataset attribute', function () {
			const el = cheerio('<div class="foo bar">Test</div>');

			ElementHelper.removeClass(el, 'bar');

			expect(el).not.to.have.class('bar');
			expect(el).to.have.attr(ElementHelper.DEBUG_ATTRIBUTES.CLASS_REMOVED, 'bar');
		});
	});

	describe('replace', function () {
		const dom = cheerio.load('<div class="container" data-test="hello-world"><p class="lead">lorem ipsum</p></div>');
		ElementHelper.replace(dom('.container'), 'table');
		const el = dom('.container');

		it('should replace root element', function () {
			expect(el[0].tagName).to.equal('table');
		});

		it('should keep attributes', function () {
			expect(el).to.have.class('container');
			expect(el).to.have.attr('data-test', 'hello-world');
			expect(el).to.have.descendants('p');
		});

		it('should keep content', function () {
			const p = el.find('p');

			expect(p).to.exist;
			expect(p.length).to.be.equal(1);
			expect(p).to.have.text('lorem ipsum');
		});
	});

	describe('wrapContent', function () {

	});

	describe('wrap', function () {

	});
});
