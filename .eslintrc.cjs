/* .eslintrc.cjs */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'unused-imports', 'import', 'next'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Keep these as ERRORS (real bugs)
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn', // keep as warn

    // Tone down the noise so you can ship
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    'unused-imports/no-unused-imports': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    '@next/next/no-html-link-for-pages': 'warn',
    '@next/next/no-img-element': 'warn',
  },
  overrides: [
    {
      files: ['pages/api/**/*', 'lib/**/*'],
      rules: {
        // APIs often need broader shapes during MVP
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
