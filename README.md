# Gulp Fabricator

[![NPM version][npm-version-image]][npm-url]
[![Build Status][build-status-image]][build-status-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Known Vulnerabilities][vulnerabilities-image]][vulnerabilities-url]
[![Downloads][npm-downloads-image]][npm-url]

A multipurpose extension of gulp that allows for simplified and centralized processing and analyzation of Node.js modules and projects.

## Usage

```javascript
const fabricator = require("gulp-fabricator");

fabricator.setup({
	name: "Example Module",
	type: "Module",
	tasks: ["JavaScript"],
	build: {
		transformation: "UMD"
	},
	base: {
		directory: __dirname
	}
});
```

## Installation

To install this module:
```bash
npm install --save-dev gulp-fabricator
```

## Notes

JavaScript linting is temporarily disabled for now until ESLint integration has been completed.

[npm-url]: https://www.npmjs.com/package/gulp-fabricator
[npm-version-image]: https://img.shields.io/npm/v/gulp-fabricator.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/gulp-fabricator.svg

[build-status-url]: https://travis-ci.org/nitro404/gulp-fabricator
[build-status-image]: https://travis-ci.org/nitro404/gulp-fabricator.svg?branch=master

[coverage-url]: https://coveralls.io/github/nitro404/gulp-fabricator?branch=master
[coverage-image]: https://coveralls.io/repos/github/nitro404/gulp-fabricator/badge.svg?branch=master

[vulnerabilities-url]: https://snyk.io/test/github/nitro404/gulp-fabricator?targetFile=package.json
[vulnerabilities-image]: https://snyk.io/test/github/nitro404/gulp-fabricator/badge.svg?targetFile=package.json
