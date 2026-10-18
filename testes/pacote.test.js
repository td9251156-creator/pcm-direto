import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import * as docx from 'docx';
import biblioteca from '../src/dados/biblioteca.json';
import { EXEMPLO } from '../src/dados/exemplo.js';
import { atribuirTags } from '../src/logica/tag.js';
import { siglasDaBiblioteca } from '../src/logica/plano.js';
import { montarDados } from '../src/logica/pacote.js';
import { gerarXlsx } from '../src/saida/xlsx.js';
import { montarDocx } from '../src/saida/docx.js';

const equipamentos = atribuirTags(EXEMPLO.map((e, i) => ({ ...e, id: `e${i}` })), siglasDaBiblioteca(biblioteca));
const dados = montarDados(equipamentos, biblioteca);

describe('planilha .xlsx', async () => {
  const buffer = await gerarXlsx(dados, ExcelJS);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  it('tem as 6 abas na ordem pedida', () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Leia-me', 'Resumo', 'Equipamentos', 'Plano', 'Cronograma', 'Ficha de Falha']);
  });

  it('usa só funções clássicas (sem matriz dinâmica)', () => {
    const proibidas = /XLOOKUP|XMATCH|FILTER|UNIQUE|SORT|SEQUENCE|LET\(|LAMBDA|IFS\(|_xlfn/i;
    const usadas = new Set();
    for (const aba of wb.worksheets) {
      aba.eachRow((row) => row.eachCell((c) => {
        if (c.formula) {
          expect(c.formula).not.toMatch(proibidas);
          for (const m of c.formula.matchAll(/([A-Z]+)\(/g)) usadas.add(m[1]);
        }
      }));
    }
    expect([...usadas].sort()).toEqual(['AVERAGE', 'COUNTA', 'COUNTIF', 'IF', 'INDEX', 'ISNA', 'MATCH', 'MAX', 'OR', 'SUM', 'SUMIF', 'VLOOKUP']);
  });

  it('o aviso aparece no topo de todas as abas', () => {
    for (const aba of wb.worksheets) expect(String(aba.getCell('A1').value)).toMatch(/não substitui a avaliação de profissional habilitado/);
  });

  it('lista todos os equipamentos e todas as linhas do plano', () => {
    expect(wb.getWorksheet('Equipamentos').getCell('A3').value).toBe(equipamentos[0].tag);
    expect(wb.getWorksheet('Plano').actualRowCount).toBe(2 + dados.plano.length);
  });
});

describe('documento .docx', () => {
  it('gera um arquivo Word válido', async () => {
    const buffer = await docx.Packer.toBuffer(montarDocx(dados, docx));
    expect(buffer.length).toBeGreaterThan(5000);
    expect(buffer.subarray(0, 2).toString()).toBe('PK'); // .docx é um arquivo zip
  });
});
