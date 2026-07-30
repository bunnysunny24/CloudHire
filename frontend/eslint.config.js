export default [
  {
    ignores: ['node_modules', 'dist']
  },
  {
    files: ['src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        document: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        crypto: 'readonly',
        FormData: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'error'
    }
  }
];
