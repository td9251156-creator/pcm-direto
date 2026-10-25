import { describe, it, expect } from 'vitest';
import biblioteca from '../src/dados/biblioteca.json';
import { validarBiblioteca, podeAlterar, aplicarAjuste, gerarPlano, vezesPorAno } from '../src/logica/plano.js';

const tarefaSeg = { id: 'T1', periodicidade: 'Mensal', seguranca: true };
const tarefaComum = { id: 'T2', periodicidade: 'Mensal', seguranca: false };

describe('biblioteca técnica', () => {
  it('está bem preenchida', () => {
    expect(validarBiblioteca(biblioteca)).toEqual([]);
  });

  it('tem os 4 tipos do MVP e os 3 tipos da versão 0.2.0', () => {
    expect(biblioteca.tipos.map((t) => t.id)).toEqual(['motor_eletrico', 'compressor_ar', 'bomba_centrifuga', 'ponte_rolante',
      'transportador_correia', 'ventilador_exaustor', 'unidade_hidraulica']);
  });

  it('toda tarefa traz origem de base genérica e versão', () => {
    for (const tipo of biblioteca.tipos) {
      for (const t of tipo.tarefas) {
        expect(t.origem).toMatch(/base genérica/);
        expect(t.versao).toBeTruthy();
      }
    }
  });

  it('acusa periodicidade inválida', () => {
    const ruim = { tipos: [{ id: 'x', nome: 'X', sigla: 'XXX', tarefas: [{ ...tarefaComum, periodicidade: 'Mensalmente' }] }] };
    expect(validarBiblioteca(ruim).join(' ')).toMatch(/Mensalmente/);
  });
});

describe('bloqueio de afrouxamento de tarefa de segurança', () => {
  it('não permite diminuir a frequência', () => {
    const r = podeAlterar(tarefaSeg, { periodicidade: 'Trimestral' });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/segurança/);
  });

  it('permite manter ou aumentar a frequência', () => {
    expect(podeAlterar(tarefaSeg, { periodicidade: 'Mensal' }).ok).toBe(true);
    expect(podeAlterar(tarefaSeg, { periodicidade: 'Semanal' }).ok).toBe(true);
  });

  it('não permite retirar a tarefa do plano', () => {
    expect(podeAlterar(tarefaSeg, { ativa: false }).ok).toBe(false);
  });

  it('tarefa comum pode ser ajustada livremente', () => {
    expect(podeAlterar(tarefaComum, { periodicidade: 'Anual' }).ok).toBe(true);
    expect(podeAlterar(tarefaComum, { ativa: false }).ok).toBe(true);
  });

  it('aplicarAjuste recusa e mantém os ajustes como estavam', () => {
    const r = aplicarAjuste({}, 'eq1', tarefaSeg, { periodicidade: 'Anual' });
    expect(r.ok).toBe(false);
    expect(r.ajustes).toEqual({});
  });

  it('o plano ignora ajuste proibido mesmo que esteja salvo', () => {
    const eq = { id: 'eq1', tipo: 'ponte_rolante', tag: 'MNT-PRL-001', descricao: 'Ponte 1' };
    const freio = biblioteca.tipos.find((t) => t.id === 'ponte_rolante').tarefas.find((t) => t.seguranca);
    const ajustes = { [`eq1|${freio.id}`]: { periodicidade: 'Anual', ativa: false } };
    const linha = gerarPlano([eq], biblioteca, ajustes).find((l) => l.tarefaId === freio.id);
    expect(linha.periodicidade).toBe(freio.periodicidade);
    expect(linha.ativa).toBe(true);
  });
});

describe('plano preventivo', () => {
  it('gera uma linha por tarefa de cada equipamento', () => {
    const eqs = [
      { id: 'a', tipo: 'motor_eletrico', tag: 'UTL-MOT-001', descricao: 'Motor 1' },
      { id: 'b', tipo: 'compressor_ar', tag: 'UTL-CMP-001', descricao: 'Compressor 1' },
    ];
    const plano = gerarPlano(eqs, biblioteca);
    const total = biblioteca.tipos[0].tarefas.length + biblioteca.tipos[1].tarefas.length;
    expect(plano).toHaveLength(total);
    expect(plano[0]).toMatchObject({ tag: 'UTL-MOT-001', ativa: true });
    expect(vezesPorAno(plano[0].periodicidade)).toBeGreaterThan(0);
  });

  it('aplica ajuste permitido', () => {
    const eq = { id: 'a', tipo: 'motor_eletrico', tag: 'UTL-MOT-001', descricao: 'Motor 1' };
    const t = biblioteca.tipos[0].tarefas.find((x) => !x.seguranca);
    const { ajustes } = aplicarAjuste({}, 'a', t, { periodicidade: 'Bimestral' });
    const linha = gerarPlano([eq], biblioteca, ajustes).find((l) => l.tarefaId === t.id);
    expect(linha.periodicidade).toBe('Bimestral');
    expect(linha.vezesAno).toBe(6);
  });
});

describe('periodicidade diária', () => {
  it('é a mais frequente e não pode ser afrouxada se for de segurança', () => {
    expect(vezesPorAno('Diária')).toBe(260);
    expect(podeAlterar({ periodicidade: 'Diária', seguranca: true }, { periodicidade: 'Semanal' }).ok).toBe(false);
  });
});
