import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['supabase/functions/**/index.js'],
    languageOptions: { globals: { Deno: 'readonly' } },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // O service worker roda em um contexto próprio do navegador
    files: ['src/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
];
