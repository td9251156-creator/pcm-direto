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
assert.deepEqual(await readFile(new URL('../dist/atualizar.html',import.meta.url)),await readFile(new URL('../dist/index.html',import.meta.url)),'Entrada de atualização usa o mesmo aplicativo');
const publicada=JSON.parse(await readFile(new URL('../dist/versao-atual.json',import.meta.url),'utf8'));
assert.deepEqual(await readFile(new URL('../dist/'+publicada.entrada,import.meta.url)),await readFile(new URL('../dist/index.html',import.meta.url)),'Recuperação identificada pela versão usa HTML do build');
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
  const logo=page.locator('.marca img');await logo.evaluate(img=>img.decode());
  assert.ok((await logo.getAttribute('src')).endsWith('/PCM-Direto_horizontal-slogan_cor.svg'));
  for(const largura of [320,390,820,1280]){
    await page.setViewportSize({width:largura,height:900});
    await logo.evaluate(img=>img.decode());const proporcao=await logo.evaluate(img=>img.naturalWidth/img.naturalHeight);
    const medidas=await logo.boundingBox();assert.ok(Math.abs(medidas.width/medidas.height-proporcao)<0.01,'Logo mantém proporção');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Layout não cria rolagem horizontal');
    assert.equal(await page.locator('.marca-slogan').count(),0,'Slogan pertence ao SVG oficial, sem reconstrução em HTML');
    assert.equal(await logo.getAttribute('alt'),'PCM Direto — Manutenção planejada. Direto ao ponto.');
    assert.ok((await logo.boundingBox()).width>=220,'Assinatura oficial mantém largura legível');
    await page.locator('.marca').screenshot({path:`artifacts/marca-corrigida-${largura}.png`});
    await page.screenshot({path:`artifacts/comunidade-${largura}.png`,fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#explorar-modelos').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'buscar-modelos');
  await page.locator('#buscar-modelos').fill('criticidade');assert.equal(await page.locator('#banco-modelos article').count(),1);
  await page.locator('#buscar-modelos').fill('termo-sem-resultados');await page.locator('#limpar-busca').click();assert.equal(await page.locator('#banco-modelos article').count(),19);assert.equal(await page.evaluate(()=>document.activeElement.id),'buscar-modelos');
  await page.locator('#categoria-maquinas').click();assert.equal(await page.locator('#categoria-maquinas').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#banco-modelos article').count(),biblioteca.tipos.length);
  await page.locator('#buscar-modelos').fill('  ELETRICO rolamentos ');
  assert.equal(await page.locator('#banco-modelos article').count(),1);
  await page.locator('.previa-tarefas summary').focus();
  await page.locator('.previa-tarefas summary').press('Enter');
  assert.equal(await page.locator('.previa-tarefas li').count(),biblioteca.tipos[0].tarefas.length);
  assert.ok(await page.locator('.previa-tarefas').innerText().then(t=>t.includes('MOT-08')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Prévia cabe no celular');
  await page.screenshot({path:'artifacts/previa-tarefas-celular.png',fullPage:true});
  await page.locator('#buscar-modelos').fill('bomba');
  await page.locator('.previa-tarefas summary').click();
  assert.ok((await page.locator('.previa-tarefas').innerText()).includes('0,25 h por execução'),'Prévia preserva quartos de hora');
  await page.locator('#buscar-modelos').fill('');
  for(const tipo of biblioteca.tipos){
    const [pdf]=await Promise.all([page.waitForEvent('download'),page.locator(`a[href="./modelos/maquinas/pcm-modelo-${tipo.id}.pdf"]`).click()]);
    assert.deepEqual(await readFile(await pdf.path()),await readFile(`public/modelos/maquinas/pcm-modelo-${tipo.id}.pdf`));
    assert.equal((await readFile(await pdf.path())).subarray(0,5).toString(),'%PDF-');
  }
  await page.locator('#categoria-documentos').click();
  const [modelo]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Baixar Controle documental em Excel',exact:true}).click()]);
  assert.deepEqual(await readFile(await modelo.path()),await readFile('public/modelos/biblioteca-v2/PCM-MAN-001_Controle-Documental_R00.xlsx'));
  // Downloads da Comunidade são os 19 modelos da Biblioteca PCM v2; exemplos e prévias antigos foram retirados.
  assert.equal(await page.locator('a[href*="-Exemplo."],a[href*="/previas/"]').count(),0);
  const previas=await page.locator('a[href^="./modelos/biblioteca-v2/"]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));assert.equal(previas.length,19);
  await contexto.setOffline(true);
  // Confere todos os arquivos offline sem simular uma rajada de downloads automáticos.
  for(const href of previas){const bytes=await page.evaluate(async href=>{const r=await fetch(href);if(!r.ok)throw new Error('Modelo indisponível: '+href);return Array.from(new Uint8Array(await r.arrayBuffer()));},href);assert.deepEqual(Buffer.from(bytes),await readFile('public/'+href.slice(2)),href);}
  const href=previas[0];const [pdf]=await Promise.all([page.waitForEvent('download'),page.locator(`a[href="${href}"]`).click()]);assert.deepEqual(await readFile(await pdf.path()),await readFile('public/'+href.slice(2)));
  await contexto.setOffline(false);
  assert.equal((await rascunho()).equipamentos.length,0);
  await ir('inicio');await page.locator('#demonstrar').click();await page.locator('#sair-demo').waitFor();assert.equal((await rascunho()).equipamentos.length,0,'Exemplo não pode substituir base local');await page.locator('#sair-demo').click();
  await ir('dados');await page.locator('#restaurar-backup').setInputFiles({name:'antigo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(v1))});await page.locator('#confirmar-backup').click();await page.waitForURL('**/#semana');assert.equal((await rascunho()).equipamentos.length,equipamentos.length);
  await ir('equipamentos');await page.locator('.pular').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'conteudo');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await ir('cadastros');await page.locator('#g-nome').fill('Indústria Exemplo');await page.locator('#g-pessoa-nome').fill('Pessoa A');await page.locator('#g-funcao').fill('Responsável fictício');await page.locator('#g-especialidade').fill('Elétrica');await page.locator('#salvar-pessoa').click();await page.getByRole('button',{name:'Editar Pessoa A',exact:true}).waitFor();assert.equal(await page.locator('#g-nome').inputValue(),'Indústria Exemplo');await page.locator('#salvar-organizacao').click();
  await ir('criticidade');for(const [i,nota]of [3,1,1,1,1].entries())await page.locator('.avaliacao').first().locator(`[name="nota-${i}"]`).selectOption(String(nota));await page.locator('.avaliacao').first().getByRole('button').click();await page.waitForFunction(()=>document.querySelector('.avaliacao')?.textContent.includes('Classe: A'));
  await ir('revisao');const cap=page.locator('.capacidade').first();await cap.focus();const capId=await cap.getAttribute('id');await cap.press('ArrowUp');await page.waitForFunction(id=>document.activeElement?.id===id,capId);await cap.press('ArrowUp');await page.waitForFunction(id=>document.activeElement?.id===id,capId);assert.equal(Number(await cap.inputValue()),1);
  // Atrasa a confirmação da próxima escrita para sair da tela durante o salvamento.
  await page.evaluate(()=>{const prototipo=IDBTransaction.prototype;const original=Object.getOwnPropertyDescriptor(prototipo,'oncomplete');Object.defineProperty(prototipo,'oncomplete',{...original,set(callback){if(this.mode==='readwrite'){Object.defineProperty(prototipo,'oncomplete',original);original.set.call(this,event=>setTimeout(()=>callback.call(this,event),300));}else original.set.call(this,callback);}});});
  await cap.fill('2');await cap.press('Tab');
  await ir('biblioteca');await page.locator('#importar-json').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('null')});await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('Biblioteca não importada'));assert.equal(await page.locator('#tipos > details').count(),biblioteca.tipos.length);
  await ir('planejar');await page.locator('#rev-elaborador').fill('Pessoa A');await page.locator('#rev-resumo').fill('Plano inicial fictício');await page.locator('#form-revisao button').click();
  assert.equal(await page.locator('#titulo-impacto').evaluate(e=>document.activeElement===e),true);
  await page.locator('#rev-resumo').fill('Plano inicial conferido novamente');assert.equal(await page.locator('#confirmar-revisao').count(),0);await page.locator('#aviso-previa').filter({hasText:'Os campos mudaram'}).waitFor();
  await page.locator('#form-revisao button').click();await page.locator('#voltar-rascunho').click();assert.equal(await page.locator('#confirmar-revisao').count(),0);
  await page.locator('#form-revisao button').click();await page.locator('#confirmar-revisao').click();await page.waitForURL('**/#semana');const inicial=await rascunho();assert.equal(inicial.programacao.revisoes.length,1);assert.ok(inicial.programacao.ocorrencias.length>0);
  await ir('executar');await page.locator('#chips-especialidade button').first().focus();await page.locator('#chips-especialidade button').first().press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.dataset.especialidade),'','Filtro mantém foco após redesenhar');await page.locator('[data-periodo="todas"]').click();await page.locator('[data-feito]').first().click();await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('registrada'));const apos=await rascunho();assert.equal(apos.gestao.historico.length,1);assert.ok(apos.gestao.historico[0].ocorrenciaId);assert.equal(apos.programacao.ocorrencias.length,inicial.programacao.ocorrencias.length);
  await page.locator('[data-cancelar]').first().click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancelar execução',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('cancelada'));assert.equal((await rascunho()).gestao.historico[0].cancelada,true);
  await page.locator('[data-detalhes]').first().click();
  const painel=page.getByRole('dialog');await painel.waitFor();
  assert.equal(await painel.locator('input[type=date]').inputValue(),hoje);
  await painel.getByRole('button',{name:'Ontem',exact:true}).click();
  await painel.locator('textarea').fill('Execução fictícia pelo painel');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog'));assert.equal(await page.getByRole('dialog').count(),0);
  assert.ok(await page.locator('[data-detalhes]').first().evaluate(b=>b===document.activeElement),'Escape devolve foco');
  await page.locator('[data-detalhes]').first().click();
  await painel.getByRole('button',{name:'Registrar execução',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('dialog'));
  assert.equal((await rascunho()).gestao.historico.length,2);
  await page.locator('[data-detalhes]').first().click();
  await page.evaluate(()=>{const p=IDBTransaction.prototype;const original=Object.getOwnPropertyDescriptor(p,'oncomplete');Object.defineProperty(p,'oncomplete',{...original,set(callback){if(this.mode==='readwrite'){Object.defineProperty(p,'oncomplete',original);original.set.call(this,event=>setTimeout(()=>callback.call(this,event),400));}else original.set.call(this,callback);}});});
  await painel.getByRole('button',{name:'Registrar execução',exact:true}).click();
  await page.evaluate(()=>{location.hash='dados';});await page.locator('#baixar-backup').waitFor();
  await page.waitForTimeout(650);
  assert.equal(await page.locator('#baixar-backup').count(),1,'Conclusão atrasada não redesenha a rota anterior');
  await ir('semana');await page.screenshot({path:'artifacts/handoff-semana-mobile.png',fullPage:true});
  await ir('ativos');await page.locator('#buscar-ativos').fill('motor');
  await page.locator('[data-ativo]').first().click();
  await page.locator('#falha-no-ativo').waitFor({state:'visible'});
  const tagAtivo=await page.locator('#titulo-ativo').innerText();
  await page.screenshot({path:'artifacts/handoff-ativo-mobile.png',fullPage:true});
  await page.locator('#falha-no-ativo').click();await page.locator('#form-falha').waitFor();
  assert.ok(tagAtivo.includes(await page.locator('#falha-equipamento option:checked').innerText().then(t=>t.split(' · ')[0])),'Falha recebe o ativo escolhido');
  await page.setViewportSize({width:1280,height:900});await ir('ativos');
  assert.ok(await page.locator('#detalhe-ativo').isVisible(),'Desktop mostra ficha e lista juntas');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Ativos desktop sem rolagem horizontal');
  await page.screenshot({path:'artifacts/handoff-ativos-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await ir('falhas');await page.locator('#falha-equipamento').selectOption({index:1});await page.locator('#g-sintoma').fill('Ruído fictício');await page.locator('#salvar-falha').click();await page.getByRole('button',{name:'Corrigir registro'}).waitFor();assert.equal((await rascunho()).gestao.falhas[0].horasParada,null);
  await ir('dados');const [backup]=await Promise.all([page.waitForEvent('download'),page.locator('#baixar-backup').click()]);const bytesBackup=await readFile(await backup.path());assert.equal(JSON.parse(bytesBackup).versao,3);
  await aguardarOffline(page);await contexto.setOffline(true);await page.reload();await page.locator('#baixar-backup').waitFor();
  await ir('comunidade');await page.locator('#categoria-maquinas').click();
  const [pdfOffline]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Baixar modelo em PDF',exact:true}).first().click()]);
  assert.equal((await readFile(await pdfOffline.path())).subarray(0,5).toString(),'%PDF-');
  await ir('biblioteca');await page.locator('#tipos > details').first().locator('summary').click();
  const [fichaLocal]=await Promise.all([page.waitForEvent('popup'),page.locator('.ficha-tipo').first().click()]);
  await fichaLocal.getByRole('heading',{name:'Motor elétrico',exact:true}).waitFor();
  await fichaLocal.locator('img').evaluate(img=>img.decode());
  assert.ok((await fichaLocal.locator('body').innerText()).includes('MOT-08'));
  const fichaLocalPdf=await fichaLocal.pdf({path:'artifacts/ficha-local.pdf',format:'A4',printBackground:true});
  assert.equal(fichaLocalPdf.subarray(0,5).toString(),'%PDF-');
  await fichaLocal.close();
  await ir('entrega');
  await mkdir('artifacts/pcmd',{recursive:true});
  const emissoesAntes=(await rascunho()).programacao.emissoes.length;
  const botoes=page.locator('[data-documento]');assert.equal(await botoes.count(),8);
  for(let i=0;i<8;i++){
    const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),botoes.nth(i).click()]);
    const nome=download.suggestedFilename();assert.match(nome,/\.(xlsx|docx)$/);const bytes=await readFile(await download.path());
    await writeFile('artifacts/pcmd/'+nome,bytes);const gerado=await JSZip.loadAsync(bytes);const original=await JSZip.loadAsync(await readFile('public/modelos/'+(nome.startsWith('PCM-MAN-')?'biblioteca-v2/':'')+nome.replace('-Preenchido','')));
    for(const parte of Object.keys(original.files).filter(n=>/\/(media|drawings)\//.test(n)&&!original.files[n].dir))assert.deepEqual(await gerado.file(parte).async('nodebuffer'),await original.file(parte).async('nodebuffer'),nome+' preserva mídia e desenhos');
    if(nome.endsWith('.docx')){for(const parte of Object.keys(gerado.files).filter(n=>/^word\/.*\.xml$/.test(n)))assert.ok(!(await gerado.file(parte).async('string')).includes('{{'),'Marcador pendente em '+nome+'/'+parte);assert.ok((await gerado.file('word/document.xml').async('string')).includes('Indústria Exemplo'));}
    else{assert.ok((await gerado.file('xl/workbook.xml').async('string')).includes('fullCalcOnLoad="1"'));assert.ok(Object.keys(gerado.files).some(n=>n.startsWith('xl/worksheets/')));}
    const emissoes=(await rascunho()).programacao.emissoes;assert.equal(emissoes.length,emissoesAntes+i+1,'Uma emissão registra somente o documento escolhido');assert.equal(emissoes.at(-1).modelo,await botoes.nth(i).getAttribute('value'));
  }
  await page.setViewportSize({width:1280,height:900});await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});await page.screenshot({path:'artifacts/documentos-pc.jpg',type:'jpeg',quality:85});await page.setViewportSize({width:390,height:844});
  const aprovacao=page.locator('#emissao-aprovada');await aprovacao.locator('xpath=ancestor::details').evaluate(d=>d.open=true);await aprovacao.check();await aprovacao.locator('xpath=ancestor::details').evaluate(d=>d.open=false);await botoes.first().click();assert.equal(await page.locator('#emissao-aprovador').isVisible(),true);assert.equal(await page.locator('#emissao-aprovador').evaluate(e=>e===document.activeElement),true);await aprovacao.uncheck();

  await contexto.setOffline(false);await page.goto('http://127.0.0.1:4175/atualizar.html#dados');await page.locator('#baixar-backup').waitFor();assert.equal((await rascunho()).gestao.historico.length,3,'Entrada atualizada preserva a mesma base');await ir('dados');
  const semExecucoes=structuredClone(v1);delete semExecucoes.rascunho.execucoes;
  await page.locator('#restaurar-backup').setInputFiles({name:'v1-sem-execucoes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(semExecucoes))});await page.locator('#confirmar-backup').click();await page.waitForURL('**/#semana');
  assert.equal((await rascunho()).gestao.historico.length,0,'Backup antigo sem execuções não herda o histórico anterior');
  await ir('dados');await page.locator('#restaurar-backup').setInputFiles({name:'backup-v3.json',mimeType:'application/json',buffer:bytesBackup});await page.locator('#confirmar-backup').click();await page.waitForURL('**/#semana');
  assert.equal((await rascunho()).gestao.historico.length,3);assert.equal((await rascunho()).programacao.revisoes.length,1);
  await contexto.setOffline(false);await ir('dados');const antes=await rascunho();await page.locator('#restaurar-backup').setInputFiles({name:'danificado.json',mimeType:'application/json',buffer:Buffer.from('{')});await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('inválido'));assert.deepEqual(await rascunho(),antes);
  const outra=await contexto.newPage();await outra.goto('http://127.0.0.1:4175/#cadastros');await outra.locator('#g-nome').waitFor();await ir('cadastros');await page.locator('#g-nome').fill('Indústria Exemplo revisada');await page.locator('#salvar-organizacao').click();await page.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('guardados'));await outra.locator('#g-nome').fill('Alteração concorrente fictícia');await outra.locator('#salvar-organizacao').click();await outra.locator('#aviso-armazenamento').waitFor({state:'visible'});assert.equal((await rascunho()).gestao.organizacao.nome,'Indústria Exemplo revisada');await outra.close();
  const recuperacao=await browser.newContext();await recuperacao.addInitScript(()=>localStorage.setItem('pcm-direto:rascunho:v1','{'));const rec=await recuperacao.newPage();await rec.goto('http://127.0.0.1:4175/');await rec.getByRole('button',{name:'Baixar dados originais para recuperação'}).waitFor();assert.equal(await rec.evaluate(()=>localStorage.getItem('pcm-direto:rascunho:v1')),'{');await recuperacao.close();
  const quota=await browser.newContext();await quota.addInitScript(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(sessionStorage.getItem('simular-quota')){this.transaction.abort();throw new DOMException('Quota de teste excedida','QuotaExceededError');}return original.apply(this,args);};});
  const q=await quota.newPage();await q.goto('http://127.0.0.1:4175/#cadastros');await q.locator('#g-nome').waitFor();const salvo=await rascunho(q);await q.evaluate(()=>sessionStorage.setItem('simular-quota','1'));await q.locator('#g-nome').fill('Não deve ser persistido');await q.locator('#salvar-organizacao').click();await q.locator('#aviso-armazenamento').waitFor({state:'visible'});assert.deepEqual(await rascunho(q),salvo);await quota.close();
  assert.deepEqual(erros,[]);console.log('Aprovado: comunidade inicial, tema claro, modelos originais, exemplo isolado, migração v1→v3, cadastros, criticidade, capacidade/teclado, importação inválida, revisão, execução/cancelamento, falha, backup, oito documentos offline (inclui PCM-MAN-001 e 002 v2), concorrência e recuperação.');
 },
});
