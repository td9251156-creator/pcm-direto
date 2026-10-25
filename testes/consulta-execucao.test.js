import { expect,it } from 'vitest';
import { dataExibida,grupoDaPrevisao,consultarHistorico,paginarConsulta } from '../src/logica/consulta-execucao.js';
import { conclusoesPorOcorrencia,idsConcluidos } from '../src/logica/programacao.js';
it('exibe datas sem conversão de fuso e trata virada de mês/ano',()=>{
  expect(dataExibida('2026-01-01')).toBe('01/01/2026');expect(dataExibida('2026-02-30')).toBe('Sem data');
  expect(grupoDaPrevisao('2027-01-01','2026-12-31')).toBe('Amanhã · 01/01/2027');
  expect(grupoDaPrevisao('2026-03-01','2026-02-28')).toBe('Amanhã · 01/03/2026');
});
it('filtra pela data realizada, situação e texto sem acento preservando a entrada',()=>{
  const h=[{id:'a',tag:'MOT-1',descricao:'Inspeção elétrica',data:'2026-12-30',dataPrevista:'2027-01-02',cancelada:false},{id:'b',tag:'MOT-2',descricao:'Inspeção',data:'2027-01-01',cancelada:true},{id:'c',tag:'MOT-3',descricao:'Outra',data:'2026-12-30',cancelada:false}];
  expect(consultarHistorico(h,{busca:'eletrica MOT',de:'2026-12-30',ate:'2026-12-30',situacao:'realizadas'}).map(h=>h.id)).toEqual(['a']);
  expect(consultarHistorico(h,{situacao:'canceladas'}).map(h=>h.id)).toEqual(['b']);
  expect(consultarHistorico(h).map(h=>h.id)).toEqual(['b','c','a']);expect(h.map(h=>h.id)).toEqual(['a','b','c']);
});
it('pagina histórico grande sem omitir registros nem exceder o limite de elementos',()=>{
  const lista=Array.from({length:10001},(_,id)=>({id}));const vistos=[];
  for(let p=1;p<=501;p++)vistos.push(...paginarConsulta(lista,p).itens.map(h=>h.id));
  expect(vistos).toEqual(lista.map(h=>h.id));expect(paginarConsulta(lista,99999).pagina).toBe(501);expect(paginarConsulta([],0).inicio).toBe(0);
});
it('vincula conclusão somente por ocorrência explícita ou legado com previsão, sem inferir realização',()=>{
  const o={id:'o1',equipamentoId:'e1',tarefaId:'t1',dataPrevista:'2026-10-20',situacao:'prevista'};const p={ocorrencias:[o]};
  const base={equipamentoId:'e1',tarefaId:'t1',dataPrevista:'2026-10-20',data:'2026-10-21',cancelada:false};
  const h=[{...base,id:'legado'},{...base,id:'explicito',ocorrenciaId:'o1',data:'2026-10-22'},{...base,id:'cancelada',ocorrenciaId:'o1',data:'2026-10-23',cancelada:true},{...base,id:'sem-vinculo',dataPrevista:''}];
  expect(conclusoesPorOcorrencia(p,h).get('o1').id).toBe('explicito');expect([...idsConcluidos(p,h)]).toEqual(['o1']);
  expect(conclusoesPorOcorrencia(p,[h[3]]).size).toBe(0);
});
