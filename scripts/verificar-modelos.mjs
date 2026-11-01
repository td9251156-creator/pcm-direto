// Preenche os modelos da Biblioteca v2 com o gerador real, em navegador isolado, sem contas ou rede externa,
// com volume alto (100 ativos, 41 pessoas, 3101 execuções, 1101 falhas) e confere tabelas, rodapés e recálculo.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import JSZip from 'jszip';
import {montarDados} from '../src/logica/pacote.js';
import {criarGestao} from '../src/logica/gestao.js';
import {prepararRevisao,criarProgramacao} from '../src/logica/programacao.js';
import {executarComRecursos} from './navegador.mjs';
const biblioteca=JSON.parse(await readFile(new URL('../src/dados/biblioteca.json',import.meta.url),'utf8'));
const manifesto=JSON.parse(await readFile(new URL('../src/dados/biblioteca-pcm-v2.json',import.meta.url),'utf8'));
const setor=i=>'S'+String(i%60).padStart(2,'0');
const equipamentos=Array.from({length:100},(_,i)=>({id:'e'+i,setor:setor(i),tipo:'motor_eletrico',descricao:'Motor fictício '+i,numero:i+1,tag:setor(i)+'-MOT-'+String(i+1).padStart(3,'0')}));
const gestao=criarGestao();gestao.organizacao.nome='Fábrica fictícia de teste';gestao.organizacao.setores=Array.from({length:60},(_,i)=>setor(i));
gestao.pessoas=Array.from({length:41},(_,i)=>({id:'p'+i,nome:'Pessoa fictícia '+i,funcao:'Técnico',especialidade:'Mecânica',ativo:true}));
gestao.requisitos=Array.from({length:42},(_,i)=>({id:'q'+i,referencia:'Referência fictícia '+i,versao:'1',data:'2026-01-05',fonte:'https://example.org/',status:'nao_verificado'}));
gestao.criticidade.notas=Object.fromEntries(equipamentos.map((e,i)=>[e.id,[1+i%5,1+(i+1)%5,1+(i+2)%5,1+(i+3)%5]]));
gestao.historico=Array.from({length:3101},(_,i)=>({id:'h'+i,equipamentoId:'e0',tarefaId:'MOT-01',tag:equipamentos[0].tag,descricao:'Registro fictício '+i,data:'2026-01-05',dataPrevista:'',observacao:'Legado sem vínculo',responsavelId:'',origem:'legado',cancelada:i%2===0}));
gestao.versao=2;
gestao.falhas=Array.from({length:1101},(_,i)=>({id:'f'+i,equipamentoId:'e0',tag:equipamentos[0].tag,data:'2026-01-05',sintoma:'Sintoma fictício '+i,causa:'',acao:'',peca:'',responsavelId:'',horasParada:i%2===0?null:0,
  dataConclusao:i%3?'2026-01-05':'',horasReparo:null,horaInicio:i%3?'08:00':'',horaFim:i%3===1?'09:30':''}));
const tarefa=biblioteca.tipos.find(t=>t.id==='motor_eletrico').tarefas[0].id;
const ajustes=Object.fromEntries(equipamentos.map(e=>[`${e.id}|${tarefa}`,{ativa:true,periodicidade:'Diária'}]));
const dados=montarDados(equipamentos,biblioteca,ajustes,'2026-01-05',{});
const r=prepararRevisao(criarProgramacao(),dados,gestao,{id:'r1',vigencia:'2026-01-05',elaborador:'Pessoa fictícia',resumo:'Teste de expansão'},'2026-01-05');assert.ok(r.ok,r.motivo);
const estado={equipamentos,biblioteca,gestao,programacao:r.programacao};
const arquivo=codigo=>manifesto.modelos.find(m=>m.codigo===codigo).arquivo;
const ferramenta=process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href;
const {chromium}=await import(ferramenta);const pasta=new URL('../artifacts/modelos-expandidos/',import.meta.url);await mkdir(pasta,{recursive:true});
await executarComRecursos({limiteTotal:300000,criarServidor:async()=>{const servidor=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{host:'127.0.0.1',port:4182,strictPort:true}});await servidor.listen();return servidor;},criarNavegador:()=>chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),executar:async({navegador})=>{
  const contexto=await navegador.newContext({serviceWorkers:'block'});const p=await contexto.newPage();p.setDefaultTimeout(180000);const erros=[];p.on('pageerror',e=>erros.push(e.message));
  await p.route('https://**/*',rota=>rota.abort());await p.route('http://127.0.0.1:4182/',rota=>rota.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><title>Exportação isolada</title><body>Teste local de modelos</body></html>'}));await p.goto('http://127.0.0.1:4182/');
  const rejeitou=await p.evaluate(async estado=>{const g=await import('/src/saida/biblioteca-v2-xlsx.js');const d=await import('/src/logica/biblioteca-v2-dados.js');const {prepararEmissao}=await import('/src/logica/emissao.js');
    const e=prepararEmissao(estado,{dataCorte:'2026-01-05',elaborador:'Pessoa fictícia',aprovador:'',aprovado:false});try{await g.preencherPcmMan002(new Uint8Array([1,2,3]),d.dadosPcmMan002(e));return false;}catch(erro){return erro.message.includes('diferente do esperado');}},estado);
  assert.ok(rejeitou,'Modelo diferente do esperado não pode ser preenchido');
  const gerados={};
  for(const codigo of ['PCM-MAN-001','PCM-MAN-002','PCM-MAN-004','PCM-MAN-008']){
    const base64=await p.evaluate(async({codigo,nome,estado})=>{
      const g=await import('/src/saida/biblioteca-v2-xlsx.js');const d=await import('/src/logica/biblioteca-v2-dados.js');const {prepararEmissao}=await import('/src/logica/emissao.js');
      const e=prepararEmissao(estado,{dataCorte:'2026-01-05',elaborador:'Pessoa fictícia',aprovador:'',aprovado:false});const n=codigo.slice(-3);
      const saida=await g['preencherPcmMan'+n](await(await fetch('/modelos/biblioteca-v2/'+nome)).arrayBuffer(),d['dadosPcmMan'+n](e));
      let s='';for(let i=0;i<saida.length;i+=32768)s+=String.fromCharCode(...saida.subarray(i,i+32768));return btoa(s);
    },{codigo,nome:arquivo(codigo),estado});
    const bytes=Buffer.from(base64,'base64');await writeFile(new URL(codigo+'-expandido.xlsx',pasta),bytes);
    const gerado=await JSZip.loadAsync(bytes);const original=await JSZip.loadAsync(await readFile(new URL('../public/modelos/biblioteca-v2/'+arquivo(codigo),import.meta.url)));
    for(const nome of Object.keys(original.files).filter(n=>n.startsWith('xl/media/')||n.startsWith('xl/drawings/')))assert.deepEqual(await gerado.file(nome).async('uint8array'),await original.file(nome).async('uint8array'),codigo+' '+nome);
    const wb=await gerado.file('xl/workbook.xml').async('string');assert.match(wb,/fullCalcOnLoad="1"/,codigo);
    const tabelas=Object.fromEntries(await Promise.all(Object.keys(gerado.files).filter(n=>/^xl\/tables\/table\d+\.xml$/.test(n)).map(async n=>{const t=await gerado.file(n).async('string');return [/\bname="([^"]+)"/.exec(t)[1],/\bref="([^"]+)"/.exec(t)[1]];})));
    gerados[codigo]={wb,tabelas};
  }
  // Volumes esperados: 41 pessoas (+ elaborador), 100 ativos, 100 linhas de criticidade, 3101 execuções, 1101 falhas.
  assert.equal(gerados['PCM-MAN-001'].tabelas.tb_pcm_referencias,'A4:E46'); // 42 referências
  assert.equal(gerados['PCM-MAN-001'].tabelas.tb_pcm_pessoas,'A4:D46'); // 41 pessoas + elaborador
  assert.equal(gerados['PCM-MAN-002'].tabelas.tb_pcm_ativos,'A4:D104');
  assert.match(gerados['PCM-MAN-002'].wb,/'Criticidade'!\$A\$1:\$Y\$108/);
  assert.equal(gerados['PCM-MAN-008'].tabelas.tb_pcm_falhas??Object.values(gerados['PCM-MAN-008'].tabelas).find(v=>v.startsWith('A4:K')),'A4:M1105');
  const os=gerados['PCM-MAN-004'].tabelas.tb_pcm_os;const linhasOs=Number(/(\d+)$/.exec(os)[1])-4;assert.ok(linhasOs>=3101,'004 com todas as execuções: '+os);
  assert.deepEqual(erros,[]);await contexto.close();
  console.log(`Aprovado: Biblioteca v2 (001, 002, 004 e 008) com 100 ativos, criticidade 1 a 5, ${linhasOs} OS (3101 execuções), 1101 falhas, 42 referências, imagens preservadas, recálculo ao abrir e modelo diferente recusado.`);
}});
