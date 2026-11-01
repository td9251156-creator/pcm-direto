import { it, expect } from 'vitest';
import { gerarQr, qrSvg, reedSolomon } from '../src/logica/qr.js';

it('Reed-Solomon confere com o vetor publicado ("HELLO WORLD", versão 1-M)', () => {
  expect(reedSolomon([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], 10))
    .toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

it('escolhe a menor versão, desenha localizadores, sincronismo e módulo escuro fixo', () => {
  for (const [texto, versao] of [['A', 1], ['x'.repeat(14), 1], ['x'.repeat(15), 2], ['x'.repeat(42), 3], ['x'.repeat(62), 4], ['x'.repeat(106), 6]]) {
    const m = gerarQr(texto); const n = versao * 4 + 17;
    expect(m.length, texto.length + ' car.').toBe(n);
    // Localizador 7×7: borda escura, anel claro, centro 3×3 escuro (nos três cantos).
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      expect(m[cy - 3][cx - 3]).toBe(true); expect(m[cy - 2][cx - 2]).toBe(false); expect(m[cy][cx]).toBe(true);
    }
    for (let i = 8; i < n - 8; i++) { expect(m[6][i]).toBe(i % 2 === 0); expect(m[i][6]).toBe(i % 2 === 0); }
    expect(m[n - 8][8]).toBe(true);
  }
});

it('grava a informação de formato com nível M e a mesma máscara nas duas cópias', () => {
  const m = gerarQr('https://pcmdireto.me/#ativos?ativo=ex0'); const n = m.length;
  const b = (x, y) => (m[y][x] ? 1 : 0);
  const copia1 = [0, 1, 2, 3, 4, 5].map((i) => b(8, i)).concat([b(8, 7), b(8, 8), b(7, 8)], [9, 10, 11, 12, 13, 14].map((i) => b(14 - i, 8)));
  const copia2 = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => b(n - 1 - i, 8)).concat([8, 9, 10, 11, 12, 13, 14].map((i) => b(8, n - 15 + i)));
  expect(copia1).toEqual(copia2);
  const valor = copia1.reduce((s, bit, i) => s | (bit << i), 0) ^ 0x5412;
  expect(valor >>> 13).toBe(0); // nível M = 00
  expect((valor >>> 10) & 7).toBeLessThan(8);
});

it('recusa texto longo demais e gera SVG com margem e só módulos', () => {
  expect(() => gerarQr('x'.repeat(107))).toThrow('longo demais');
  const svg = qrSvg('TST-BOM-001', 4);
  expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 29 29"/); // 21 módulos + 2 × 4 de margem
  expect(svg).not.toMatch(/TST-BOM-001|script/);
});
