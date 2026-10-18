import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MARCA } from '../src/marca.js';

// As cores da marca aparecem em arquivos que não conseguem importar src/marca.js.
// Este teste avisa se alguém trocar a cor em um lugar e esquecer outro.
describe('cores da marca', () => {
  const p = '#' + MARCA.primaria.toLowerCase();
  it('estilo.css usa as mesmas cores', () => {
    const css = readFileSync('src/estilo.css', 'utf8').toLowerCase();
    expect(css).toContain(`--primaria: ${p}`);
    expect(css).toContain(`--destaque: #${MARCA.destaque.toLowerCase()}`);
  });
  it('index.html e manifesto usam a cor primária', () => {
    expect(readFileSync('index.html', 'utf8').toLowerCase()).toContain(`name="theme-color" content="${p}"`);
    expect(JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')).theme_color.toLowerCase()).toBe(p);
  });
});
