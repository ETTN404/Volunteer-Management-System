import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', '_legacy', 'public/mockServiceWorker.js', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Architecture boundary: features must not import pages, shared must not import features.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/pages/*'], message: 'Only the router may import pages.' }] },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/features/*', '@/pages/*', '@/app/*'], message: 'shared/ must stay dependency-free.' }] },
      ],
    },
  },
  {
    files: ['src/app/router/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
