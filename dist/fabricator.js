var gulp = require("gulp");
var rename = require("gulp-rename");
var sequence = require("gulp-sequence");
var concat = require("gulp-concat");
var stripComments = require("gulp-strip-comments");
var angularTemplateCache = require("gulp-angular-templatecache");
var uglifyJS = require("uglify-js");
var uglifyComposer = require("gulp-uglify/composer");
var jscs = require("gulp-jscs");
var sass = require("gulp-sass");
var sassLint = require("gulp-sass-lint");
var less = require("gulp-less");
var lessHint = require("gulp-lesshint");
var htmlHint = require("gulp-htmlhint");
var cleanCSS = require("gulp-clean-css");
var postCSS = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var mocha = require("gulp-mocha");
var istanbul = require("gulp-istanbul");
var nsp = require("gulp-nsp");
var PluginError = require("plugin-error");
var pump = require("pump");
var mergeStream = require("merge-stream");
var through = require("through2");
var utilities = require("extra-utilities");
var changeCase = require("change-case");
var path = require("path");

var fabricator = { };

fabricator.setup = function(options) {
	options = fabricator.formatOptions(options);

	function namespace(value) {
		if(utilities.isEmptyString(value)) {
			return value;
		}

		return (utilities.isEmptyString(options.namespace) ? "" : options.namespace + ":") + value.trim().replace(/^[:]+/, "");
	}

	var tasks = {
		build: [],
		lint: [],
		test: [],
		coverage: [],
		security: [],
		watch: [],
		default: []
	};

	if(options.build.tasks.includes("js")) {
		if(options.build.enabled) {
			gulp.task(namespace("build:js"), function(callback) {
				pump([
					mergeStream(
						gulp.src(options.js.source),
						options.build.transformation === "angular" && options.html.angular.cacheTemplates
							? gulp.src(options.html.source)
								.pipe(options.build.stripComments.enabled && options.html.stripComments.enabled ? stripComments(options.html.stripComments.options) : fabricator.noop())
								.pipe(trimWhitespace(true))
								.pipe(angularTemplateCache({
									module: changeCase.param(options.name) + ".templates",
									standalone: true,
									root: options.html.angular.templateRoot,
									transformUrl: function(value) {
										return utilities.isEmptyString(value) ? value : value.replace(new RegExp("^(.*" + options.html.angular.templateRoot + "([\/\\]))", "i"), changeCase.param(options.name) + "$2");
									}
								}))
							: gulp.src([]))
					.pipe(options.build.transformation === "angular" ? fabricator.transform({ transformation: "function" }) : fabricator.noop())
					.pipe(concat((utilities.isEmptyString(options.build.prefix) ? "" : options.build.prefix) + changeCase.param(options.name) + ".js"))
					.pipe(options.type === "module" ? fabricator.transform({ transformation: options.build.transformation, name: options.name }) : fabricator.noop())
					.pipe(options.build.stripComments.enabled && options.js.stripComments.enabled ? stripComments(options.js.stripComments.options) : fabricator.noop())
					.pipe(gulp.dest(options.js.destination))
					.pipe(rename({ extname: ".min.js" })),
					uglifyComposer(uglifyJS, console)({ mangle: false }),
					gulp.dest(options.js.destination)
				], callback);
			});

			tasks.build.push(namespace("build:js"));
		}

		if(options.lint.enabled && options.js.lint.enabled) {
			gulp.task(namespace("lint:js"), function() {
				gulp.src(options.js.source)
					.pipe(jscs({ config: options.js.lint.options }))
					.pipe(jscs.reporter());
			});

			tasks.lint.push(namespace("lint:js"));
		}

		if(options.lint.enabled && options.html.lint.enabled) {
			gulp.task(namespace("lint:html"), function() {
				gulp.src(options.html.source)
					.pipe(htmlHint(options.html.lint.options))
					.pipe(htmlHint.reporter());
			});

			tasks.lint.push(namespace("lint:html"));
		}
	}

	if(options.build.tasks.includes("scss") || options.build.tasks.includes("less") || options.build.tasks.includes("css")) {
		if(options.build.enabled) {
			gulp.task(namespace("build:css"), function(callback) {
				mergeStream(
					gulp.src(options.css.source),
					options.build.tasks.includes("scss")
						? gulp.src(options.scss.source)
							.pipe(options.build.stripComments.enabled && options.scss.stripComments.enabled ? stripComments(options.scss.stripComments.options) : fabricator.noop())
							.pipe(sass().on("error", sass.logError))
						: gulp.src([]),
					options.build.tasks.includes("less")
						? gulp.src(options.less.source)
							.pipe(options.build.stripComments.enabled && options.less.stripComments.enabled ? stripComments(options.less.stripComments.options) : fabricator.noop())
							.pipe(less())
						: gulp.src([]))
					.pipe(rename({ prefix: utilities.isEmptyString(options.build.prefix) ? "" : options.build.prefix }))
					.pipe(options.css.autoprefixer.enabled ? postCSS([autoprefixer(options.css.autoprefixer.options)]) : fabricator.noop())
					.pipe(options.build.stripComments.enabled && options.css.stripComments.enabled ? stripComments(options.css.stripComments.options) : fabricator.noop())
					.pipe(gulp.dest(options.css.destination))
					.pipe(cleanCSS())
					.pipe(rename({ extname: ".min.css" }))
					.pipe(gulp.dest(options.css.destination))
					.on("end", callback);
			});

			tasks.build.push(namespace("build:css"));
		}

		if(options.lint.enabled && options.scss.lint.enabled) {
			gulp.task(namespace("lint:scss"), function() {
				gulp.src(options.scss.source)
					.pipe(sassLint(options.scss.lint))
					.pipe(sassLint.format())
					.pipe(sassLint.failOnError());
			});

			tasks.lint.push(namespace("lint:scss"));
		}

		if(options.lint.enabled && options.less.lint.enabled) {
			gulp.task(namespace("lint:less"), function() {
				gulp.src(options.less.source)
					.pipe(lessHint(options.less.lint.options))
					.pipe(lessHint.reporter(options.less.lint.reporter))
					.pipe(lessHint.failOnError());
			});

			tasks.lint.push(namespace("lint:less"));
		}
	}

	if(options.test.enabled) {
		gulp.task(namespace("test:main"), function(callback) {
			gulp.src(options.test.source)
				.pipe(mocha({ reporter: options.test.reporter }));
		});

		tasks.test.push(namespace("test:main"));
	}

	if(options.coverage.enabled) {
		gulp.task(namespace("coverage:before"), function() {
			gulp.src(options.test.target)
				.pipe(istanbul({ includeUntested: true }))
				.pipe(istanbul.hookRequire());
		});

		tasks.coverage.push(namespace("coverage:before"));

		gulp.task(namespace("coverage:main"), function(callback) {
			gulp.src(options.test.source)
				.pipe(mocha())
				.pipe(istanbul.writeReports());
		});

		tasks.coverage.push(namespace("coverage:main"));
	}

	if(options.security.enabled) {
		gulp.task(namespace("security:main"), function(callback) {
			nsp({
				package: path.join(utilities.isEmptyString(options.base.directory) ? "" : options.base.directory, "package.json"),
				stopOnError: false
			}, callback);
		});

		tasks.security.push(namespace("security:main"));
	}

	gulp.task(namespace("watch:main"), function() {
		if(options.build.tasks.includes("js")) {
			gulp.watch(options.js.source, [namespace("build:js")]);

			if(options.build.transformation === "angular" && options.html.angular.cacheTemplates) {
				gulp.watch(options.html.source, [namespace("build:js")]);
			}
		}

		if(options.build.tasks.includes("scss")) {
			gulp.watch(options.scss.source, [namespace("build:css")]);
		}

		if(options.build.tasks.includes("less")) {
			gulp.watch(options.less.source, [namespace("build:css")]);
		}

		if(options.build.tasks.includes("css")) {
			gulp.watch(options.css.source, [namespace("build:css")]);
		}
	});

	tasks.watch.push(namespace("watch:main"));

	if(options.build.watch) {
		tasks.default.push("watch");
	}

	tasks.default.push("build", "lint", "security");

	gulp.task(namespace("build"), utilities.isEmptyArray(tasks.build) ? [] : sequence.apply(this, tasks.build));
	gulp.task(namespace("lint"), utilities.isEmptyArray(tasks.lint) ? [] : sequence.apply(this, tasks.lint));
	gulp.task(namespace("test"), utilities.isEmptyArray(tasks.test) ? [] : sequence.apply(this, tasks.test));
	gulp.task(namespace("coverage"), utilities.isEmptyArray(tasks.coverage) ? [] : sequence.apply(this, tasks.coverage));
	gulp.task(namespace("security"), utilities.isEmptyArray(tasks.security) ? [] : sequence.apply(this, tasks.security));
	gulp.task(namespace("watch"), utilities.isEmptyArray(tasks.watch) ? [] : sequence.apply(this, tasks.watch));
	gulp.task(namespace("default"), utilities.isEmptyArray(tasks.default) ? [] : sequence.apply(this, tasks.default));
};

fabricator.formatOptions = function(options) {
	return utilities.formatValue(
		options,
		{
			type: "object",
			strict: true,
			autopopulate: true,
			removeExtra: true,
			nonEmpty: true,
			required: true,
			formatter: function(value, format, options) {
				if(!Array.isArray(value.test.target)) {
					value.test.target = [path.join(value.js.destination, "*.js"), "!" + path.join(value.js.destination, "*.min.js")];
				}

				if(value.build.prefix === undefined && value.build.transformation === "angular") {
					value.build.prefix = "angular-";
				}

				for(var fileType in ["js", "html", "scss", "less", "css"]) {
					var config = value[fileType];

					for(var locationType in ["source, destination"]) {
						var baseLocation = value.base[locationType];

						if(utilities.isEmptyString(baseLocation)) {
							continue;
						}

						var location = config[locationType];

						if(utilities.isNonEmptyString(location)) {
							config[locationType] = path.join(baseLocation, location);
						}
						else if(utilities.isNonEmptyArray()) {
							var formattedLocation = [];

							for(var i = 0; i < location.length; i++) {
								formattedLocation.push(path.join(baseLocation, location[i]));
							}

							config[locationType] = formattedLocation;
						}
					}
				}

				return value;
			},
			format: {
				name: {
					type: "string",
					case: "title",
					trim: true,
					nonEmpty: true,
					required: true
				},
				type: {
					type: "string",
					case: "lower",
					trim: true,
					nonEmpty: true,
					default: "module",
					formatter: function(value, format, options) {
						if(value !== "module" && value !== "website") {
							throw new Error("Invalid or unsupported module type - expected Module or Website, received: \"" + value + "\".");
						}

						return value;
					}
				},
				js: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						source: {
							type: "array",
							default: ["src/**/*.js"],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						destination: {
							type: "string",
							trim: true,
							nonEmpty: true,
							default: "dist/"
						},
						stripComments: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										space: {
											type: "boolean",
											default: false
										},
										trim: {
											type: "boolean",
											default: true
										}
									}
								}
							}
						},
						lint: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: false
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										disallowDanglingUnderscores: {
											type: "boolean",
											default: true
										},
										disallowEmptyBlocks: {
											type: "boolean",
											default: true
										},
										disallowMultipleLineBreaks: {
											type: "boolean",
											default: true
										},
										disallowMultipleLineStrings: {
											type: "boolean",
											default: true
										},
										disallowMultipleSpaces: {
											type: "boolean",
											default: true
										},
										disallowMultipleVarDecl: {
											type: "boolean",
											default: true
										},
										disallowNewlineBeforeBlockStatements: {
											type: "boolean",
											default: true
										},
										disallowPaddingNewlinesInBlocks: {
											type: "boolean",
											default: true
										},
										disallowQuotedKeysInObjects: {
											type: "boolean",
											default: true
										},
										disallowSpaceAfterKeywords: {
											type: "array",
											default: [
												"if",
												"for",
												"while",
												"switch",
												"catch"
											],
											format: {
												type: "string",
												case: "lower",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"else",
														"for",
														"while",
														"do",
														"switch",
														"try",
														"catch"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS disallowSpaceAfterKeywords keyword: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										disallowSpaceAfterObjectKeys: {
											type: "boolean",
											default: true
										},
										disallowSpaceAfterPrefixUnaryOperators: {
											type: "array",
											default: [
												"++",
												"--",
												"~",
												"!"
											],
											format: {
												type: "string",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"++",
														"--",
														"+",
														"-",
														"~",
														"!"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS disallowSpaceAfterPrefixUnaryOperators operator: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										disallowSpaceBeforeBinaryOperators: {
											type: "array",
											default: [
												","
											],
											format: {
												type: "string",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"=",
														",",
														"+",
														"-",
														"/",
														"*",
														"==",
														"===",
														"!=",
														"!=="
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS disallowSpaceBeforeBinaryOperators operator: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										disallowSpaceBeforeComma: {
											type: "boolean",
											default: true
										},
										disallowSpaceBeforePostfixUnaryOperators: {
											type: "array",
											default: [
												"++",
												"--"
											],
											format: {
												type: "string",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"++",
														"--"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS disallowSpaceBeforePostfixUnaryOperators operator: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										disallowSpaceBeforeSemicolon: {
											type: "boolean",
											default: true
										},
										disallowSpacesInCallExpression: {
											type: "boolean",
											default: true
										},
										disallowSpacesInFunctionDeclaration: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean",
													default: true
												},
												beforeOpeningCurlyBrace: {
													type: "boolean"
												}
											}
										},
										disallowSpacesInFunctionExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean",
													default: true
												},
												beforeOpeningCurlyBrace: {
													type: "boolean"
												}
											}
										},
										disallowSpacesInNamedFunctionExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean",
													default: true
												},
												beforeOpeningCurlyBrace: {
													type: "boolean"
												}
											}
										},
										disallowSpacesInsideBrackets: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												allExcept: {
													type: "array",
													default: [
														"[",
														"]",
														"{",
														"}"
													],
													format: {
														type: "string",
														trim: true,
														nonEmpty: true,
														validator: function(value, format, options) {
															var validValues = [
																"[",
																"]",
																"{",
																"}"
															];

															var validValue = false;

															for(var i = 0; i < validValues.length; i++) {
																if(value === validValues[i]) {
																	validValue = true;
																	break;
																}
															}

															if(!validValue) {
																throw new Error("Invalid JSCS disallowSpacesInsideBrackets allExcept bracket type: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
															}

															return true;
														}
													}
												}
											}
										},
										disallowSpacesInsideParentheses: {
											type: "boolean",
											default: true
										},
										disallowSpacesInsideParenthesizedExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												allExcept: {
													type: "array",
													default: [
														"(",
														")"
													],
													format: {
														type: "string",
														case: "lower",
														trim: true,
														nonEmpty: true,
														validator: function(value, format, options) {
															var validValues = [
																"(",
																")",
																"{",
																"}",
																"function"
															];

															var validValue = false;

															for(var i = 0; i < validValues.length; i++) {
																if(value === validValues[i]) {
																	validValue = true;
																	break;
																}
															}

															if(!validValue) {
																throw new Error("Invalid JSCS disallowSpacesInsideParenthesizedExpression allExcept value: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
															}

															return true;
														}
													}
												}
											}
										},
										disallowTrailingComma: {
											type: "boolean",
											default: true
										},
										disallowTrailingWhitespace: {
											type: "boolean",
											default: true
										},
										disallowUnusedVariables: {
											type: "boolean",
											default: true
										},
										disallowYodaConditions: {
											type: "boolean",
											default: true
										},
										requireBlocksOnNewline: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												includeComments: {
													type: "boolean",
													default: true
												},
												minLines: {
													type: "integer",
													default: 1,
													validator: function(value, format, options) {
														return value >= 0;
													}
												}
											}
										},
										requireCamelCaseOrUpperCaseIdentifiers: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												ignoreProperties: {
													type: "boolean",
													default: true
												}
											}
										},
										requireCommaBeforeLineBreak: {
											type: "boolean",
											default: true
										},
										requireCurlyBraces: {
											type: "boolean",
											default: true
										},
										requireKeywordsOnNewLine: {
											type: "array",
											default: [
												"else",
												"catch"
											],
											format: {
												type: "string",
												case: "lower",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"else",
														"catch"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS requireKeywordsOnNewLine value: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										requireLineBreakAfterVariableAssignment: {
											type: "boolean",
											default: true
										},
										requireLineFeedAtFileEnd: {
											type: "boolean",
											default: true
										},
										requirePaddingNewLinesAfterUseStrict: {
											type: "boolean",
											default: true
										},
										requirePaddingNewLinesBeforeExport: {
											type: "boolean",
											default: true
										},
										requirePaddingNewlinesBeforeKeywords: {
											type: "array",
											default: [
												"do",
												"for",
												"if",
												"try"
											],
											format: {
												type: "string",
												case: "lower",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"do",
														"for",
														"else",
														"if",
														"try"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS requirePaddingNewlinesBeforeKeywords value: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										requireSemicolons: {
											type: "boolean",
											default: true
										},
										requireSpaceAfterBinaryOperators: {
											type: "array",
											default: [
												"=",
												",",
												"+",
												"-",
												"/",
												"*",
												"==",
												"===",
												"!=",
												"!=="
											],
											format: {
												type: "string",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"=",
														",",
														"+",
														"-",
														"/",
														"*",
														"==",
														"===",
														"!=",
														"!=="
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS requireSpaceAfterBinaryOperators operator: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										requireSpaceAfterComma: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												allExcept: {
													type: "array",
													default: [
														"trailing"
													],
													format: {
														type: "string",
														case: "lower",
														trim: true,
														nonEmpty: true,
														validator: function(value, format, options) {
															var validValues = [
																"trailing"
															];

															var validValue = false;

															for(var i = 0; i < validValues.length; i++) {
																if(value === validValues[i]) {
																	validValue = true;
																	break;
																}
															}

															if(!validValue) {
																throw new Error("Invalid JSCS requireSpaceAfterComma allExcept value: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
															}

															return true;
														}
													}
												}
											}
										},
										requireSpaceAfterKeywords: {
											type: "array",
											default: [
												"do",
												"else",
												"try",
												"return",
												"typeof"
											],
											format: {
												type: "string",
												case: "lower",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"do",
														"else",
														"try",
														"return",
														"typeof"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS requireSpaceAfterKeywords keyword: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										requireSpaceAfterLineComment: {
											type: "boolean",
											default: true
										},
										requireSpaceBeforeBinaryOperators: {
											type: "array",
											default: [
												"=",
												"+",
												"-",
												"/",
												"*",
												"==",
												"===",
												"!=",
												"!=="
											],
											format: {
												type: "string",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"=",
														"+",
														"-",
														"/",
														"*",
														"==",
														"===",
														"!=",
														"!=="
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS requireSpaceAfterKeywords keyword: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										requireSpaceBeforeBlockStatements: {
											type: "integer",
											default: 1,
											validator: function(value, format, options) {
												return value >= 0;
											}
										},
										requireSpaceBeforeKeywords: {
											type: "array",
											default: [
												"while"
											],
											format: {
												type: "string",
												case: "lower",
												trim: true,
												nonEmpty: true,
												validator: function(value, format, options) {
													var validValues = [
														"else",
														"while",
														"catch"
													];

													var validValue = false;

													for(var i = 0; i < validValues.length; i++) {
														if(value === validValues[i]) {
															validValue = true;
															break;
														}
													}

													if(!validValue) {
														throw new Error("Invalid JSCS requireSpaceBeforeKeywords keyword: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
													}

													return true;
												}
											}
										},
										requireSpaceBeforeObjectValues: {
											type: "boolean",
											default: true
										},
										requireSpaceBetweenArguments: {
											type: "boolean",
											default: true
										},
										requireSpacesInAnonymousFunctionExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean"
												},
												beforeOpeningCurlyBrace: {
													type: "boolean",
													default: true
												}
											}
										},
										requireSpacesInConditionalExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												afterTest: {
													type: "boolean",
													default: true
												},
												beforeConsequent: {
													type: "boolean",
													default: true
												},
												afterConsequent: {
													type: "boolean",
													default: true
												},
												beforeAlternate: {
													type: "boolean",
													default: true
												}
											}
										},
										requireSpacesInFunctionDeclaration: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean"
												},
												beforeOpeningCurlyBrace: {
													type: "boolean",
													default: true
												}
											}
										},
										requireSpacesInFunctionExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean"
												},
												beforeOpeningCurlyBrace: {
													type: "boolean",
													default: true
												}
											}
										},
										requireSpacesInFunction: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean"
												},
												beforeOpeningCurlyBrace: {
													type: "boolean",
													default: true
												}
											}
										},
										requireSpacesInNamedFunctionExpression: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												beforeOpeningRoundBrace: {
													type: "boolean"
												},
												beforeOpeningCurlyBrace: {
													type: "boolean",
													default: true
												}
											}
										},
										requireSpacesInsideObjectBrackets: {
											type: "string",
											case: "camel",
											trim: true,
											nonEmpty: true,
											default: "all",
											validator: function(value, format, options) {
												if(value !== "all" && value !== "allButNested") {
													throw new Error("Invalid JSCS requireSpacesInsideObjectBrackets value: \"" + value + "\" - expected all or allButNested.");
												}

												return true;
											}
										},
										safeContextKeyword: {
											type: "array",
											default: [
												"self"
											],
											format: {
												type: "string",
												case: "lower",
												trim: true,
												nonEmpty: true
											}
										},
										validateIndentation: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												value: {
													type: "string",
													trim: true,
													nonEmpty: true,
													default: "\t"
												},
												allExcept: {
													type: "array",
													nonEmpty: true,
													default: [
														"comments",
														"emptyLines"
													],
													format: {
														type: "string",
														case: "camel",
														trim: true,
														nonEmpty: true,
														validator: function(value, format, options) {
															var validValues = [
																"comments",
																"emptyLines"
															];

															var validValue = false;

															for(var i = 0; i < validValues.length; i++) {
																if(value === validValues[i]) {
																	validValue = true;
																	break;
																}
															}

															if(!validValue) {
																throw new Error("Invalid JSCS validateIndentation value: \"" + value + "\" - expected one of: " + validValues.join(", ") + ".");
															}

															return true;
														}
													}
												}
											}
										},
										validateLineBreaks: {
											type: "object",
											strict: true,
											autopopulate: true,
											removeExtra: true,
											format: {
												character: {
													type: "string",
													case: "upper",
													trim: true,
													nonEmpty: true,
													default: "LF",
													validator: function(value, format, options) {
														if(value !== "CR" && value !== "LF" && value !== "CRLF") {
															throw new Error("Invalid JSCS validateLineBreaks character value: \"" + value + "\" - expected CR, LF or CRLF.");
														}

														return true;
													}
												},
												reportOncePerFile: {
													type: "boolean",
													default: true
												}
											}
										},
										validateNewlineAfterArrayElements: {
											type: "boolean",
											default: true
										},
										validateParameterSeparator: {
											type: "string",
											trim: true,
											nonEmpty: true,
											default: ", "
										},
										validateQuoteMarks: {
											type: "string",
											trim: true,
											nonEmpty: true,
											default: "\"",
											validator: function(value, format, options) {
												if(value !== "\"" && value !== "'") {
													throw new Error("Invalid JSCS validateQuoteMarks value: \"" + value + "\" - expected \" or '.");
												}

												return true;
											}
										}
									}
								}
							}
						}
					}
				},
				html: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						source: {
							type: "array",
							default: ["src/**/*.html"],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						angular: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								cacheTemplates: {
									type: "boolean",
									default: true
								},
								templateRoot: {
									type: "string",
									trim: true,
									nonEmpty: true,
									default: "src"
								}
							}
						},
						stripComments: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										space: {
											type: "boolean",
											default: false
										},
										trim: {
											type: "boolean",
											default: true
										}
									}
								}
							}
						},
						lint: {
							type: "object",
							strict: true,
							removeExtra: true,
							autopopulate: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										"tagname-lowercase": {
											type: "boolean",
											default: true
										},
										"attr-lowercase": {
											type: "boolean",
											default: true
										},
										"attr-value-double-quotes": {
											type: "boolean",
											default: true
										},
										"attr-no-duplication": {
											type: "boolean",
											default: true
										},
										"doctype-first": {
											type: "boolean",
											default: false
										},
										"tag-pair": {
											type: "boolean",
											default: true
										},
										"spec-char-escape": {
											type: "boolean",
											default: true
										},
										"id-unique": {
											type: "boolean",
											default: true
										},
										"src-not-empty": {
											type: "boolean",
											default: true
										},
										"alt-require": {
											type: "boolean",
											default: true
										},
										"id-class-value": {
											type: "string",
											case: "lower",
											trim: true,
											nonEmpty: true,
											default: "dash",
											validator: function(value, format, options) {
												if(value !== "underline" && value !== "dash" && value !== "hump") {
													throw new Error("Invalid html hint id-class-value option: \"" + value + "\" - expected underline, dash or hump.");
												}

												return true;
											}
										},
										"style-disabled": {
											type: "boolean",
											default: true
										},
										"inline-style-disabled": {
											type: "boolean",
											default: true
										},
										"inline-script-disabled": {
											type: "boolean",
											default: true
										},
										"space-tab-mixed-disabled": {
											type: "boolean",
											default: true
										},
										"id-class-ad-disabled": {
											type: "boolean",
											default: true
										},
										"attr-unsafe-chars": {
											type: "boolean",
											default: true
										}
									}
								}
							}
						}
					}
				},
				scss: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						source: {
							type: "array",
							default: ["scss/**/*.scss", "scss/**/*.sass"],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						stripComments: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										ignore: {
											type: "regex",
											default: /url\([\w\s:\/=\-\+;,]*\)/g
										},
										space: {
											type: "boolean",
											default: false
										},
										trim: {
											type: "boolean",
											default: true
										}
									}
								}
							}
						},
						lint: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										formatter: {
											type: "string",
											case: "lower",
											trim: true,
											nonEmpty: true,
											default: "stylish"
										}
									}
								},
								rules: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										"attribute-quotes": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"border-zero": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ convention: "none" }
											]
										},
										"brace-style": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													style: "stroustrup",
													"allow-single-line": true
												}
											]
										},
										"class-name-format": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-leading-underscore": false,
													convention: "hyphenatedlowercase"
												}
											]
										},
										"clean-import-paths": {
											type: "integer",
											default: 0
										},
										"declarations-before-nesting": {
											type: "integer",
											default: 1
										},
										"empty-args": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: false }
											]
										},
										"empty-line-between-blocks": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													include: true,
													"allow-single-line-rulesets": true
												}
											]
										},
										"extends-before-declarations": {
											type: "integer",
											default: 1
										},
										"extends-before-mixins": {
											type: "integer",
											default: 1
										},
										"final-newline": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"force-attribute-nesting": {
											type: "integer",
											default: 0
										},
										"force-element-nesting": {
											type: "integer",
											default: 0
										},
										"force-pseudo-nesting": {
											type: "integer",
											default: 0
										},
										"function-name-format": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-leading-underscore": false,
													convention: "hyphenatedlowercase"
												}
											]
										},
										"hex-length": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ style: "long" }
											]
										},
										"hex-notation": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ style: "uppercase" }
											]
										},
										"id-name-format": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-leading-underscore": false,
													convention: "hyphenatedlowercase"
												}
											]
										},
										indentation: {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ size: "tab" }
											]
										},
										"leading-zero": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"mixin-name-format": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-leading-underscore": false,
													convention: "hyphenatedlowercase"
												}
											]
										},
										"nesting-depth": {
											type: "integer",
											default: 0
										},
										"no-color-keywords": {
											type: "integer",
											default: 0
										},
										"no-color-literals": {
											type: "integer",
											default: 0
										},
										"no-duplicate-properties": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												[]
											]
										},
										"no-empty-rulesets": {
											type: "integer",
											default: 0
										},
										"no-important": {
											type: "integer",
											default: 0
										},
										"no-invalid-hex": {
											type: "integer",
											default: 1
										},
										"no-misspelled-properties": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"extra-properties": [
														"border-radius-topleft",
														"border-radius-topright",
														"border-radius-bottomright",
														"border-radius-bottomleft",
														"flex-order",
														"flex-positive",
														"flex-negative",
														"flex-pack",
														"flex-line-pack",
														"flex-align",
														"flex-item-align",
														"flex-preferred-size"
													]
												}
											]
										},
										"no-qualifying-elements": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-element-with-attribute": true,
													"allow-element-with-class": true,
													"allow-element-with-id": true
												}
											]
										},
										"no-trailing-whitespace": {
											type: "integer",
											default: 1
										},
										"no-trailing-zero": {
											type: "integer",
											default: 1
										},
										"no-url-domains": {
											type: "integer",
											default: 1
										},
										"no-url-protocols": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ "allow-protocol-relative-urls": false }
											]
										},
										"no-vendor-prefixes": {
											type: "integer",
											default: 0
										},
										"one-declaration-per-line": {
											type: "integer",
											default: 1
										},
										"placeholder-name-format": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-leading-underscore": false,
													convention: "hyphenatedlowercase"
												}
											]
										},
										"property-sort-order": {
											type: "integer",
											default: 0
										},
										quotes: {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ style: "double" }
											]
										},
										"single-line-per-selector": {
											type: "integer",
											default: 1
										},
										"space-after-bang": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: false }
											]
										},
										"space-after-colon": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"space-after-comma": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"space-around-operator": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"space-before-bang": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"space-before-brace": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"space-before-colon": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: false }
											]
										},
										"space-between-parens": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: false }
											]
										},
										"trailing-semicolon": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{ include: true }
											]
										},
										"url-quotes": {
											type: "integer",
											default: 1
										},
										"variable-name-format": {
											type: "array",
											nonEmpty: true,
											default: [
												1,
												{
													"allow-leading-underscore": false,
													convention: "hyphenatedlowercase"
												}
											]
										},
										"zero-unit": {
											type: "array",
											nonEmpty: true,
											default: [
												0,
												{ include: true }
											]
										}
									}
								}
							}
						}
					}
				},
				less: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						source: {
							type: "array",
							default: ["less/**/*.less"],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						stripComments: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										ignore: {
											type: "regex",
											default: /url\([\w\s:\/=\-\+;,]*\)/g
										},
										space: {
											type: "boolean",
											default: false
										},
										trim: {
											type: "boolean",
											default: true
										}
									}
								}
							}
						},
						lint: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								reporter: {
									type: "string",
									trim: true,
									nonEmpty: true,
									default: "stylish"
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										maxWarnings: {
											type: "integer",
											validator: function(value, format, options) {
												if(!Number.isInteger(value)) {
													return true;
												}

												return value >= 0;
											}
										}
									}
								}
							}
						}
					}
				},
				css: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						source: {
							type: "array",
							default: [],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						destination: {
							type: "string",
							trim: true,
							nonEmpty: true,
							default: "dist/"
						},
						autoprefixer: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									default: { }
								}
							}
						},
						stripComments: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								options: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										ignore: {
											type: "regex",
											default: /url\([\w\s:\/=\-\+;,]*\)/g
										},
										space: {
											type: "boolean",
											default: false
										},
										trim: {
											type: "boolean",
											default: true
										}
									}
								}
							}
						}
					}
				},
				base: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						directory: {
							type: "string",
							trim: true,
							nonEmpty: true,
							required: true
						},
						source: {
							type: "string",
							trim: true,
							nonEmpty: true
						},
						destination: {
							type: "string",
							trim: true,
							nonEmpty: true
						}
					}
				},
				build: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						enabled: {
							type: "boolean",
							default: true
						},
						transformation: {
							type: "string",
							case: "lower",
							trim: true,
							nonEmpty: true,
							default: "node",
							formatter: function(value, format, options) {
								if(utilities.isEmptyString(value) || value === "none" || value === "disabled") {
									return null;
								}

								if(value === "nodejs" || value === "node.js") {
									return "node";
								}
								else if(value === "angularjs") {
									return "angular";
								}

								if(value !== "node" && value !== "angular") {
									throw new Error("Invalid or unsupported module transformation - expected Node.js, NodeJS, Node, AngularJS or Angular, received: \"" + value + "\".");
								}

								return value;
							}
						},
						namespace: {
							type: "string",
							case: "lower",
							trim: true,
							nonEmpty: true,
							formatter: function(value, format, options) {
								if(utilities.isEmptyString(value)) {
									return value;
								}

								return value.replace(/[:]+$/, "");
							}
						},
						tasks: {
							type: "array",
							default: ["js"],
							format: {
								type: "string",
								case: "lower",
								trim: true,
								nonEmpty: true,
								formatter: function(value, format, options) {
									if(value === "javascript") {
										value = "js";
									}

									if(value === "sass") {
										value = "scss";
									}

									if(value !== "js" && value !== "scss" && value !== "less" && value !== "css") {
										throw new Error("Invalid or unsupported task: \"" + value + "\" - expected javascript, js, scss, sass, less or css.");
									}

									return value;
								}
							}
						},
						prefix: {
							type: "string",
							trim: true,
							nonEmpty: true
						},
						stripComments: {
							type: "boolean",
							default: true
						},
						watch: {
							type: "boolean",
							default: true
						}
					}
				},
				lint: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						enabled: {
							type: "boolean",
							default: true
						}
					}
				},
				test: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						enabled: {
							type: "boolean",
							default: true
						},
						source: {
							type: "array",
							default: ["test/*.js"],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						reporter: {
							type: "string",
							trim: true,
							nonEmpty: true,
							default: "spec"
						}
					}
				},
				coverage: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						enabled: {
							type: "boolean",
							default: true
						}
					}
				},
				security: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						enabled: {
							type: "boolean",
							default: true
						}
					}
				}
			}
		},
		{
			throwErrors: true,
			verbose: true
		}
	);
};

fabricator.noop = function() {
	return through.obj();
};

function getContent(buffer) {
	if(utilities.isObject(buffer) && utilities.isValid(buffer.contents)) {
		return buffer.contents.toString();
	}
	else if(buffer instanceof Buffer) {
		return buffer.toString();
	}
	else if(typeof buffer === "string") {
		return buffer;
	}

	throw new Error("Could not retrieve content.");
}

function updateContent(buffer, content, encoding) {
	if(utilities.isObject(buffer) && utilities.isValid(buffer.contents)) {
		buffer.contents = new Buffer(content, encoding);

		return buffer;
	}
	else if(buffer instanceof Buffer) {
		return new Buffer(content, encoding);
	}

	return content;
}

var format = {
	transformation: {
		type: "object",
		strict: true,
		removeExtra: true,
		autopopulate: true,
		format: {
			encoding: {
				type: "string",
				trim: true,
				nonEmpty: true,
				default: "utf8"
			},
			indentation: {
				type: "string",
				trim: true,
				nonEmpty: true,
				default: "\t"
			},
			newLine: {
				type: "string",
				trim: true,
				nonEmpty: true,
				default: "\n"
			}
		}
	},
	transform: {
		type: "object",
		strict: true,
		autopopulate: true,
		format: {
			transformation: {
				type: "string",
				case: "camel",
				trim: true,
				nullable: true,
				validator: function(value, format, options) {
					if(utilities.isEmptyString(value) || value === "none") {
						return true;
					}

					return Object.keys(fabricator.transformation).includes(value);
				}
			}
		}
	}
};

fabricator.transformation = { };

fabricator.transformation.indentText = function(buffer, options) {
	options = utilities.formatValue(
		options,
		utilities.merge(
			format.transformation,
			{
				format: {
					amount: {
						type: "integer",
						default: 1,
						validator: function(value, format, options) {
							return value >= 0;
						}
					},
					clearEmptyLines: {
						type: "boolean",
						default: true
					}
				}
			}
		),
		{
			throwErrors: true
		}
	);

	return updateContent(
		buffer,
		utilities.indentText(getContent(buffer), options.amount, options.indentation, options.clearEmptyLines),
		formattedOptions.encoding
	);
};

fabricator.transformation.trimWhitespace = function(buffer, options) {
	options = utilities.formatValue(
		options,
		utilities.merge(
			format.transformation,
			{
				format: {
					trimNewlines: {
						type: "boolean",
						default: false
					}
				}
			}
		),
		{
			throwErrors: true
		}
	);

	return updateContent(
		buffer,
		utilities.trimWhitespace(getContent(buffer), options.trimNewlines),
		formattedOptions.encoding
	);
};

fabricator.transformation.function = function(buffer, options) {
	options = utilities.formatValue(
		options,
		format.transformation,
		{
			throwErrors: true
		}
	);

	return updateContent(
		buffer,
		"(function() {" + options.newLine +
		options.newLine +
		utilities.trimTrailingNewlines(utilities.indentText(getContent(buffer), 1, options.indentation)) + options.newLine +
		options.newLine +
		"})();" + options.newLine,
		formattedOptions.encoding
	);
};

fabricator.transformation.node = function(buffer, options) {
	options = utilities.formatValue(
		options,
		utilities.merge(
			format.transformation,
			{
				format: {
					name: {
						type: "string",
						case: "camel",
						trim: true,
						nonEmpty: true,
						required: true
					}
				}
			}
		),
		{
			throwErrors: true
		}
	);

	return updateContent(
		buffer,
		"(function(global, factory) {" + options.newLine +
		options.indentation + "typeof exports === \"object\" && typeof module !== \"undefined\" ? module.exports = factory() :" + options.newLine +
		options.indentation + "typeof define === \"function\" && define.amd ? define(factory) :" + options.newLine +
		options.indentation + "(global." + options.name + " = factory());" + options.newLine +
		"} (this, function() {" + options.newLine +
		options.newLine +
		options.indentation + "\"use strict\";" + options.newLine +
		options.newLine +
		utilities.trimTrailingNewlines(utilities.indentText(getContent(buffer), 1, options.indentation)) + options.newLine +
		options.newLine +
		"}));" + options.newLine,
		options.encoding
	);
};

fabricator.transformation.angular = function(buffer, options) {
	options = utilities.formatValue(
		options,
		format.transformation,
		{
			throwErrors: true
		}
	);

	return updateContent(
		buffer,
		"(function(root, factory) {" + options.newLine +
		options.indentation + "if(typeof define === \"function\" && define.amd) { define([\"angular\"], factory); }" + options.newLine +
		options.indentation + "else { factory(angular); }" + options.newLine +
		"}(this, function(angular) {" + options.newLine +
		options.newLine +
		options.indentation + "\"use strict\";" + options.newLine +
		options.newLine +
		utilities.trimTrailingNewlines(utilities.indentParagraph(getContent(buffer), 1, options.indentation)) + options.newLine +
		options.newLine +
		"}));" + options.newLine,
		formattedOptions.encoding
	);
};

fabricator.transform = function(options) {
	options = utilities.formatValue(
		options,
		format.transform,
		{
			throwErrors: true
		}
	);

	return through.obj(function(file, encoding, callback) {
		if(file.isNull()) {
			return callback(null, file);
		}

		if(file.isStream()) {
			return callback(new PluginError("fabricator", "Streaming is not supported."));
		}

		if(utilities.isNonEmptyString(options.transformation) && utilities.isFunction(fabricator.transformation[options.transformation])) {
			try {
				fabricator.transformation[options.transformation](
					file,
					utilities.merge(
						options,
						{
							encoding: encoding
						}
					)
				);
			}
			catch(error) {
				return callback(new PluginError("fabricator", error.message));
			}
		}

		return callback(null, file);
	});
};

module.exports = fabricator;
