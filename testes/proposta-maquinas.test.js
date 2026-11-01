import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import biblioteca from '../src/dados/biblioteca.json';
import { conferirProposta } from '../scripts/validar-proposta-maquinas.mjs';

const exemplo = () => JSON.parse(readFileSync('propostas-maquinas/exemplo-proposta.json', 'utf8'));

it('o exemplo de proposta passa e a biblioteca resultante segue as regras do app, sem alterar a original', () => {
  const antes = structuredClone(biblioteca);
  const r = conferirProposta(exemplo(), biblioteca);
  expect(r.erros).toEqual([]);
  expect(r.resultado.tipos.at(-1)).toMatchObject({ id: 'redutor_velocidade', sigla: 'RED' });
  expect(r.resultado.tipos.at(-1).tarefas.every((t) => !('fonte' in t))).toBe(true);
  expect(biblioteca).toEqual(antes);
});

it('barra fonte ausente, norma sem fonte oficial, origem divergente, código fora do padrão e sigla repetida', () => {
  const p = exemplo(); const [t1, t2] = p.tipos[0].tarefas;
  t1.fonte = 'F9';
  t2.descricao = 'Trocar o óleo conforme NR-12';
  const r = conferirProposta(p, biblioteca);
  expect(r.erros.join(' ')).toMatch(/RED-01: indique em "fonte"/);
  expect(r.erros.join(' ')).toMatch(/RED-02: cita norma sem fonte/);

  const q = exemplo(); q.tipos[0].sigla = 'MOT'; q.tipos[0].tarefas[0].origem = 'manual qualquer';
  const s = conferirProposta(q, biblioteca).erros.join(' ');
  expect(s).toMatch(/a origem deve ser "base genérica/);
  expect(s).toMatch(/o id deve seguir MOT-NN/);
  expect(s).toMatch(/sigla repetida/);
});

it('manual exige versão e data; segurança exige explicação e avisa quando a base é genérica', () => {
  const p = exemplo();
  p.proposta.fontes.push({ id: 'F2', tipo: 'manual_fabricante', titulo: 'Manual fictício', referencia: 'Modelo Z', versao: '', data: '' });
  Object.assign(p.tipos[0].tarefas[1], { seguranca: true, observacao: '' });
  const r = conferirProposta(p, biblioteca);
  expect(r.erros.join(' ')).toMatch(/Fonte F2: manual ou norma exige/);
  expect(r.erros.join(' ')).toMatch(/segurança precisa explicar/);
  expect(r.avisos.join(' ')).toMatch(/segurança com base genérica/);
});

it('tarefas novas só para tipo existente, com o código na sequência da sigla do tipo', () => {
  const p = { proposta: { titulo: 'Fictícia', data: '2026-11-01', fontes: [{ id: 'F1', tipo: 'base_generica', titulo: 'Base' }] }, tipos: [],
    tarefasNovas: [{ tipo: 'motor_eletrico', tarefa: { id: 'MOT-99', descricao: 'Conferir aterramento da carcaça (fictícia)', periodicidade: 'Anual',
      especialidade: 'Elétrica', duracao_horas: 0.5, seguranca: false, origem: 'base genérica a validar com manual do fabricante', versao: '0.1.0', observacao: '', fonte: 'F1' } },
    { tipo: 'nao_existe', tarefa: {} }] };
  const r = conferirProposta(p, biblioteca);
  expect(r.erros.join(' ')).toMatch(/tipo nao_existe não existe/);
  p.tarefasNovas.pop();
  expect(conferirProposta(p, biblioteca).erros).toEqual([]);
});
