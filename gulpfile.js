var fabricator = require("./src/fabricator");

fabricator.setup({
	name: "Gulp Fabricator",
	build: {
		fileName: "fabricator",
		transformation: "none"
	},
	base: {
		directory: __dirname
	}
});
