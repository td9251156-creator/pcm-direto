import { describe,it,expect } from 'vitest';
import { criarProgramacao,validarProgramacao,prepararRevisao,painelDaSemana,resumoMensalRevisoes,idsConcluidos } from '../src/logica/programacao.js';
const linha = { equipamentoId:'eq1',tarefaId:'t1',tag:'UTL-MOT-001',descricao:'Inspeção fictícia',especialidade:'Elétrica',duracaoHoras:0.5,vezesAno:52,seguranca:true,ativa:true,semanas:[1,2,3] };
const dados = (alteracoes={}) => ({inicio:new Date(2026,0,5),equipamentos:[{id:'eq1',setor:'UTL'}],plano:[{...linha,...alteracoes}],cronograma:[{...linha,...alteracoes}],biblioteca:{versao:'0.1.0'}});
const g={historico:[],responsaveis:{'eq1|t1':'p1'}};
const meta={id:'r1',vigencia:'2026-01-05',elaborador:'Pessoa A',resumo:'Plano inicial'};
const primeira=()=>prepararRevisao(criarProgramacao(),dados(),g,meta,'2026-01-05').programacao;
describe('revisões do plano',()=>{
  it('preserva um ano de 100 ativos com tarefas diárias e semanais em duas revisões',()=>{
    const equipamentos=Array.from({length:100},(_,i)=>({id:'eq'+i,setor:'UTL',tag:'UTL-MOT-'+String(i+1).padStart(3,'0')}));
    const plano=equipamentos.flatMap(e=>[52,260].map((vezesAno,j)=>({...linha,equipamentoId:e.id,tag:e.tag,tarefaId:'t'+j,vezesAno,semanas:Array.from({length:52},(_,i)=>i+1)})));
    const d={...dados(),inicio:new Date(2026,0,5),equipamentos,plano,cronograma:plano};
    const inicial=prepararRevisao(criarProgramacao(),d,g,meta,'2026-01-05');expect(inicial.ok).toBe(true);
    expect(inicial.programacao.ocorrencias).toHaveLength(31200);
    const historico=inicial.programacao.ocorrencias.filter(o=>o.dataPrevista<'2026-07-01').map((o,i)=>({...o,id:'h'+i,ocorrenciaId:o.id,data:o.dataPrevista,cancelada:false}));
    const revisada=prepararRevisao(inicial.programacao,d,{...g,historico},{...meta,id:'r2',vigencia:'2026-07-01'},'2026-07-01');
    expect(revisada.ok).toBe(true);expect(validarProgramacao(revisada.programacao)).toBe(true);
    expect(revisada.programacao.revisoes).toHaveLength(2);
    const meses=resumoMensalRevisoes(revisada.programacao,historico,2026);
    expect(meses.slice(0,6).every(m=>m.realizadas===m.previstas)).toBe(true);
    expect(meses.slice(6).every(m=>m.realizadas===0)).toBe(true);
  });
  it('cria cópia imutável e prévia sem modificar a programação recebida',()=>{
    const p=criarProgramacao();const d=dados();const r=prepararRevisao(p,d,g,meta,'2026-01-05');
    expect(r.ok).toBe(true);expect(p.revisoes).toHaveLength(0);expect(r.impacto.adicionadas).toBe(3);
    d.plano[0].descricao='Alterada';expect(r.programacao.revisoes[0].plano[0].descricao).toBe('Inspeção fictícia');
    expect(validarProgramacao(r.programacao)).toBe(true);
  });
  it('preserva passado e futuro já executado, substitui só futuro pendente, sem duplicar conclusão',()=>{
    const p=primeira();const o=p.ocorrencias[2];
    const h={equipamentoId:o.equipamentoId,tarefaId:o.tarefaId,dataPrevista:o.dataPrevista,ocorrenciaId:o.id,cancelada:false};
    const historico=[{...h,id:'h1',data:'2026-01-10'},{...h,id:'h2'}];
    const r=prepararRevisao(p,dados({tag:'PRD-MOT-001',semanas:[1,2,3,4]}),{...g,historico},{...meta,id:'r2',vigencia:'2026-01-12'},'2026-01-10');
    expect(r.ok).toBe(true);expect(r.impacto.substituidas).toBe(1);
    expect(r.programacao.ocorrencias.find(x=>x.id===o.id)).toEqual(o);
    expect(r.programacao.ocorrencias.filter(x=>x.situacao==='prevista'&&x.dataPrevista==='2026-01-19')).toHaveLength(1);
    expect(p.ocorrencias.every(x=>x.situacao==='prevista')).toBe(true);
    expect(resumoMensalRevisoes(r.programacao,historico,2026)[0]).toMatchObject({previstas:4,realizadas:1,percentual:25});
  });
  it('não infere legado pela data realizada e cancelamento reabre a ocorrência',()=>{
    const p=primeira();const o=p.ocorrencias[0];
    expect(idsConcluidos(p,[{data:o.dataPrevista,equipamentoId:'eq1',tarefaId:'t1',dataPrevista:'',cancelada:false}]).size).toBe(0);
    expect(idsConcluidos(p,[{ocorrenciaId:o.id,cancelada:true}]).size).toBe(0);
    expect(idsConcluidos(p,[{equipamentoId:'eq1',tarefaId:'t1',dataPrevista:o.dataPrevista,cancelada:false}]).has(o.id)).toBe(true);
  });
  it('recusa vigência retroativa, metadados vazios, segurança desativada e referências quebradas',()=>{
    expect(prepararRevisao(criarProgramacao(),dados(),g,meta,'2026-01-06').ok).toBe(false);
    expect(prepararRevisao(criarProgramacao(),dados(),g,{...meta,elaborador:''},'2026-01-05').ok).toBe(false);
    expect(prepararRevisao(criarProgramacao(),dados({ativa:false}),g,meta,'2026-01-05').ok).toBe(false);
    const p=primeira();p.ocorrencias[0].revisaoId='inexistente';expect(validarProgramacao(p)).toBe(false);
  });
  it('recusa duplicidade semântica e não conclui ocorrência de outro ativo',()=>{
    const p=primeira();const o=p.ocorrencias[0];
    expect(idsConcluidos(p,[{ocorrenciaId:o.id,equipamentoId:'outro',tarefaId:o.tarefaId,dataPrevista:o.dataPrevista,cancelada:false}]).size).toBe(0);
    p.ocorrencias.push({...o,id:'duplicada'});expect(validarProgramacao(p)).toBe(false);
  });
  it('monta semana civil local e meses sem previsão sem divisão por zero',()=>{
    const p=primeira();const painel=painelDaSemana(p,[],'2026-01-13');
    expect(painel).toMatchObject({inicio:'2026-01-12',fim:'2026-01-18',carga:{Elétrica:0.5},previstas:1});
    expect(painel.vencidas).toHaveLength(2);expect(painel.proximas).toHaveLength(1);
    expect(resumoMensalRevisoes(p,[],2026)[1].percentual).toBe(null);
  });
});
