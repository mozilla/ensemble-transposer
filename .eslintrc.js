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
    ],
    root: true,
    rules: {
        // Errors
        'eqeqeq': 'error',

        // Warnings
        'no-console': 'warn',

        // Stylistic warnings
        'quotes': ['warn', 'single', { avoidEscape: true }],
        'indent': ['warn', 4, { SwitchCase: 1 }],
    },
    overrides: [{
        files: 'tests/*',
        rules: {
            "node/no-unpublished-require": 0,
        },
    }],
};
