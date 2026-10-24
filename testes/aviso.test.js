import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AVISO } from '../src/logica/pacote.js';

// O aviso fica no rodapé fixo da página (fora da área que troca de tela), então aparece em todas.
describe('aviso permanente', () => {
  it('está no rodapé da página, fora da área que troca de tela', () => {
    const html = readFileSync('index.html', 'utf8');
    const rodape = html.slice(html.indexOf('<footer'));
    const texto = rodape.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(texto).toContain(AVISO);
  });
});
