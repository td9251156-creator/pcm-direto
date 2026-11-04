import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {chromium} from '../ferramentas/navegador/node_modules/playwright/index.mjs';
const saida=process.argv[2]||'divulgacao/portal/kit';await mkdir(saida,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:[...(process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]),'--allow-file-access-from-files']});
try{
 const p=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 await p.goto(pathToFileURL(process.cwd()+'/divulgacao/portal/carrosseis.html').href);await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.evaluate(()=>document.fonts.check('72px Archivo')),true);
 const slides=p.locator('.slide');assert.equal(await slides.count(),16);const textos=[];
 for(let i=0;i<16;i++){
  const slide=slides.nth(i);const dados=await slide.evaluate(e=>({id:e.id,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width,client:e.clientHeight,scroll:e.scrollHeight,titulo:e.querySelector('h1').textContent,tema:e.querySelector('.tema').textContent,imagens:[...e.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)}));
  assert.equal(dados.w,1080);assert.equal(dados.h,1350);assert.ok(dados.scroll<=dados.client,dados.id+' sem corte de conteúdo');assert.equal(dados.imagens,true);
  await slide.screenshot({path:saida+'/'+dados.id+'.png'});textos.push({arquivo:dados.id+'.png',texto_alternativo:dados.tema+'. '+dados.titulo+' PCM Direto: modelos gratuitos. Exemplo fictício.'});
 }
 for(let tema=1;tema<=4;tema++)await p.pdf({path:saida+'/tema-'+tema+'-linkedin.pdf',pageRanges:((tema-1)*4+1)+'-'+(tema*4),printBackground:true,preferCSSPageSize:true,tagged:true});
 await writeFile(saida+'/textos-alternativos.json',JSON.stringify(textos,null,2)+'\n');console.log('16 slides PNG 1080×1350 e quatro PDFs LinkedIn exportados, marca/fontes carregadas e sem corte de conteúdo. Nenhuma publicação enviada.');
}finally{await browser.close();}
