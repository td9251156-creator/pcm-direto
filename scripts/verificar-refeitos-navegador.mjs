import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import JSZip from 'jszip';
import {executarComRecursos} from './navegador.mjs';
const contrato=JSON.parse(await readFile(new URL('../src/dados/modelos-refeitos.json',import.meta.url),'utf8'));
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const output=new URL('../artifacts/refeitos/gerados/',import.meta.url);await mkdir(output,{recursive:true});
await executarComRecursos({limiteTotal:240000,criarServidor:async()=>{const s=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{host:'127.0.0.1',port:4194,strictPort:true,watch:{ignored:['**/artifacts/**']}}});await s.listen();return s;},criarNavegador:()=>chromium.launch(),executar:async({navegador})=>{
  const context=await navegador.newContext({acceptDownloads:true,serviceWorkers:'block',viewport:{width:390,height:844}});const p=await context.newPage();p.setDefaultTimeout(180000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**/*',r=>r.abort());
  await p.goto('http://127.0.0.1:4194/#modelos');await p.locator('#buscar-documentos').waitFor();assert.equal(await p.locator('.modelo-documental').count(),18);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('#buscar-documentos').fill('estoque');assert.ok(await p.locator('.modelo-documental').count()>0);await p.locator('#buscar-documentos').fill('');
  for(const m of contrato.modelos){const r=await p.request.get('http://127.0.0.1:4194/modelos/refeitos/'+m.arquivo);assert.equal(r.status(),200);assert.equal(createHash('sha256').update(await r.body()).digest('hex'),m.sha256);const pdf=await p.request.get('http://127.0.0.1:4194/modelos/refeitos/previas/'+m.arquivo.replace(/\.(xlsx|docx)$/,'.pdf'));assert.equal(pdf.status(),200);assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF');}
  await p.goto('http://127.0.0.1:4194/#entrega-modelos');
  await p.evaluate(async()=>{const {estado}=await import('/src/estado.js');estado.equipamentos=[{id:'eq1',setor:'UTL',tipo:'motor_eletrico',numero:1,tag:'UTL-MOT-001',descricao:'Motor fictício <&>'},{id:'eq2',setor:'PRD',tipo:'motor_eletrico',numero:2,tag:'PRD-MOT-002',descricao:'Motor dois'}];estado.inicio='2026-01-05';estado.ajustes={};estado.execucoes={'eq1|MOT-01':{data:'2026-10-20',observacao:'Teste <&>'}};const {telaEntregaModelos}=await import('/src/telas/entrega-modelos.js');telaEntregaModelos(document.querySelector('main'));});
  await p.locator('#documento-modelo').selectOption('PCMD-01');
  await p.locator('#modelo-organizacao').fill('Indústria fictícia <&>');await p.locator('#modelo-elaborador').fill('Pessoa fictícia');
  for(const info of contrato.modelos){
    await p.locator('#documento-modelo').selectOption(info.codigo);
    const [download]=await Promise.all([p.waitForEvent('download'),p.locator('#baixar-modelo').click()]);
    const base=info.arquivo;assert.equal(download.suggestedFilename(),info.preenchimento==='parcial'?base.replace(/\.(xlsx|docx)$/,'-Preenchido.$1'):base);
    const caminho=new URL(base,output);await download.saveAs(fileURLToPath(caminho));
    const bytes=await readFile(caminho);const source=await readFile(new URL('../public/modelos/refeitos/'+base,import.meta.url));
    if(info.preenchimento==='manual'){assert.deepEqual(bytes,source);continue;}
    const target=await JSZip.loadAsync(bytes);const original=await JSZip.loadAsync(source);
    await (await import('node:fs/promises')).writeFile(new URL(base,output),bytes);
    for(const part of Object.keys(original.files).filter(n=>!original.files[n].dir&&/\/media\//.test(n)))assert.deepEqual(await target.file(part).async('uint8array'),await original.file(part).async('uint8array'));
    if(base.endsWith('.xlsx'))for(const path of Object.values(info.abas)){
      const before=await original.file(path).async('string'),after=await target.file(path).async('string');assert.equal((after.match(/<sheetProtection\b/g)||[]).length,(before.match(/<sheetProtection\b/g)||[]).length);
      const result=await p.evaluate(({before,after})=>{const parse=x=>new DOMParser().parseFromString(x,'application/xml');const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';const formulas=x=>[...parse(x).getElementsByTagNameNS(ns,'c')].flatMap(c=>{const f=c.getElementsByTagNameNS(ns,'f')[0];return f?[[c.getAttribute('r'),f.textContent]]:[];});return JSON.stringify(formulas(before))===JSON.stringify(formulas(after));},{before,after});assert.ok(result,base+' '+path+' fórmulas intactas');
    }
    else{const body=await target.file('word/document.xml').async('string');assert.ok(!body.includes('{{'));assert.ok(body.includes('Pessoa fictícia'));assert.ok(body.includes('Em elaboração'));assert.ok(body.includes('A definir'));}
  }
  assert.match(await p.locator('#progresso-modelos').textContent(),/arquivo preparado/);assert.deepEqual(errors,[]);await context.close();console.log('Modelos refeitos: 18 downloads e prévias, cinco arquivos preenchidos, 13 manuais intactos, mídia, fórmulas e proteção preservadas.');
}});
