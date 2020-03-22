"use strict";

const fabricator = require("../src/fabricator.js");
const utilities = require("extra-utilities");
const chai = require("chai");
const expect = chai.expect;

describe("Gulp Fabricator", function() {
	describe("log", function() {
		it("should be a function", function() {
			expect(fabricator.log).to.be.an.instanceof(Function);
		});

		describe("info", function() {
			it("should be a function", function() {
				expect(fabricator.log.info).to.be.an.instanceof(Function);
			});
		});

		describe("warn", function() {
			it("should be a function", function() {
				expect(fabricator.log.warn).to.be.an.instanceof(Function);
			});
		});

		describe("error", function() {
			it("should be a function", function() {
				expect(fabricator.log.error).to.be.an.instanceof(Function);
			});
		});

		describe("files", function() {
			it("should be a function", function() {
				expect(fabricator.log.files).to.be.an.instanceof(Function);
			});
		});
	});

	describe("src", function() {
		it("should be a function", function() {
			expect(fabricator.src).to.be.an.instanceof(Function);
		});
	});

	describe("noop", function() {
		it("should be a function", function() {
			expect(fabricator.noop).to.be.an.instanceof(Function);
		});
	});

	describe("noopTask", function() {
		it("should be a function", function() {
			expect(fabricator.noopTask).to.be.an.instanceof(Function);
		});
	});

	describe("seriesTasks", function() {
		it("should be a function", function() {
			expect(fabricator.seriesTasks).to.be.an.instanceof(Function);
		});
	});

	describe("parallelTasks", function() {
		it("should be a function", function() {
			expect(fabricator.parallelTasks).to.be.an.instanceof(Function);
		});
	});

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
