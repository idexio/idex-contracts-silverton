module.exports = {
  env: {
    mocha: true
  },
  rules: {
    'func-names': 'off', // dont require function names for tests
    'import/no-extraneous-dependencies': 'off',
    'no-unused-expressions': 'off',
    'no-await-in-loop': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/prefer-ts-expect-error': 'error'
  },
};
