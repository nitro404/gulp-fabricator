# Gulp Fabricator

[![NPM version][npm-version-image]][npm-url]
[![Build Status][build-status-image]][build-status-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Known Vulnerabilities][vulnerabilities-image]][vulnerabilities-url]
[![Downloads][npm-downloads-image]][npm-url]

A multipurpose extension of gulp that allows for simplified and centralized processing and analyzation of Node.js modules and projects.

## Usage

```javascript
var fabricator = require("gulp-fabricator");

fabricator.setup({
	name: "Example Module",
	type: "Module",
	tasks: ["JavaScript"],
	build: {
		transformation: "Node.js"
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

## Building

To build the distribution files for this module:
```bash
npm run build
```
or
```bash
gulp build
```

## Notes

JavaScript linting is permanently disabled for now until [gulp-jscs](https://github.com/jscs-dev/gulp-jscs) is updated to allow for direct specification of configuration options, see this [pull request](https://github.com/jscs-dev/gulp-jscs/pull/123) for updates.

[npm-url]: https://www.npmjs.com/package/gulp-fabricator
[npm-version-image]: https://img.shields.io/npm/v/gulp-fabricator.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/gulp-fabricator.svg

[build-status-url]: https://travis-ci.org/nitro404/gulp-fabricator
[build-status-image]: https://travis-ci.org/nitro404/gulp-fabricator.svg?branch=master

[coverage-url]: https://coveralls.io/github/nitro404/gulp-fabricator?branch=master
[coverage-image]: https://coveralls.io/repos/github/nitro404/gulp-fabricator/badge.svg?branch=master

[vulnerabilities-url]: https://snyk.io/test/github/nitro404/gulp-fabricator?targetFile=package.json
[vulnerabilities-image]: https://snyk.io/test/github/nitro404/gulp-fabricator/badge.svg?targetFile=package.json
