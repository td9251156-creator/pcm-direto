import { describe, it, expect } from 'vitest';
import { marcarExecucao, validarExecucoes } from '../src/logica/execucao.js';

const linha = { equipamentoId: 'eq1', tarefaId: 'MOT-06', ativa: true, seguranca: true, periodicidade: 'Semestral' };
const hoje = new Date(2026, 9, 20);
const marca = { concluida: true, data: '2026-10-20', observacao: '  Verificação fictícia.  ' };

describe('checklist de execução', () => {
  it('guarda a última execução sem alterar tarefa de segurança nem registros anteriores', () => {
    const antes = {};
    const r = marcarExecucao(antes, linha, marca, hoje);
    expect(r.registros).toEqual({ 'eq1|MOT-06': { data: marca.data, observacao: 'Verificação fictícia.' } });
    expect(validarExecucoes(r.registros)).toBe(true);
    expect(antes).toEqual({});
    expect(linha).toMatchObject({ ativa: true, seguranca: true, periodicidade: 'Semestral' });
  });
  it('permite retirar a marcação sem retirar a tarefa do plano', () => {
    const registros = marcarExecucao({}, linha, marca, hoje).registros;
    expect(marcarExecucao(registros, linha, { concluida: false }, hoje).registros).toEqual({});
    expect(linha.ativa).toBe(true);
  });
  it('recusa tarefa inativa, data impossível, data futura e observação longa', () => {
    expect(marcarExecucao({}, { ...linha, ativa: false }, marca, hoje).ok).toBe(false);
    for (const data of ['2026-02-31', '2026-10-21']) expect(marcarExecucao({}, linha, { ...marca, data }, hoje).ok).toBe(false);
    expect(marcarExecucao({}, linha, { ...marca, observacao: 'x'.repeat(2001) }, hoje).ok).toBe(false);
  });
  it.each([null, [], { 'id|tarefa': null }, { 'id|tarefa': { data: 'errada', observacao: '' } }])('recusa marcações salvas malformadas: %j', (r) => {
    expect(validarExecucoes(r)).toBe(false);
  });
});
