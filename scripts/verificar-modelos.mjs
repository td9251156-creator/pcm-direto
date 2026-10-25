// Exporta com o gerador real, em navegador isolado, sem contas ou rede externa.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import JSZip from 'jszip';
import {montarDados} from '../src/logica/pacote.js';
import {criarGestao} from '../src/logica/gestao.js';
import {prepararRevisao,criarProgramacao} from '../src/logica/programacao.js';
import {executarComRecursos} from './navegador.mjs';
const biblioteca=JSON.parse(await readFile(new URL('../src/dados/biblioteca.json',import.meta.url),'utf8'));
const setor=i=>'S'+String(i%60).padStart(2,'0');
const equipamentos=Array.from({length:100},(_,i)=>({id:'e'+i,setor:setor(i),tipo:'motor_eletrico',descricao:'Motor fictício '+i,numero:i+1,tag:setor(i)+'-MOT-'+String(i+1).padStart(3,'0')}));
const gestao=criarGestao();gestao.organizacao.nome='Fábrica fictícia de teste';gestao.organizacao.setores=Array.from({length:60},(_,i)=>setor(i));
gestao.pessoas=Array.from({length:41},(_,i)=>({id:'p'+i,nome:'Pessoa fictícia '+i,funcao:'Técnico',especialidade:'Mecânica',ativo:true}));
gestao.requisitos=Array.from({length:42},(_,i)=>({id:'q'+i,referencia:'Referência fictícia '+i,versao:'1',data:'2026-01-05',fonte:'https://example.org/',status:'nao_verificado'}));
gestao.historico=Array.from({length:3101},(_,i)=>({id:'h'+i,equipamentoId:'e0',tarefaId:'MOT-01',tag:equipamentos[0].tag,descricao:'Registro fictício '+i,data:'2026-01-05',dataPrevista:'',observacao:'Legado sem vínculo',responsavelId:'',origem:'legado',cancelada:i%2===0}));
gestao.falhas=Array.from({length:1101},(_,i)=>({id:'f'+i,equipamentoId:'e0',tag:equipamentos[0].tag,data:'2026-01-05',sintoma:'Sintoma fictício '+i,causa:'',acao:'',peca:'',responsavelId:'',horasParada:i%2===0?null:0}));
const tarefa=biblioteca.tipos.find(t=>t.id==='motor_eletrico').tarefas[0].id;
const ajustes=Object.fromEntries(equipamentos.map(e=>[`${e.id}|${tarefa}`,{ativa:true,periodicidade:'Diária'}]));
const dados=montarDados(equipamentos,biblioteca,ajustes,'2026-01-05',{});
const r=prepararRevisao(criarProgramacao(),dados,gestao,{id:'r1',vigencia:'2026-01-05',elaborador:'Pessoa fictícia',resumo:'Teste de expansão'},'2026-01-05');assert.ok(r.ok,r.motivo);assert.ok(r.programacao.ocorrencias.length>5000);
const estado={equipamentos,biblioteca,gestao,programacao:r.programacao};
const arquivos=['PCMD-01-Controle-Documental.xlsx','PCMD-02-Ativos-Criticidade.xlsx','PCMD-03-04-Plano-Cronograma.xlsx','PCMD-05-Ficha-Falha.xlsx'];
const ferramenta=process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href;
const {chromium}=await import(ferramenta);const pasta=new URL('../artifacts/modelos-expandidos/',import.meta.url);await mkdir(pasta,{recursive:true});
await executarComRecursos({limiteTotal:240000,criarServidor:async()=>{const servidor=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{host:'127.0.0.1',port:4182,strictPort:true}});await servidor.listen();return servidor;},criarNavegador:()=>chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),executar:async({navegador})=>{
  const contexto=await navegador.newContext({serviceWorkers:'block',acceptDownloads:true});const p=await contexto.newPage();p.setDefaultTimeout(90000);const erros=[];p.on('pageerror',e=>erros.push(e.message));
  await p.route('https://**/*',rota=>rota.abort());await p.route('http://127.0.0.1:4182/',rota=>rota.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><title>Exportação isolada</title><body>Teste local de modelos</body></html>'}));await p.goto('http://127.0.0.1:4182/');
  const rejeitou=await p.evaluate(async estado=>{const {preencherXlsx,prepararEmissao}=await import('/src/saida/pcmd.js');const e=prepararEmissao(estado,{dataCorte:'2026-01-05',elaborador:'Pessoa fictícia',aprovador:'',aprovado:false});try{await preencherXlsx(new Uint8Array([1,2,3]),'PCMD-01-Controle-Documental.xlsx',e);return false;}catch(erro){return erro.message.includes('Modelo incompatível');}},estado);assert.ok(rejeitou,'Modelo incompatível não pode ser preenchido');
  for(const arquivo of arquivos){
    const [download]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(async({arquivo,estado})=>{
      const {preencherXlsx,prepararEmissao}=await import('/src/saida/pcmd.js');const e=prepararEmissao(estado,{dataCorte:'2026-01-05',elaborador:'Pessoa fictícia',aprovador:'',aprovado:false});
      const bytes=await(await fetch('/modelos/'+arquivo)).arrayBuffer();const saida=await preencherXlsx(bytes,arquivo,e);const url=URL.createObjectURL(new Blob([saida]));const a=document.createElement('a');a.href=url;a.download=arquivo;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },{arquivo,estado})]);
    const destino=new URL(arquivo,pasta);await download.saveAs(fileURLToPath(destino));const bytes=await readFile(destino);
    const gerado=await JSZip.loadAsync(bytes);const original=await JSZip.loadAsync(await readFile(new URL('../public/modelos/'+arquivo,import.meta.url)));
    const partes=Object.fromEntries(await Promise.all(Object.keys(gerado.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)||n==='xl/workbook.xml').map(async n=>[n,await gerado.file(n).async('string')])));
    // Leitura XML nativa: ExcelJS não abre nem o original recebido com drawing Target absoluto.
    const inspecao=await p.evaluate(partes=>{
      const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';const ler=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw new Error('XML inválido');return d;};
      const wb=ler(partes['xl/workbook.xml']);const resultado={};const alvos=new Set(['B7','A4','A16','A56','A58','A60','A101','G60','B29','B30','D29','A103','E4','A82','T3','C4','A3104','A1104','H4','H5']);
      [...wb.getElementsByTagNameNS(ns,'sheet')].forEach((aba,i)=>{
        const d=ler(partes[`xl/worksheets/sheet${i+1}.xml`]);const cells={};const cs=[...d.getElementsByTagNameNS(ns,'c')];const ultimaA=cs.filter(c=>/^A\d+$/.test(c.getAttribute('r'))).at(-1)?.getAttribute('r');
        for(const c of cs)if(alvos.has(c.getAttribute('r'))||c.getAttribute('r')===ultimaA){const v=c.getElementsByTagNameNS(ns,'v')[0];const textos=[...c.getElementsByTagNameNS(ns,'t')].map(t=>t.textContent).join('');cells[c.getAttribute('r')]={value:v?Number(v.textContent):textos||null,formula:c.getElementsByTagNameNS(ns,'f')[0]?.textContent};}
        const print=[...wb.getElementsByTagNameNS(ns,'definedName')].find(n=>n.getAttribute('name')==='_xlnm.Print_Area'&&Number(n.getAttribute('localSheetId'))===i)?.textContent||'';
        resultado[aba.getAttribute('name')]={cells,print};
      });return resultado;
    },partes);
    const wb={getWorksheet:nome=>({getCell:ref=>inspecao[nome].cells[ref]||{value:null},pageSetup:{printArea:inspecao[nome].print}})};
    for(const nome of Object.keys(original.files).filter(n=>n.startsWith('xl/media/')||n.startsWith('xl/drawings/')))assert.deepEqual(await gerado.file(nome).async('uint8array'),await original.file(nome).async('uint8array'),nome);
    if(arquivo.startsWith('PCMD-01')){
      const c=wb.getWorksheet('Cadastros');assert.equal(c.getCell('B7').value,gestao.organizacao.nome);assert.equal(c.getCell('A16').value,'p0');assert.equal(c.getCell('A56').value,'p40');assert.equal(c.getCell('A58').value,'3    REQUISITOS E REFERÊNCIAS');assert.equal(c.getCell('A60').value,'q0');assert.equal(c.getCell('A101').value,'q41');assert.ok(c.getCell('G60').formula.includes('F60=')&&c.getCell('G60').formula.includes('ISNUMBER(D60)'));assert.ok(c.pageSetup.printArea.includes('101'));
      const cfg=wb.getWorksheet('Config');assert.ok(cfg.getCell('B29').formula.includes('56'));assert.ok(cfg.getCell('B30').formula.includes('101'));assert.ok(cfg.getCell('D29').formula.includes('COUNTA(cad_pessoa_id)=41'));
      const xml=await gerado.file('xl/worksheets/sheet3.xml').async('string');assert.ok(xml.includes('LEN(A60)'));assert.ok(xml.includes('LEFT(E60,8)'));assert.ok(xml.includes('LEFT(G60,4)'));
    }else if(arquivo.startsWith('PCMD-02')){
      const a=wb.getWorksheet('Ativos');assert.equal(a.getCell('A4').value,'e0');assert.equal(a.getCell('A103').value,'e99');assert.ok(a.getCell('E4').formula.includes('INDEX'));assert.ok(a.pageSetup.printArea.includes('103'));assert.equal(wb.getWorksheet('Cadastros').getCell('A82').value,'S59');
    }else if(arquivo.startsWith('PCMD-03')){
      assert.equal(wb.getWorksheet('Plano Mestre').getCell('A4').value,'e0');assert.equal(wb.getWorksheet('Plano Mestre').getCell('T3').value,'Revisão do plano (ID)');assert.ok(wb.getWorksheet('Plano Mestre').getCell('C4').formula.includes('T4'));
      assert.equal(wb.getWorksheet('Execuções').getCell('A3104').value,'h3100');assert.ok(wb.getWorksheet('Execuções').pageSetup.printArea.includes('3104'));assert.equal(wb.getWorksheet('Ocorrências').getCell('A'+(r.programacao.ocorrencias.length+3)).value,r.programacao.ocorrencias.at(-1).equipamentoId);
    }else{const f=wb.getWorksheet('Ficha de Falha');assert.equal(f.getCell('A4').value,'f0');assert.equal(f.getCell('A1104').value,'f1100');assert.equal(f.getCell('H4').value,null);assert.equal(f.getCell('H5').value,0);assert.ok(f.pageSetup.printArea.includes('1104'));}
  }
  assert.deepEqual(erros,[]);await contexto.close();console.log('Aprovado: modelos 2.0.0, expansão sem sobreposição, 41 pessoas, 42 referências, 60 setores, 100 ativos, ocorrências anuais, 3101 execuções, 1101 falhas, fórmulas, validações, impressão, imagens e modelo incompatível recusado.');
}});
