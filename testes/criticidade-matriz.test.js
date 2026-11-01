import { describe, it, expect } from 'vitest';
import { criticidadeAtivo } from '../src/logica/gestao.js';

// Fórmula do PCM-MAN-002 (aba Criticidade): consequência = maior nota entre S, Q e P;
// a classe vem da matriz consequência × frequência; segurança 5 é sempre A.
const MATRIZ_002 = ['CCCBB', 'CCBBA', 'CBBAA', 'BBAAA', 'BAAAA'];
const NOTAS = [1, 2, 3, 4, 5];
const SEVERIDADE = { C: 1, B: 2, A: 3 };

function esperado([s, q, p, f]) {
  const consequencia = Math.max(s, q, p);
  return { consequencia, classe: s === 5 ? 'A' : MATRIZ_002[consequencia - 1][f - 1] };
}

const combinacoes = [];
for (const s of NOTAS) for (const q of NOTAS) for (const p of NOTAS) for (const f of NOTAS) combinacoes.push([s, q, p, f]);

describe('matriz de criticidade 1 a 5 do PCM-MAN-002', () => {
  it('confere as 625 combinações de segurança, qualidade, produção e frequência', () => {
    expect(combinacoes).toHaveLength(625);
    for (const notas of combinacoes) {
      expect(criticidadeAtivo(notas), notas.join('')).toEqual(esperado(notas));
    }
  });

  it('usa a maior nota entre segurança, qualidade e produção como consequência', () => {
    for (const notas of combinacoes) {
      const [s, q, p] = notas;
      expect(criticidadeAtivo(notas).consequencia, notas.join('')).toBe(Math.max(s, q, p));
    }
  });

  it('aplica segurança 5 como classe A em qualquer qualidade, produção e frequência', () => {
    const comSeguranca5 = combinacoes.filter(notas => notas[0] === 5);
    expect(comSeguranca5).toHaveLength(125);
    for (const notas of comSeguranca5) expect(criticidadeAtivo(notas).classe, notas.join('')).toBe('A');
  });

  it('não melhora a classe quando a consequência ou a frequência aumenta', () => {
    for (const [s, q, p, f] of combinacoes) {
      const base = criticidadeAtivo([s, q, p, f]).classe;
      const variacoes = [];
      if (f < 5) variacoes.push([s, q, p, f + 1]);
      if (s < 5) variacoes.push([s + 1, q, p, f]);
      if (q < 5) variacoes.push([s, q + 1, p, f]);
      if (p < 5) variacoes.push([s, q, p + 1, f]);
      for (const maior of variacoes) {
        expect(SEVERIDADE[criticidadeAtivo(maior).classe], maior.join(''))
          .toBeGreaterThanOrEqual(SEVERIDADE[base]);
      }
    }
  });

  it('distribui as 625 combinações em 425 A, 164 B e 36 C, sem pendência', () => {
    const total = { A: 0, B: 0, C: 0, Pendente: 0 };
    for (const notas of combinacoes) total[criticidadeAtivo(notas).classe] += 1;
    expect(total).toEqual({ A: 425, B: 164, C: 36, Pendente: 0 });
  });

  it('mantém Pendente quando falta nota ou quando alguma nota sai da escala 1 a 5', () => {
    for (const notas of [undefined, [], [1, 1, 1], [1, 1, 1, 1, 1], new Array(4),
      [null, 1, 1, 1], [1, null, 1, 1], [1, 1, null, 1], [1, 1, 1, null], ['1', 1, 1, 1],
      [1, 1, 1, '1'], [0, 1, 1, 1], [1, 1, 1, 0], [6, 1, 1, 1], [1, 1, 1, 6], [1.5, 1, 1, 1]]) {
      expect(criticidadeAtivo(notas), JSON.stringify(notas)).toEqual({ consequencia: null, classe: 'Pendente' });
    }
  });

  it('não altera as notas recebidas ao calcular', () => {
    const notas = [2, 4, 1, 3];
    const copia = [...notas];
    criticidadeAtivo(notas);
    expect(notas).toEqual(copia);
  });
});
