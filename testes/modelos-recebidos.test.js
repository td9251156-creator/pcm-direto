import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import contrato from '../src/dados/biblioteca-pcm-v2.json';
import antigos from './fixtures/cabecalhos-biblioteca-20261101.json';
import biblioteca from '../src/dados/biblioteca.json';
import { normalizarFonte } from '../src/logica/dashboards/fonte.js';
import { calcularConfiabilidade } from '../src/logica/dashboards/confiabilidade.js';
import { criarGestao } from '../src/logica/gestao.js';
import { criarProgramacao, prepararRevisao } from '../src/logica/programacao.js';
import { montarDados } from '../src/logica/pacote.js';
import { prepararEmissao } from '../src/logica/emissao.js';
import { indicadores017, falhasDoAtivo } from '../src/logica/indicadores-017.js';
import { dadosPcmMan002,dadosPcmMan004,dadosPcmMan008,dadosPcmMan011 } from '../src/logica/biblioteca-v2-dados.js';
import { preencherPcmMan002,preencherPcmMan004,preencherPcmMan008,preencherPcmMan011 } from '../src/saida/biblioteca-v2-xlsx.js';
import { prepararPreviaBibliotecaV2,abrirWorkbookBibliotecaV2 } from '../src/integracao/biblioteca-pcm-v2.js';
import { prepararImportacao,aplicarImportacao,criarOperacao,validarOperacao } from '../src/logica/operacao.js';
const modelo=c=>contrato.modelos.find(m=>m.codigo===c);
const bytes=c=>readFileSync('public/'+modelo(c).url);
const abrir=async b=>abrirWorkbookBibliotecaV2(b,ExcelJS);
function emissao(){
 const equipamentos=[{id:'eq',setor:'TST',tipo:'motor_eletrico',descricao:'Motor fictício',numero:1,tag:'TST-MOT-001'}];
 const g=criarGestao();g.pessoas=[{id:'p1',nome:'Pessoa fictícia',funcao:'',especialidade:'Elétrica',ativo:true}];
 const dados=montarDados(equipamentos,structuredClone(biblioteca),{},'2026-01-01',{});
 const p=prepararRevisao(criarProgramacao(),dados,g,{id:'r1',vigencia:'2026-01-01',elaborador:'Pessoa fictícia',resumo:'Plano fictício'},'2026-01-01');
 const e={equipamentos,biblioteca:structuredClone(biblioteca),gestao:g,programacao:p.programacao};
 return prepararEmissao(e,{dataCorte:'2026-02-28',elaborador:'Pessoa fictícia',aprovado:false,aprovador:''});
}
const falha=(ref,extra={})=>({referencia_falha:ref,tag:'TST-MOT-001',inicio_falha:'2026-01-03',fim_falha:'2026-01-03',inicio_reparo:null,fim_reparo:null,horas_parada:null,horas_reparo:null,importacao:'i1',...extra});

it('aceita cabeçalhos reais anteriores do 004/008/012, com campos novos ausentes',()=>{
 const registros={ativos:{tag:'TST-MOT-001'},ordens_servico:{numero_os:'0001',tag:'TST-MOT-001',tipo_manutencao:'PREVENTIVA',status:'CONCLUIDA',data_abertura:'2026-01-01',data_conclusao:'2026-01-01'},falhas:falha('0001',{inicio_falha:'2026-01-01T08:00:00',fim_falha:'2026-01-01T09:00:00'}),custos_manutencao:{referencia_lancamento:'0001',data_lancamento:'2026-01-01',setor:'TST',categoria_custo:'OUTROS',valor_realizado:0}};
 for(const codigo of ['PCM-MAN-004','PCM-MAN-008','PCM-MAN-012']){
  const wb=new ExcelJS.Workbook();
  for(const [base,fonte] of Object.entries(contrato.fontes).filter(([,f])=>f.codigo===codigo)){
   const esquema=antigos[base];const aba=modelo(codigo).abas.find(a=>a.tabelas.some(t=>t.nome===fonte.tabela)).nome;
   const sh=wb.getWorksheet(aba)||wb.addWorksheet(aba);
   sh.addTable({name:fonte.tabela,ref:esquema.intervalo.split(':')[0],headerRow:true,columns:esquema.campos.map(name=>({name})),rows:[esquema.campos.map(c=>registros[base][c]??null)]});
  }
  const previa=prepararPreviaBibliotecaV2(wb,codigo);expect(previa.erros).toEqual([]);
  expect(Object.values(previa.bases).every(l=>l.length===1)).toBe(true);
 }
});

it('002 exporta identidade e segurança, usa opcionais do snapshot e não infere executante pela especialidade',async()=>{
 const e=emissao();e.revisao.biblioteca=structuredClone(biblioteca);const fonte=e.revisao.biblioteca.tipos.find(t=>t.id==='motor_eletrico');
 fonte.tarefas.forEach(t=>Object.assign(t,{componente:'Componente fictício',tipo_tarefa:'INSPECAO',exige_parada:false}));
 e.estado.biblioteca.tipos.find(t=>t.id==='motor_eletrico').tarefas.forEach(t=>Object.assign(t,{componente:'Não usar atual',tipo_tarefa:'AUTONOMA',executante:'Terceiro'}));
 const k=`eq|${e.revisao.plano[0].tarefaId}`;e.revisao.responsaveis[k]='p1';
 const d=dadosPcmMan002(e);const wb=await abrir(await preencherPcmMan002(bytes('PCM-MAN-002'),d));const sh=wb.getWorksheet('Plano');
 for(let i=0;i<d.atividades.length;i++){
  const t=d.atividades[i],r=i+21;
  expect(sh.getCell('D'+r).value).toBe('Componente fictício');expect(sh.getCell('J'+r).value).toBe('Inspeção');expect(sh.getCell('K'+r).value).toBe(null);
  expect(sh.getCell('F'+r).value).toBe(t.tarefaId);expect(sh.getCell('G'+r).value).toBe(t.seguranca);expect(sh.getCell('H'+r).value).toBe(t.origem);expect(sh.getCell('I'+r).value).toBe(t.versao);
  expect(sh.getCell('N'+r).value).toBe(t.responsavel||null);expect(sh.getCell('P'+r).value).toBe('Não');
 }
 expect(sh.getCell('R21').value?.formula).toContain('Q21');
});

it('008 conserva conclusão sem hora, horas zero/ausentes e reimportação não duplica nem muda MTTR',async()=>{
 const e=emissao();const local=[{id:'f1',equipamentoId:'eq',tag:'TST-MOT-001',data:'2026-01-03',horaInicio:'',horaFim:'',dataConclusao:'2026-01-03',horasParada:5,horasReparo:4,sintoma:'Falha fictícia',causa:'',acao:'',peca:'',responsavelId:''},
 {id:'f2',equipamentoId:'eq',tag:'TST-MOT-001',data:'2026-01-05',horaInicio:'',horaFim:'',dataConclusao:'',horasParada:0,horasReparo:null,sintoma:'Aberta fictícia',causa:'',acao:'',peca:'',responsavelId:''}];
 e.falhas=local;e.estado.gestao.falhas=local;
 const wb=await abrir(await preencherPcmMan008(bytes('PCM-MAN-008'),dadosPcmMan008(e)));
 const sh=wb.getWorksheet('Registro de falhas');expect(sh.getCell('I5').numFmt).toBe('dd/mm/yyyy');expect(sh.getCell('N6').value).toBe(0);expect(sh.getCell('O6').value).toBe(null);
 const previa=prepararPreviaBibliotecaV2(wb,'PCM-MAN-008');expect(previa.erros).toEqual([]);
 expect(previa.bases.falhas[0]).toMatchObject({inicio_falha:'2026-01-03',fim_falha:'2026-01-03',horas_parada:5,horas_reparo:4});
 let op=criarOperacao();const equipamentos=e.revisao.equipamentos;
 const plano=prepararImportacao(previa,null,op,equipamentos);const aplicada=aplicarImportacao(op,plano,{id:'imp1',data:'2026-03-01T00:00:00Z'});op=aplicada.operacao;
 expect(validarOperacao(op)).toBe(true);const repetida=prepararImportacao(previa,null,op,equipamentos);expect(repetida.iguais.filter(i=>i.base==='falhas')).toHaveLength(2);expect(repetida.novos).toEqual([]);
 const g=criarGestao();g.operacao=op;const r=indicadores017(falhasDoAtivo(g,'eq','TST-MOT-001'),'2026-01',100,'2026-03-01');expect(r).toMatchObject({n:2,reparos:1,somaReparos:4,mttr:4});
});

it('011 usa contagem de reparos completos no divisor do MTTR, não número de falhas',async()=>{
 const e=emissao(),g=e.estado.gestao;g.operacao={...criarOperacao(),falhas:[falha('f1',{horas_parada:5,horas_reparo:4}),falha('f2',{fim_falha:null,horas_reparo:9})]};
 g.indicadoresMensais=[{equipamentoId:'eq',mes:'2026-01',horasPlanejadas:100}];
 const d=dadosPcmMan011(e.estado,e.revisao.equipamentos[0],'2026','2026-03-01');expect(d.meses[0]).toMatchObject({falhas:2,reparosCompletos:1,horasReparo:4});
 const sh=(await abrir(await preencherPcmMan011(bytes('PCM-MAN-011'),d))).getWorksheet('Indicadores');expect(sh.getCell('D8').value).toBe(2);expect(sh.getCell('E8').value).toBe(1);expect(sh.getCell('F8').value).toBe(4);expect(sh.getCell('M8').value.formula).toContain('F8/E8');
});

it('duração que atravessa meses sem intervalo não inventa rateio nem invalida outros reparos completos',()=>{
 const g=criarGestao();g.operacao={...criarOperacao(),falhas:[falha('longo',{inicio_falha:'2026-01-31',fim_falha:'2026-02-01',horas_parada:8}),falha('completo',{inicio_falha:'2026-01-04T08:00:00',fim_falha:'2026-01-04T12:00:00',inicio_reparo:'2026-01-04T09:00:00',fim_reparo:'2026-01-04T12:00:00'})]};
 const f=falhasDoAtivo(g,'eq','TST-MOT-001');expect(indicadores017(f,'2026-01',100,'2026-03-01')).toMatchObject({hi:null,reparos:1,somaReparos:3,mttr:3});expect(indicadores017(f,'2026-02',100,'2026-03-01').hi).toBe(null);
});

it('004 preserva horas apontadas no Excel sobre APP local sem importar status nem ressuscitar programação encerrada',async()=>{
 const e=emissao(),o=e.ocorrencias[0];e.historico=[{id:'hist1',ocorrenciaId:o.id,equipamentoId:o.equipamentoId,tarefaId:o.tarefaId,tag:o.tag,descricao:o.descricao,dataPrevista:o.dataPrevista,data:o.dataPrevista,cancelada:false}];e.estado.gestao.historico=e.historico;
 e.estado.gestao.operacao={...criarOperacao(),ordens_servico:[{numero_os:'APP-hist1',tag:o.tag,status:'CANCELADA',horas_executadas:2.5},{numero_os:'APP-'+o.id,tag:o.tag,status:'PROGRAMADA',horas_executadas:0},{numero_os:'APP-outra-base',tag:o.tag,tipo_manutencao:'PREVENTIVA',prioridade:'MEDIA',status:'ABERTA',data_abertura:'2026-01-01',horas_executadas:0,origem_registro:'Digitação manual'}]};
 const d=dadosPcmMan004(e);expect(d.ordens.find(x=>x.numero==='APP-hist1')).toMatchObject({executadas:2.5,status:'CONCLUIDA',origem:'Execução no app'});expect(d.ordens.some(x=>x.numero==='APP-'+o.id)).toBe(false);expect(d.ordens.find(x=>x.numero==='APP-outra-base')).toMatchObject({executadas:0,origem:'Digitação manual'});
 const wb=await abrir(await preencherPcmMan004(bytes('PCM-MAN-004'),d));const pr=prepararPreviaBibliotecaV2(wb,'PCM-MAN-004');expect(pr.erros).toEqual([]);const row=pr.bases.ordens_servico.find(x=>x.numero_os==='APP-hist1');expect(row).toMatchObject({horas_executadas:2.5,status:'CONCLUIDA',origem_registro:'Execução no app'});
 const imp=prepararImportacao(pr,null,criarOperacao(),e.revisao.equipamentos);const op=aplicarImportacao(criarOperacao(),imp,{id:'i2',data:'2026-03-01T00:00:00Z'}).operacao;expect(validarOperacao(op)).toBe(true);
 expect(prepararImportacao(pr,null,op,e.revisao.equipamentos).novos).toEqual([]);
 e.estado.gestao.operacao=op;expect(dadosPcmMan004(e).ordens.find(o=>o.numero==='APP-hist1').executadas).toBe(2.5);
 op.ordens_servico.find(o=>o.numero_os==='APP-hist1').horas_executadas=0;expect(dadosPcmMan004(e).ordens.find(o=>o.numero==='APP-hist1').executadas).toBe(0);
 op.ordens_servico.find(o=>o.numero_os==='APP-hist1').tag='OUTRA-TAG';expect(dadosPcmMan004(e).ordens.find(o=>o.numero==='APP-hist1').executadas).toBe(null);
});


it('008 mantém os quatro campos de data sem hora após ampliar linhas e reemitir',async()=>{
 const e=emissao();e.falhas=[];e.estado.gestao.operacao={...criarOperacao(),falhas:Array.from({length:110},(_,i)=>falha('D'+String(i).padStart(3,'0'),{inicio_reparo:'2026-01-03',fim_reparo:'2026-01-03',horas_parada:0,horas_reparo:0}))};
 const wb=await abrir(await preencherPcmMan008(bytes('PCM-MAN-008'),dadosPcmMan008(e)));const sh=wb.getWorksheet('Registro de falhas');
 for(const linha of [5,114])for(const coluna of ['H','I','J','K'])expect(sh.getCell(coluna+linha).numFmt).toBe('dd/mm/yyyy');
 const previa=prepararPreviaBibliotecaV2(wb,'PCM-MAN-008');expect(previa.erros).toEqual([]);expect(previa.bases.falhas).toHaveLength(110);
 expect(previa.bases.falhas.at(-1)).toMatchObject({inicio_falha:'2026-01-03',fim_falha:'2026-01-03',inicio_reparo:'2026-01-03',fim_reparo:'2026-01-03',horas_parada:0,horas_reparo:0});
});

it('012 preserva o número da OS como texto e custo zero, sem importar a grade setorial como lançamentos',async()=>{
 const wb=await abrir(bytes('PCM-MAN-012')),sh=wb.getWorksheet('Lançamentos');
 for(const [c,v] of Object.entries({A5:'C-0001',B5:new Date('2026-01-03T00:00:00Z'),E5:'TST',F5:'OUTROS',G5:0,H5:'Nota fictícia',I5:'00009'}))sh.getCell(c).value=v;
 const p=prepararPreviaBibliotecaV2(wb,'PCM-MAN-012');expect(p.erros).toEqual([]);expect(p.bases.custos_manutencao[0]).toMatchObject({numero_os:'00009',valor_realizado:0});
 expect(Object.keys(p.bases)).toEqual(['custos_manutencao']);
 const plano=prepararImportacao(p,null,criarOperacao(),[]);const op=aplicarImportacao(criarOperacao(),plano,{id:'i12',data:'2026-03-01T00:00:00Z'}).operacao;
 expect(validarOperacao(op)).toBe(true);expect(op.custos_manutencao[0].numero_os).toBe('00009');expect(prepararImportacao(p,null,op,[]).iguais).toHaveLength(1);
});

it('intervalos completos prevalecem sobre durações digitadas, inclusive quando divergem',()=>{
 const g=criarGestao();g.operacao={...criarOperacao(),falhas:[falha('F',{inicio_falha:'2026-01-03T08:00:00',fim_falha:'2026-01-03T12:00:00',inicio_reparo:'2026-01-03T09:00:00',fim_reparo:'2026-01-03T11:00:00',horas_parada:99,horas_reparo:88})]};
 const r=indicadores017(falhasDoAtivo(g,'eq','TST-MOT-001'),'2026-01',100,'2026-03-01');expect(r).toMatchObject({hi:4,reparos:1,mttr:2,somaReparos:2});
});


it('dashboard de intervalos exclui data sem hora e encaminha durações avulsas ao Mensal',()=>{
 const f=normalizarFonte({metadados:{data_referencia:'2026-01-31',periodo:{inicio:'2026-01-01',fim:'2026-01-31'}},bases:{ativos:[],ordens_servico:[],falhas:[falha('f',{horas_parada:8,horas_reparo:4})],custos_manutencao:[],operacao_ativos:[],orcamento_manutencao:[]}});
 const d=calcularConfiabilidade(f,{});expect(d.indicadores.indisponibilidade.valor).toBe(null);expect(d.indicadores.reparo.valor).toBe(null);expect(d.ranking[0]).toMatchObject({indisponibilidade:null,reparo:null});expect(d.avisos.join(' ')).toContain('durações avulsas');
});

it('leitor não trunca horários ocultos em formatos só data/General, mas reconhece data-only explícita',async()=>{
 const wb=await abrir(bytes('PCM-MAN-008')),sh=wb.getWorksheet('Registro de falhas');
 const serial=(Date.parse('2026-01-03T12:30:00Z')-Date.UTC(1899,11,30))/86400000;
 const casos=[[new Date('2026-01-03T12:30:00Z'),'dd/mm/yyyy','2026-01-03T12:30:00'],[serial,'dd/mm/yyyy','2026-01-03T12:30:00'],[serial,'General','2026-01-03T12:30:00'],[new Date('2026-01-03T00:00:00Z'),'General','2026-01-03T00:00:00'],[new Date('2026-01-03T00:00:00Z'),'dd/mm/yyyy hh:mm','2026-01-03T00:00:00'],[new Date('2026-01-03T00:00:00Z'),'dd/mm/yyyy','2026-01-03']];
 casos.forEach(([v,fmt],i)=>{sh.getCell('A'+(5+i)).value='H'+i;sh.getCell('B'+(5+i)).value='TST-MOT-001';sh.getCell('H'+(5+i)).value=v;const cell=sh.getCell('H'+(5+i));cell.style={...cell.style,numFmt:fmt};});
 const p=prepararPreviaBibliotecaV2(wb,'PCM-MAN-008');expect(p.erros).toEqual([]);expect(p.bases.falhas.map(f=>f.inicio_falha)).toEqual(casos.map(c=>c[2]));
});


it('dashboard não mostra zero quando a única falha atravessa o filtro sem horários completos',()=>{
 const f=normalizarFonte({metadados:{data_referencia:'2026-01-31',periodo:{inicio:'2026-01-01',fim:'2026-01-31'}},bases:{ativos:[],ordens_servico:[],falhas:[falha('atravessa',{inicio_falha:'2025-12-31',fim_falha:'2026-01-02',horas_parada:8})],custos_manutencao:[],operacao_ativos:[],orcamento_manutencao:[]}});
 const d=calcularConfiabilidade(f,{});expect(d.indicadores.falhas.valor).toBe(0);expect(d.indicadores.indisponibilidade.valor).toBe(null);expect(d.indicadores.indisponibilidade.estado).toBe('indefinido');expect(d.avisos.join(' ')).toContain('iniciada(s) antes do filtro');
});


it('dashboard conta reparo anterior conhecido independentemente de HI desconhecida',()=>{
 const anterior= falha('atravessa',{inicio_falha:'2025-12-31',fim_falha:'2026-01-02',horas_parada:8,inicio_reparo:'2026-01-01T09:00:00',fim_reparo:'2026-01-01T12:00:00'});
 for(const atuais of [[],[falha('atual',{inicio_falha:'2026-01-05T08:00:00',fim_falha:'2026-01-05T09:00:00'})]]){
  const f=normalizarFonte({metadados:{data_referencia:'2026-01-31',periodo:{inicio:'2026-01-01',fim:'2026-01-31'}},bases:{ativos:[],ordens_servico:[],falhas:[anterior,...atuais],custos_manutencao:[],operacao_ativos:[],orcamento_manutencao:[]}});
  const d=calcularConfiabilidade(f,{});expect(d.indicadores.reparo.valor).toBe(3);expect(d.indicadores.falhas.valor).toBe(atuais.length);expect(d.indicadores.reparo.populacao).toContain('iniciada(s) antes do período');if(!atuais.length)expect(d.indicadores.indisponibilidade.valor).toBe(null);else expect(d.indicadores.reparo.estado).toBe('parcial');
 }
});
