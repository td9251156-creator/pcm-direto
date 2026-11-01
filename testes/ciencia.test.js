import { it, expect } from 'vitest';
import { acrescentarCiencia, cienciaValida, cienciasValidas, conteudoDaExecucao, TEXTO_CIENCIA } from '../src/logica/ciencia.js';
import { criarGestao, validarGestao } from '../src/logica/gestao.js';

const execucao = (extra = {}) => ({ id: 'h1', equipamentoId: 'eq1', tarefaId: 'MOT-01', tag: 'TST-MOT-001', descricao: 'Inspeção fictícia', data: '2026-10-20',
  dataPrevista: '2026-10-20', observacao: 'Sem anormalidade', responsavelId: '', origem: 'app', cancelada: false, ...extra });

it('acrescenta a ciência com nome, data/hora e o conteúdo exato, sem alterar as anteriores', () => {
  expect(TEXTO_CIENCIA).toBe('Declaro que tomei ciência das informações desta execução.');
  const r1 = acrescentarCiencia(execucao(), '  Supervisora Fictícia ', 'c1', new Date('2026-10-21T10:00:00Z'));
  expect(r1.ok).toBe(true);
  expect(r1.execucao.ciencias).toEqual([{ id: 'c1', nome: 'Supervisora Fictícia', em: '2026-10-21T10:00:00.000Z', conteudo: '2026-10-20 · TST-MOT-001 · Inspeção fictícia · Sem anormalidade' }]);
  const r2 = acrescentarCiencia(r1.execucao, 'Gestor Fictício', 'c2', new Date('2026-10-22T09:00:00Z'));
  expect(r2.execucao.ciencias.map((c) => c.id)).toEqual(['c1', 'c2']);
  expect(r2.execucao.ciencias[0]).toEqual(r1.execucao.ciencias[0]);
  expect(conteudoDaExecucao(execucao({ observacao: '' }))).toMatch(/sem observação$/);
});

it('recusa nome vazio, execução cancelada e registro malformado', () => {
  expect(acrescentarCiencia(execucao(), '   ', 'c1').ok).toBe(false);
  expect(acrescentarCiencia(execucao({ cancelada: true }), 'Fulano', 'c1').ok).toBe(false);
  const boa = { id: 'c1', nome: 'Fulano', em: '2026-10-21T10:00:00.000Z', conteudo: 'x' };
  expect(cienciaValida(boa)).toBe(true);
  for (const m of [{ nome: '' }, { em: '21/10/2026' }, { id: 'c 1' }, { conteudo: '' }]) expect(cienciaValida({ ...boa, ...m })).toBe(false);
  expect(cienciasValidas([boa, { ...boa }])).toBe(false);
});

it('a base aceita ciência só na versão 2 em diante', () => {
  const h = acrescentarCiencia(execucao(), 'Fulano', 'c1').execucao;
  expect(validarGestao({ ...criarGestao(), versao: 2, historico: [h] })).toBe(true);
  expect(validarGestao({ ...criarGestao(), versao: 1, historico: [h] })).toBe(false);
});
