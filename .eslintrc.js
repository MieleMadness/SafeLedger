module.exports = {
  env: {
    browser: true,
    node: true,
    commonjs: true,
    es6: true
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:sonarjs/recommended',
    'prettier' 
  ],
  plugins: [
    'prettier',
    'sonarjs'
  ],
  rules: {
    // 'prettier/prettier': 'off', // off, error
    'sonarjs/cognitive-complexity': ['error', 30],
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unsupported-features/node-builtins': 'off',
    'quote-props': ['error', 'consistent-as-needed'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    'semi': ['error', 'always'], // we want to force semicolons
    'indent': ['error', 2], // we use 2 spaces to indent our code
    'no-multi-spaces': ['error'], // we want to avoid extraneous spaces
    'no-unused-vars': ['error', { args: 'none' }],
    'object-curly-spacing': ['error', 'always'],
    // 'no-console': 'off',
    'no-continue': 'off',
    'func-names': 'off',
    'no-process-exit': 'off',
    'object-shorthand': 'off',
    'class-methods-use-this': 'off',
    'import/no-dynamic-require': 'off', // sometimes dynamic require is needed in a function
    'global-require': 'off', // sometimes dynamic require is needed in a function
    'no-use-before-define': 'off',
    'dot-notation': 'off',
    'no-else-return': 'off',
    'no-restricted-syntax': 'off', // needed to use for loop with await
    'no-await-in-loop': 'off', // needed to call await inside for loop
  }
};