import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { paginasModelos } from '../scripts/portal-modelos.mjs';
import { MODELOS_V2 } from '../src/dados/modelos-v2.js';
import manifesto from '../src/dados/biblioteca-pcm-v2.json';

describe('catálogo público independente do app', () => {
  it('gera catálogo e 19 páginas com conteúdo real e download original sem JavaScript', () => {
    const paginas = paginasModelos();
    expect(paginas.size).toBe(20);
    const catalogo = paginas.get('modelos/index.html');
    expect(catalogo.match(/data-modelo="/g)).toHaveLength(19);
    for (const m of MODELOS_V2) {
      const html = paginas.get(`modelos/${m.codigo.toLowerCase()}/index.html`);
      expect(html).toContain(`<h1>${m.titulo}</h1>`);
      expect(html).toContain(`href="../../${m.url.slice(2)}" download`);
      expect(html).toContain(`https://pcmdireto.me/modelos/${m.codigo.toLowerCase()}/`);
      expect(html).not.toContain('<script');
      for (const aba of m.abas) expect(html).toContain(aba.replace(/&/g, '&amp;'));
      const dados = manifesto.modelos.find(x => x.codigo === m.codigo);
      expect(createHash('sha256').update(readFileSync('public/' + dados.url)).digest('hex')).toBe(dados.sha256);
    }
  });
});
