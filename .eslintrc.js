module.exports = {
    env: {
        node: true,
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
        'indent': ['warn', 4],
    },
};
