import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AVISO } from '../src/logica/pacote.js';

// Regra 4 do produto: o aviso fica fora das telas (no esqueleto da página), então aparece em todas.
describe('aviso permanente', () => {
  it('está no esqueleto da página, fora da área que troca de tela', () => {
    const html = readFileSync('index.html', 'utf8');
    const antesDoConteudo = html.slice(0, html.indexOf('<main'));
    const texto = antesDoConteudo.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(texto).toContain(AVISO);
  });
});
