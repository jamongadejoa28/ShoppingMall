module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      'prettier',
    ],
    rules: {
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
    },
    env: {
      node: true,
      es2020: true,
      jest: true,
    },
    overrides: [
      {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        rules: {
          'no-console': 'off',
          '@typescript-eslint/no-explicit-any': 'off',
        },
      },
    ],
  };