module.exports = {
    env: {
        es6: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:node/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    plugins: [
        'json',
        'node',
    ],
    root: true,
    rules: {
        'node/no-unsupported-features/es-syntax': 'off', // Because we use Babel

        'eqeqeq': 'error',
        'indent': ['error', 4],
        'no-console': 'warn',
        'quotes': ['error', 'single'],
    },
};
