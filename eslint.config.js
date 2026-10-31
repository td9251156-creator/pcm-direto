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
      ecmaVersion: 2025, // atributos de importação (`with { type: 'json' }`) em src/logica/operacao.js
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
