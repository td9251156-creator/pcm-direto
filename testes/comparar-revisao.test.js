import {it,expect} from 'vitest';
import {compararTarefas,cargaAfetada} from '../src/logica/comparar-revisao.js';
const tarefa={equipamentoId:'e1',tarefaId:'t1',tag:'ANTIGA',ativa:true,periodicidade:'Mensal',duracaoHoras:1,descricao:'Inspeção'};
it('compara por IDs, preserva retratos e distingue retirada, inclusão e responsabilidade',()=>{
  const antes=[tarefa,{...tarefa,tarefaId:'retirada'}];const depois=[{...tarefa,tag:'NOVA'},{...tarefa,tarefaId:'retirada',ativa:false},{...tarefa,tarefaId:'nova'}];
  const resultado=compararTarefas(antes,depois,{}, {'e1|t1':'p1'});
  expect(resultado.map(r=>r.situacao)).toEqual(['Alterada','Retirada','Incluída']);
  expect(resultado[0].antes.tag).toBe('ANTIGA');expect(resultado[0].depois.tag).toBe('NOVA');expect(antes[0].tag).toBe('ANTIGA');
  expect(compararTarefas([tarefa],[{...tarefa}])).toEqual([]);
  expect(compararTarefas([tarefa],[tarefa],{}, {'e1|t1':'p1'})).toHaveLength(1);
});
it('agrega apenas o recorte de ocorrências fornecido, com especialidades incluídas e retiradas',()=>{
  const r=cargaAfetada([{especialidade:'Mecânica',horas:1},{especialidade:'Mecânica',horas:2},{especialidade:'Elétrica',horas:4}],[{especialidade:'Mecânica',horas:2},{especialidade:'Operação',horas:3}]);
  expect(r).toEqual([{especialidade:'Elétrica',antes:4,depois:0},{especialidade:'Mecânica',antes:3,depois:2},{especialidade:'Operação',antes:0,depois:3}]);
});
