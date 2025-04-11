module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleFileExtensions: ["ts", "js", "json"],
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
			},
		],
	},
	testMatch: ["**/tests/**/*.test.ts"],
	collectCoverage: true,
	coverageDirectory: "coverage",
	collectCoverageFrom: [
		"**/*.ts",
		"!**/*.d.ts",
		"!**/node_modules/**",
		"!jest.config.js",
	],
};
