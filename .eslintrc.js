module.exports = {
    env: {
        node: true,
        mocha: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:node/recommended',
    ],
    plugins: [
        'json',
        'node',
        'mocha',
    ],
    root: true,
    rules: {
        // Disabled
        'node/no-unpublished-require': 0,

        // Errors
        'eqeqeq': 'error',

        // Warnings
        'no-console': 'warn',

        // Stylistic warnings
        'quotes': ['warn', 'single', { avoidEscape: true }],
        'indent': ['warn', 4, { SwitchCase: 1 }],
    },
};
