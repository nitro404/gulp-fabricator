"use strict";

const fabricator = require("../src/fabricator.js");
const utilities = require("extra-utilities");
const chai = require("chai");
const expect = chai.expect;

describe("Gulp Fabricator", function() {
	describe("setup", function() {
		it("should be a function", function() {
			expect(fabricator.setup).to.be.an.instanceof(Function);
		});
	});

	describe("formatOptions", function() {
		it("should be a function", function() {
			expect(fabricator.formatOptions).to.be.an.instanceof(Function);
		});
	});

	describe("noop", function() {
		it("should be a function", function() {
			expect(fabricator.noop).to.be.an.instanceof(Function);
		});
	});

	describe("transformation", function() {
		it("should be an object", function() {
			expect(fabricator.transformation).to.be.an.instanceof(Object);
		});

		describe("umd", function() {
			it("should be a function", function() {
				expect(fabricator.transformation.umd).to.be.an.instanceof(Function);
			});
		});

		describe("iife", function() {
			it("should be a function", function() {
				expect(fabricator.transformation.iife).to.be.an.instanceof(Function);
			});
		});
	});

	describe("transform", function() {
		it("should be a function", function() {
			expect(fabricator.transform).to.be.an.instanceof(Function);
		});
	});
});
