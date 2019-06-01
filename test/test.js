"use strict";

var fabricator = require("../src/fabricator.js");
var utilities = require("extra-utilities");
var chai = require("chai");
var expect = chai.expect;

describe("Gulp Fabricator", function() {
	describe("setup", function() {
		it("should be a function", function() {
			expect(utilities.isFunction(fabricator.setup)).to.equal(true);
		});
	});

	describe("formatOptions", function() {
		it("should be a function", function() {
			expect(utilities.isFunction(fabricator.formatOptions)).to.equal(true);
		});
	});

	describe("noop", function() {
		it("should be a function", function() {
			expect(utilities.isFunction(fabricator.noop)).to.equal(true);
		});
	});

	describe("transformation", function() {
		it("should be a strict object", function() {
			expect(utilities.isObjectStrict(fabricator.transformation)).to.equal(true);
		});

		describe("function", function() {
			it("should be a function", function() {
				expect(utilities.isFunction(fabricator.transformation.function)).to.equal(true);
			});
		});

		describe("node", function() {
			it("should be a function", function() {
				expect(utilities.isFunction(fabricator.transformation.node)).to.equal(true);
			});
		});

		describe("angular", function() {
			it("should be a function", function() {
				expect(utilities.isFunction(fabricator.transformation.angular)).to.equal(true);
			});
		});
	});

	describe("transform", function() {
		it("should be a function", function() {
			expect(utilities.isFunction(fabricator.transform)).to.equal(true);
		});
	});
});
