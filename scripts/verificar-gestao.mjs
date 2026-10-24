// Roteiro real de navegador para a base IndexedDB e os documentos PCMD.
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { EXEMPLO } from '../src/dados/exemplo.js';
import { atribuirTags } from '../src/logica/tag.js';
import { iniciarServidor,aguardarOffline,executarComRecursos } from './navegador.mjs';
const ferramenta=process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href;
const {chromium}=await import(ferramenta);const raiz=fileURLToPath(new URL('../',import.meta.url));
const biblioteca=JSON.parse(await readFile(new URL('../src/dados/biblioteca.json',import.meta.url),'utf8'));
const equipamentos=atribuirTags(EXEMPLO.map((e,i)=>({...e,id:'eq'+i})),Object.fromEntries(biblioteca.tipos.map(t=>[t.id,t.sigla])));
const d=new Date();const hoje=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const v1={aplicativo:'PCM Direto',versao:1,biblioteca,rascunho:{equipamentos,ajustes:{},execucoes:{},exemplo:false,inicio:hoje,capacidade:{}}};
await executarComRecursos({
 criarServidor:()=>iniciarServidor({raiz}),criarNavegador:()=>chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[],timeout:20000}),limiteTotal:240000,
 executar:async({navegador:browser})=>{
  const contexto=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,colorScheme:'dark'});contexto.setDefaultTimeout(20000);
  const page=await contexto.newPage();const erros=[];page.on('pageerror',e=>{erros.push(e.message);console.error('Erro de página:',e.stack);});
  async function rascunho(alvo=page){return alvo.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const t=db.transaction('base');const q=t.objectStore('base').get('principal');t.oncomplete=()=>{db.close();resolve(q.result?.dados.rascunho);};};}));}
  const ir=async rota=>{await page.goto('http://127.0.0.1:4175/#'+rota);await page.waitForFunction(r=>location.hash==='#'+r && document.querySelector('#conteudo h2'),rota);await page.waitForTimeout(100);};
  await page.goto('http://127.0.0.1:4175/');await page.getByRole('heading',{name:'Conhecimento aberto. Manutenção melhor organizada.'}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-tema'),'claro');assert.equal(await page.locator('#tema').count(),0);
  const [modelo]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Baixar modelo',exact:true}).first().click()]);
  assert.deepEqual(await readFile(await modelo.path()),await readFile('public/modelos/PCMD-01-Controle-Documental.xlsx'));
  assert.equal((await rascunho()).equipamentos.length,0);
  await ir('inicio');await page.locator('#demonstrar').click();await page.locator('#sair-demo').waitFor();assert.equal((await rascunho()).equipamentos.length,0,'Exemplo não pode substituir base local');await page.locator('#sair-demo').click();
  await ir('dados');await page.locator('#restaurar-backup').setInputFiles({name:'antigo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(v1))});await page.locator('#confirmar-backup').click();await page.waitForURL('**/#semana');assert.equal((await rascunho()).equipamentos.length,equipamentos.length);
  await ir('equipamentos');await page.locator('.pular').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'conteudo');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await ir('cadastros');await page.locator('#g-nome').fill('Indústria Exemplo');await page.locator('#g-pessoa-nome').fill('Pessoa A');await page.locator('#g-funcao').fill('Responsável fictício');await page.locator('#g-especialidade').fill('Elétrica');await page.locator('#salvar-pessoa').click();await page.getByRole('button',{name:'Editar Pessoa A',exact:true}).waitFor();assert.equal(await page.locator('#g-nome').inputValue(),'Indústria Exemplo');await page.locator('#salvar-organizacao').click();
  await ir('criticidade');for(const [i,nota]of [3,1,1,1,1].entries())await page.locator('.avaliacao').first().locator(`[name="nota-${i}"]`).selectOption(String(nota));await page.locator('.avaliacao').first().getByRole('button').click();await page.waitForFunction(()=>document.querySelector('.avaliacao')?.textContent.includes('Classe: A'));
  await ir('revisao');const cap=page.locator('.capacidade').first();await cap.focus();const capId=await cap.getAttribute('id');await cap.press('ArrowUp');await page.waitForFunction(id=>document.activeElement?.id===id,capId);await cap.press('ArrowUp');await page.waitForFunction(id=>document.activeElement?.id===id,capId);assert.equal(Number(await cap.inputValue()),1);await cap.fill('2');await cap.press('Tab');
  await ir('biblioteca');await page.locator('#importar-json').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('null')});await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('Biblioteca não importada'));assert.equal(await page.locator('#tipos > details').count(),4);
  await ir('planejar');await page.locator('#rev-elaborador').fill('Pessoa A');await page.locator('#rev-resumo').fill('Plano inicial fictício');await page.locator('#form-revisao button').click();await page.locator('#confirmar-revisao').click();await page.waitForURL('**/#semana');const inicial=await rascunho();assert.equal(inicial.programacao.revisoes.length,1);assert.ok(inicial.programacao.ocorrencias.length>0);
  await ir('executar');await page.locator('#f-situacao').selectOption('todas');await page.locator('[data-feito]').first().click();await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('registrada'));const apos=await rascunho();assert.equal(apos.gestao.historico.length,1);assert.ok(apos.gestao.historico[0].ocorrenciaId);assert.equal(apos.programacao.ocorrencias.length,inicial.programacao.ocorrencias.length);
  page.once('dialog',d=>d.accept());await page.locator('[data-cancelar]').first().click();await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('cancelada'));assert.equal((await rascunho()).gestao.historico[0].cancelada,true);
  await ir('falhas');await page.locator('#falha-equipamento').selectOption({index:1});await page.locator('#g-sintoma').fill('Ruído fictício');await page.locator('#salvar-falha').click();await page.getByRole('button',{name:'Corrigir registro'}).waitFor();assert.equal((await rascunho()).gestao.falhas[0].horasParada,null);
  await ir('dados');const [backup]=await Promise.all([page.waitForEvent('download'),page.locator('#baixar-backup').click()]);const bytesBackup=await readFile(await backup.path());assert.equal(JSON.parse(bytesBackup).versao,3);
  await aguardarOffline(page);await contexto.setOffline(true);await page.reload();await page.locator('#baixar-backup').waitFor();await ir('entrega');
  console.log('Iniciando emissão:',await page.title(),await page.locator('#gerar-pcmd').count());
  const download=page.waitForEvent('download',{timeout:90000}).catch(async erro=>{throw new Error(erro.message+' · '+await page.locator('#conteudo').innerText());});
  await page.locator('#gerar-pcmd').click();const pacote=await download;const zip=await JSZip.loadAsync(await readFile(await pacote.path()));
  await mkdir('artifacts/pcmd',{recursive:true});
  for(const nome of Object.keys(zip.files).filter(n=>/\.(xlsx|docx)$/.test(n))){const bytes=await zip.file(nome).async('nodebuffer');await writeFile('artifacts/pcmd/'+nome,bytes);const gerado=await JSZip.loadAsync(bytes);const original=await JSZip.loadAsync(await readFile('public/modelos/'+nome.replace('-Preenchido','')));for(const parte of Object.keys(original.files).filter(n=>/\/(media|drawings)\//.test(n)&&!original.files[n].dir))assert.deepEqual(await gerado.file(parte).async('nodebuffer'),await original.file(parte).async('nodebuffer'),nome+' preserva mídia e desenhos');
    if(nome.endsWith('.docx')){for(const parte of Object.keys(gerado.files).filter(n=>/^word\/.*\.xml$/.test(n)))assert.ok(!(await gerado.file(parte).async('string')).includes('{{'),'Marcador pendente em '+nome+'/'+parte);assert.ok((await gerado.file('word/document.xml').async('string')).includes('Indústria Exemplo'));}
    else{assert.ok((await gerado.file('xl/workbook.xml').async('string')).includes('fullCalcOnLoad="1"'));assert.ok(Object.keys(gerado.files).some(n=>n.startsWith('xl/worksheets/')));}
  }
  assert.equal(Object.keys(zip.files).filter(n=>/\.(xlsx|docx)$/.test(n)).length,6);
  await contexto.setOffline(false);await ir('dados');
  const semExecucoes=structuredClone(v1);delete semExecucoes.rascunho.execucoes;
  await page.locator('#restaurar-backup').setInputFiles({name:'v1-sem-execucoes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(semExecucoes))});await page.locator('#confirmar-backup').click();await page.waitForURL('**/#semana');
  assert.equal((await rascunho()).gestao.historico.length,0,'Backup antigo sem execuções não herda o histórico anterior');
  await ir('dados');await page.locator('#restaurar-backup').setInputFiles({name:'backup-v3.json',mimeType:'application/json',buffer:bytesBackup});await page.locator('#confirmar-backup').click();await page.waitForURL('**/#semana');
  assert.equal((await rascunho()).gestao.historico.length,1);assert.equal((await rascunho()).programacao.revisoes.length,1);
  await contexto.setOffline(false);await ir('dados');const antes=await rascunho();await page.locator('#restaurar-backup').setInputFiles({name:'danificado.json',mimeType:'application/json',buffer:Buffer.from('{')});await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('inválido'));assert.deepEqual(await rascunho(),antes);
  const outra=await contexto.newPage();await outra.goto('http://127.0.0.1:4175/#cadastros');await outra.locator('#g-nome').waitFor();await ir('cadastros');await page.locator('#g-nome').fill('Indústria Exemplo revisada');await page.locator('#salvar-organizacao').click();await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('guardados'));await outra.locator('#g-nome').fill('Alteração concorrente fictícia');await outra.locator('#salvar-organizacao').click();await outra.locator('#aviso-armazenamento').waitFor({state:'visible'});assert.equal((await rascunho()).gestao.organizacao.nome,'Indústria Exemplo revisada');await outra.close();
  const recuperacao=await browser.newContext();await recuperacao.addInitScript(()=>localStorage.setItem('pcm-direto:rascunho:v1','{'));const rec=await recuperacao.newPage();await rec.goto('http://127.0.0.1:4175/');await rec.getByRole('button',{name:'Baixar dados originais para recuperação'}).waitFor();assert.equal(await rec.evaluate(()=>localStorage.getItem('pcm-direto:rascunho:v1')),'{');await recuperacao.close();
  const quota=await browser.newContext();await quota.addInitScript(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(sessionStorage.getItem('simular-quota')){this.transaction.abort();throw new DOMException('Quota de teste excedida','QuotaExceededError');}return original.apply(this,args);};});
  const q=await quota.newPage();await q.goto('http://127.0.0.1:4175/#cadastros');await q.locator('#g-nome').waitFor();const salvo=await rascunho(q);await q.evaluate(()=>sessionStorage.setItem('simular-quota','1'));await q.locator('#g-nome').fill('Não deve ser persistido');await q.locator('#salvar-organizacao').click();await q.locator('#aviso-armazenamento').waitFor({state:'visible'});assert.deepEqual(await rascunho(q),salvo);await quota.close();
  assert.deepEqual(erros,[]);console.log('Aprovado: comunidade inicial, tema claro, modelos originais, exemplo isolado, migração v1→v3, cadastros, criticidade, capacidade/teclado, importação inválida, revisão, execução/cancelamento, falha, backup, seis documentos offline, concorrência e recuperação.');
 },
});
