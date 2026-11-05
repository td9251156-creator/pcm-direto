import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { criacaoVazia, normalizarCriacao, validarCriacao } from '../src/logica/criador-piloto.js';
import { gerarCriacaoXlsx } from '../src/saida/criador-piloto-xlsx.js';

const buscarLocal = async (url) => {
  const bytes = await readFile(new URL('../public/criar/' + url.replace('./', ''), import.meta.url));
  return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
};
const xmlAba = async (bytes, numero) => (await JSZip.loadAsync(bytes)).file(`xl/worksheets/sheet${numero}.xml`).async('string');

describe('criador local de materiais', () => {
  it('recusa um rascunho externo incompatível e limita conteúdo ao contrato do piloto', () => {
    expect(() => normalizarCriacao({ esquema: 'outro', versao: 1 })).toThrow(/compatível/);
    const c = criacaoVazia('PCM-MAN-005');
    c.dados.titulo = 'Minha checklist'; c.dados.itens = Array.from({ length: 35 }, (_, i) => `Item ${i + 1}`);
    const n = normalizarCriacao(c);
    expect(n.dados.itens).toHaveLength(30);
    expect(validarCriacao(n).ok).toBe(true);
  });

  it('gera o 005 a partir da cópia R01 e grava somente a checklist informada', async () => {
    const c = criacaoVazia('PCM-MAN-005');
    Object.assign(c.dados, { titulo: 'Checklist teste', tag: 'TAG-01', equipamento: 'Prensa', itens: ['Verificar óleo', 'Testar proteção'] });
    const bytes = await gerarCriacaoXlsx(c, buscarLocal);
    expect(await xmlAba(bytes, 1)).toContain('Checklist teste');
    const xml = await xmlAba(bytes, 2);
    expect(xml).toContain('TAG-01').toContain('Verificar óleo').toContain('Testar proteção');
    expect(xml).not.toContain('Estado geral sem dano');
    expect(xml).toContain('COUNTA(B14:B18)').not.toContain('de 30');
  });

  it('gera o POP com passos, ponto-chave, tempo e marcação crítica', async () => {
    const c = criacaoVazia('PCM-MAN-016');
    Object.assign(c.dados, { titulo: 'Trocar filtro', numero: 'POP-01', passos: [{ acao: 'Desligar', ponto: 'Bloquear energia', tempo: 5, critico: true }] });
    const xml = await xmlAba(await gerarCriacaoXlsx(c, buscarLocal), 2);
    expect(xml).toContain('Trocar filtro').toContain('POP-01').toContain('Desligar').toContain('Bloquear energia').toContain('<v>5</v>').toContain('Sim');
  });
});
