const fabricator = require("./src/fabricator");

fabricator.setup({
	name: "Gulp Fabricator",
	build: {
		enabled: false
	},
	base: {
		directory: __dirname
	}
});
