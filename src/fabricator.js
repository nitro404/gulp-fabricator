"use strict";

const gulp = require("gulp");
const rename = require("gulp-rename");
const filter = require("gulp-filter");
const concat = require("gulp-concat");
const stripComments = require("gulp-strip-comments");
const sourcemaps = require("gulp-sourcemaps");
const babel = require("gulp-babel");
const uglifyJS = require("uglify-js");
const uglifyComposer = require("gulp-uglify/composer");
const jsdoc = require("gulp-jsdoc3");
const sass = require("gulp-sass");
const sassLint = require("gulp-sass-lint");
const less = require("gulp-less");
const lessHint = require("gulp-lesshint");
const htmlHint = require("gulp-htmlhint");
const cleanCSS = require("gulp-clean-css");
const postCSS = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const pump = require("pump");
const isValidGlob = require("is-valid-glob");
const mergeStream = require("merge-stream");
const through = require("through2");
const fancyLog = require("fancy-log");
const utilities = require("extra-utilities");
const changeCase = require("change-case-bundled");
const path = require("path-extra");
const colors = require("colors");
const PluginError = require("plugin-error");

const fabricator = { };

fabricator.log = function logDebug(message) {
	return function() {
		fancyLog(message);

		return through.obj();
	}();
};

fabricator.log.info = function logWarning(message) {
	return function() {
		fancyLog.error(colors.brightBlue("INFO:", message));

		return through.obj();
	}();
};

fabricator.log.warn = function logWarning(message) {
	return function() {
		fancyLog.error(colors.brightYellow("WARNING:", message));

		return through.obj();
	}();
};

fabricator.log.error = function logError(message) {
	return function() {
		fancyLog.error(colors.red("ERROR:", message));

		return through.obj();
	}();
};

fabricator.globSource = function globSource(glob, options) {
	return gulp.src(isValidGlob(glob) ? glob : " ", utilities.merge({ allowEmpty: true }, options));
};

fabricator.noop = function noop() {
	return through.obj();
};

fabricator.noopTask = function noopTask(callback) {
	return callback();
};

function tasksOrNoop(tasks, executionType) {
	if(executionType !== "series" && executionType !== "parallel") {
		throw new Error("Invalid execution type, expected 'series' or 'parallel'.");
	}

	if(utilities.isNonEmptyString(tasks)) {
		tasks = [tasks];
	}

	return utilities.isEmptyArray(tasks) ? fabricator.noopTask : gulp[executionType](...tasks);
}

fabricator.seriesTasks = function seriesTasks(tasks) {
	return tasksOrNoop(tasks, "series");
};

fabricator.parallelTasks = function parallelTasks(callback) {
	return tasksOrNoop(tasks, "parallel");
};

fabricator.setup = function setup(options) {
	options = fabricator.formatOptions(options);

	fabricator.config = options;

	function namespace(value) {
		if(utilities.isEmptyString(value)) {
			return value;
		}

		return (utilities.isEmptyString(options.namespace) ? "" : options.namespace + ":") + value.trim().replace(/^[:]+/, "");
	}

	const tasks = {
		build: [],
		lint: [],
		docs: [],
		watch: [],
		default: []
	};

	if(options.build.tasks.includes("js")) {
		if(options.build.enabled) {
			gulp.task(namespace("build:js"), function(callback) {
				pump([
					fabricator.globSource(options.js.source).on("error", fancyLog.error)
					.pipe(options.build.bundle
						? concat((utilities.isEmptyString(options.build.prefix) ? "" : options.build.prefix) + options.build.fileName + ".js").on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.type === "module"
						? fabricator.transform({
							transformation: options.build.transformation,
							name: options.build.exportName
						}).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.build.stripComments.enabled && options.js.stripComments.enabled
						? stripComments(options.js.stripComments.options).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.js.sourcemaps.enabled && options.js.sourcemaps.postCompile
						? sourcemaps.init().on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.js.babel.enabled
						? babel({
							presets: options.js.babel.presets
						}).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.js.sourcemaps.enabled && options.js.sourcemaps.postCompile
						? sourcemaps.write(options.js.sourcemaps.embed
							? undefined
							: options.js.sourcemaps.destination).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(gulp.dest(options.js.destination).on("error", fancyLog.error))
					.pipe(options.js.sourcemaps.enabled && options.js.sourcemaps.postCompile
						? filter(function(file) {
							const fileName = utilities.getFileName(file.path);

							if(utilities.isNonEmptyString(fileName) && fileName.indexOf(".map") !== -1) {
								return false;
							}

							return true;
						}).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.js.minify
						? rename({ extname: ".min.js" }).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.js.minify && options.js.sourcemaps.enabled && options.js.sourcemaps.postMinify
						? sourcemaps.init().on("error", fancyLog.error)
						: fabricator.noop()),
					options.js.minify
						? uglifyComposer(uglifyJS, console)({ mangle: false }).on("error", fancyLog.error)
						: fabricator.noop(),
					fabricator.noop()
					.pipe(options.js.minify && options.js.sourcemaps.enabled && options.js.sourcemaps.postMinify
						? sourcemaps.write(options.js.sourcemaps.embed
							? undefined
							: options.js.sourcemaps.destination).on("error", fancyLog.error)
						: fabricator.noop()),
					options.js.minify
						? gulp.dest(options.js.destination).on("error", fancyLog.error)
						: fabricator.noop()
				], callback);
			});

			tasks.build.push(namespace("build:js"));
		}

		if(options.lint.enabled && options.js.lint.enabled) {
			gulp.task(namespace("lint:js"), function(callback) {
				fancyLog.warn("WARNING: JavaScript linting is not currently supported!".brightYellow);

				return callback();
			});

			tasks.lint.push(namespace("lint:js"));
		}

		if(options.js.docs.enabled) {
			gulp.task(namespace("docs:js"), function(callback) {
				fabricator.globSource(options.js.source, { read: false }).on("error", fancyLog.error)
					.pipe(jsdoc(utilities.merge(options.js.docs.config, { opts: { destination: options.js.docs.destination } }), callback).on("error", fancyLog.error));
			});

			tasks.docs.push(namespace("docs:js"));
		}

		if(options.lint.enabled && options.html.lint.enabled) {
			gulp.task(namespace("lint:html"), function() {
				fabricator.globSource(options.html.source).on("error", fancyLog.error)
					.pipe(htmlHint(options.html.lint.options).on("error", fancyLog.error))
					.pipe(htmlHint.reporter().on("error", fancyLog.error));
			});

			tasks.lint.push(namespace("lint:html"));
		}
	}

	if(options.build.tasks.includes("scss") || options.build.tasks.includes("less") || options.build.tasks.includes("css")) {
		if(options.build.enabled) {
			gulp.task(namespace("build:css"), function(callback) {
				mergeStream(
					fabricator.globSource(options.css.source).on("error", fancyLog.error),
					options.build.tasks.includes("scss")
						? gulp.src(options.scss.source).on("error", fancyLog.error)
							.pipe(options.build.stripComments.enabled && options.scss.stripComments.enabled
								? stripComments(options.scss.stripComments.options).on("error", fancyLog.error)
								: fabricator.noop())
							.pipe(sass().on("error", sass.logError))
						: fabricator.globSource([]),
					options.build.tasks.includes("less")
						? fabricator.globSource(options.less.source).on("error", fancyLog.error)
							.pipe(options.build.stripComments.enabled && options.less.stripComments.enabled
								? stripComments(options.less.stripComments.options).on("error", fancyLog.error)
								: fabricator.noop())
							.pipe(less())
						: fabricator.globSource([]).on("error", fancyLog.error))
					.pipe(rename({ prefix: utilities.isEmptyString(options.build.prefix) ? "" : options.build.prefix }).on("error", fancyLog.error))
					.pipe(options.css.autoprefixer.enabled
						? postCSS([autoprefixer(options.css.autoprefixer.options)]).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.build.stripComments.enabled && options.css.stripComments.enabled
						? stripComments(options.css.stripComments.options).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(gulp.dest(options.css.destination).on("error", fancyLog.error))
					.pipe(options.css.minify
						? cleanCSS().on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.css.minify
						? rename({ extname: ".min.css" }).on("error", fancyLog.error)
						: fabricator.noop())
					.pipe(options.css.minify
						? gulp.dest(options.css.destination).on("error", fancyLog.error)
						: fabricator.noop())
					.on("end", callback);
			});

			tasks.build.push(namespace("build:css"));
		}

		if(options.lint.enabled && options.scss.lint.enabled) {
			gulp.task(namespace("lint:scss"), function() {
				fabricator.globSource(options.scss.source).on("error", fancyLog.error)
					.pipe(sassLint(options.scss.lint))
					.pipe(sassLint.format())
					.pipe(sassLint.failOnError());
			});

			tasks.lint.push(namespace("lint:scss"));
		}

		if(options.lint.enabled && options.less.lint.enabled) {
			gulp.task(namespace("lint:less"), function() {
				fabricator.globSource(options.less.source).on("error", fancyLog.error)
					.pipe(lessHint(options.less.lint.options))
					.pipe(lessHint.reporter(options.less.lint.reporter))
					.pipe(lessHint.failOnError());
			});

			tasks.lint.push(namespace("lint:less"));
		}
	}

	gulp.task(namespace("watch:main"), function(callback) {
		if(options.build.tasks.includes("js") && options.build.enabled) {
			gulp.watch(options.js.source, fabricator.seriesTasks(namespace("build:js")));
		}

		if(options.build.tasks.includes("scss") && options.build.enabled) {
			gulp.watch(options.scss.source, fabricator.seriesTasks(namespace("build:css")));
		}

		if(options.build.tasks.includes("less") && options.build.enabled) {
			gulp.watch(options.less.source, fabricator.seriesTasks(namespace("build:css")));
		}

		if(options.build.tasks.includes("css") && options.build.enabled) {
			gulp.watch(options.css.source, fabricator.seriesTasks(namespace("build:css")));
		}

		return callback();
	});

	tasks.watch.push(namespace("watch:main"));

	if(options.build.watch) {
		tasks.default.push("watch");
	}

	tasks.default.push(namespace("build"), namespace("lint"), namespace("docs"));

	const additionalTaskTypes = Object.keys(options.additionalTasks);

	for(let i = 0; i < additionalTaskTypes.length; i++) {
		const additionalTaskType = additionalTaskTypes[i];

		tasks[additionalTaskType].push(...options.additionalTasks[additionalTaskType]);
	}

	gulp.task(namespace("build"), fabricator.seriesTasks(tasks.build));
	gulp.task(namespace("lint"), fabricator.seriesTasks(tasks.lint));
	gulp.task(namespace("docs"), fabricator.seriesTasks(tasks.docs));
	gulp.task(namespace("watch"), fabricator.seriesTasks(tasks.watch));
	gulp.task(namespace("default"), fabricator.seriesTasks(tasks.default));
};

fabricator.formatOptions = function formatOptions(options) {
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
				if(utilities.isEmptyString(value.build.fileName)) {
					value.build.fileName = changeCase.paramCase(value.name);
				}

				if(utilities.isEmptyString(value.build.exportName)) {
					value.build.exportName = changeCase.camelCase(value.name);
				}

				for(let fileType in ["js", "html", "scss", "less", "css"]) {
					const config = value[fileType];

					for(let locationType in ["source, destination"]) {
						const baseLocation = value.base[locationType];

						if(utilities.isEmptyString(baseLocation)) {
							continue;
						}

						const location = config[locationType];

						if(utilities.isNonEmptyString(location)) {
							config[locationType] = path.join(baseLocation, location);
						}
						else if(utilities.isNonEmptyArray()) {
							const formattedLocation = [];

							for(let i = 0; i < location.length; i++) {
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
						bundle: {
							type: "boolean",
							default: true
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
						babel: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: false
								},
								presets: {
									type: "array",
									nonEmpty: true,
									default: ["@babel/env"],
									format: {
										type: "string",
										trim: true,
										nonEmpty: true,
									}
								}
							}
						},
						sourcemaps: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: true
								},
								embed: {
									type: "boolean",
									default: false
								},
								destination: {
									type: "string",
									default: "."
								},
								postCompile: {
									type: "boolean",
									default: true
								},
								postMinify: {
									type: "boolean",
									default: true
								}
							}
						},
						minify: {
							type: "boolean",
							default: true
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
								}
							}
						},
						docs: {
							type: "object",
							strict: true,
							autopopulate: true,
							removeExtra: true,
							format: {
								enabled: {
									type: "boolean",
									default: false
								},
								destination: {
									type: "string",
									trim: true,
									nonEmpty: true,
									case: "lower",
									default: "docs/"
								},
								config: {
									type: "object",
									strict: true,
									autopopulate: true,
									format: {
										tags: {
											type: "object",
											strict: true,
											autopopulate: true,
											format: {
												allowUnknownTags: {
													type: "boolean",
													default: true
												}
											}
										},
										plugins: {
											type: "array",
											autopopulate: true,
											format: {
												type: "string",
												trim: true,
												nonEmpty: true,
												case: "lower",
												default: "cerulean"
											},
											default: ["plugins/markdown"]
										},
										templates: {
											type: "object",
											strict: true,
											autopopulate: true,
											format: {
												cleverLinks: {
													type: "boolean",
													default: false
												},
												monospaceLinks: {
													type: "boolean",
													default: false
												},
												default: {
													type: "object",
													strict: true,
													autopopulate: true,
													format: {
														outputSourceFiles: {
															type: "boolean",
															default: true
														}
													}
												},
												path: {
													type: "string",
													trim: true,
													nonEmpty: true,
													case: "lower",
													default: "ink-docstrap"
												},
												theme: {
													type: "string",
													trim: true,
													nonEmpty: true,
													case: "lower",
													default: "cerulean"
												},
												navType: {
													type: "string",
													trim: true,
													nonEmpty: true,
													case: "lower",
													default: "vertical"
												},
												linenums: {
													type: "boolean",
													default: true
												},
												dateFormat: {
													type: "string",
													trim: true,
													nonEmpty: true,
													default: "MMMM Do YYYY, h:mm:ss a"
												}
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
									default: false
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
						},
						minify: {
							type: "boolean",
							default: true
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
						fileName: {
							type: "string",
							case: "param",
							trim: true,
							nonEmpty: true
						},
						exportName: {
							type: "string",
							case: "camel",
							trim: true,
							nonEmpty: true
						},
						transformation: {
							type: "string",
							case: "lower",
							trim: true,
							nonEmpty: true,
							default: "umd",
							formatter: function(value, format, options) {
								if(utilities.isEmptyString(value) || value === "none" || value === "disabled") {
									return null;
								}

								if(value !== "umd") {
									throw new Error("Invalid or unsupported module transformation - expected UMD, received: \"" + value + "\".");
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
				additionalTasks: {
					type: "object",
					strict: true,
					autopopulate: true,
					removeExtra: true,
					format: {
						build: {
							type: "array",
							default: [],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						lint: {
							type: "array",
							default: [],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						watch: {
							type: "array",
							default: [],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
						},
						default: {
							type: "array",
							default: [],
							format: {
								type: "string",
								trim: true,
								nonEmpty: true
							}
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

const format = {
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

function replaceModuleExportWithReturn(text) {
	if(typeof text !== "string") {
		return null;
	}

	return text.replace("module.exports =", "return");
};

fabricator.transformation = { };

fabricator.transformation.indentText = function indentText(buffer, options) {
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
		options.encoding
	);
};

fabricator.transformation.trimWhitespace = function trimWhitespace(buffer, options) {
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
		options.encoding
	);
};

fabricator.transformation.iife = function iife(buffer, options) {
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
		options.encoding
	);
};

fabricator.transformation.umd = function umd(buffer, options) {
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
		utilities.trimTrailingNewlines(utilities.indentText(replaceModuleExportWithReturn(getContent(buffer)), 1, options.indentation)) + options.newLine +
		options.newLine +
		"}));" + options.newLine,
		options.encoding
	);
};

fabricator.transform = function transform(options) {
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
