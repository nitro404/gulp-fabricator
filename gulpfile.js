var fabricator = require("./src/fabricator");

fabricator.setup({
	name: "Fabricator",
	build: {
		transformation: "none"
	},
	base: {
		directory: __dirname
	}
});
