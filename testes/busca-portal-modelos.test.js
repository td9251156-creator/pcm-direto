import { describe, it, expect } from 'vitest';
import { correspondeBuscaModelo } from '../src/logica/busca-modelos.js';

describe('busca do catálogo público', () => {
  it('encontra OS como sigla inteira, sem confundir custos e documentos', () => {
    expect(correspondeBuscaModelo('Ordens de serviço', 'OS', 'OS')).toBe(true);
    expect(correspondeBuscaModelo('Orçamento e custos', 'OS')).toBe(false);
    expect(correspondeBuscaModelo('Controle de documentos', 'OS')).toBe(false);
    expect(correspondeBuscaModelo('Para reunir os resultados do mês', 'OS')).toBe(false);
  });
  it('aceita a grafia pontuada da sigla de ordem de serviço', () => {
    expect(correspondeBuscaModelo('Ordens de serviço', 'O.S.', 'OS')).toBe(true);
    expect(correspondeBuscaModelo('Custos', 'o.s.')).toBe(false);
    expect(correspondeBuscaModelo('Ordens de serviço', '(O.S.)', 'OS')).toBe(true);
  });
  it('preserva acentos, trechos de palavras, espaços e combinação de termos', () => {
    expect(correspondeBuscaModelo('Orçamento e custos', '  orcam CUST  ')).toBe(true);
    expect(correspondeBuscaModelo('Ordens de serviço', 'OS servico', 'OS')).toBe(true);
    expect(correspondeBuscaModelo('Ordens de serviço', 'OS estoque', 'OS')).toBe(false);
  });
  it('não apresenta todos os modelos para uma busca só de pontuação', () => {
    expect(correspondeBuscaModelo('Ordens de serviço OS', '???')).toBe(false);
  });
  it('aceita código com hífens ou espaços e consulta vazia', () => {
    for (const q of ['PCM-MAN-004', 'pcm man 004', '004', '']) {
      expect(correspondeBuscaModelo('PCM-MAN-004 Ordens de serviço OS', q)).toBe(true);
    }
  });
});
