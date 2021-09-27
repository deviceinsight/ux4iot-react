module.exports = {
	env: {
		es6: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
		'react-app',
		'react-app/jest',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 11,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint', 'prettier', 'react-hooks'],
	ignorePatterns: ['dist/**/*.js'],
	rules: {
		indent: 'off',
		'linebreak-style': ['error', 'unix'],
		semi: ['error', 'always'],
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'no-debugger': 'warn',
		'react-hooks/rules-of-hooks': 'error', // Checks effect dependencies
		'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
	},
};
