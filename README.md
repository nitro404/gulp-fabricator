# Gulp Fabricator

[![NPM version][npm-version-image]][npm-url]
[![Build Status][build-status-image]][build-status-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Known Vulnerabilities][vulnerabilities-image]][vulnerabilities-url]
[![Dependencies][dependencies-image]][dependencies-url]
[![Downloads][npm-downloads-image]][npm-url]
[![Install Size][install-size-image]][install-size-url]
[![Contributors][contributors-image]][contributors-url]
[![Pull Requests Welcome][pull-requests-image]][pull-requests-url]

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

[dependencies-url]: https://david-dm.org/nitro404/gulp-fabricator
[dependencies-image]: https://img.shields.io/david/nitro404/gulp-fabricator.svg

[install-size-url]: https://packagephobia.now.sh/result?p=gulp-fabricator
[install-size-image]: https://badgen.net/packagephobia/install/gulp-fabricator

[contributors-url]: https://github.com/nitro404/gulp-fabricator/graphs/contributors
[contributors-image]: https://img.shields.io/github/contributors/nitro404/gulp-fabricator.svg

[pull-requests-url]: https://github.com/nitro404/gulp-fabricator/pulls
[pull-requests-image]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg
