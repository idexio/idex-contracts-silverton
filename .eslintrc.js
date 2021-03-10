module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  globals: { BigInt: true },
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    // cant handle Category$Name at the moment, although
    // pascal case should be enforced.
    '@typescript-eslint/class-name-casing': 'off',
    // neeeded during development in many cases and db migrations
    '@typescript-eslint/no-empty-function': 'off',
    'class-methods-use-this': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'consistent-return': 'off',
    curly: ['error', 'all'],
    camelcase: 'off',
    'no-restricted-syntax': 'off',
    'func-names': ['error', 'as-needed'],
    'no-multi-assign': 'off',
    'no-use-before-define': 'off',
    'no-console': 'error',
    'no-underscore-dangle': 'off',
    'no-useless-constructor': 'off',
    'import/export': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['dev/**', 'tests/**/*'] },
    ],
    'prettier/prettier': 'error',
    quotes: ['error', 'single', { avoidEscape: true }],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
  },
  plugins: ['import', 'promise', 'prettier', '@typescript-eslint'],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        directory: [
          './tsconfig.json',
        ],
      },
    },
  },
};
