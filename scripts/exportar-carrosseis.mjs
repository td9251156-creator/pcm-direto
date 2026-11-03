// Ferramenta editorial local: exporta os rascunhos, sem abrir contas ou publicar nas redes.
import { readFile, mkdir } from 'node:fs/promises';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
let html=await readFile('divulgacao/portal/carrosseis.html','utf8');
const logo=(await readFile('public/marca/logo/PCM-Direto_horizontal-slogan_cor.svg')).toString('base64');
const regular=(await readFile('public/fontes/marca-1.ttf')).toString('base64');
const negrito=(await readFile('public/fontes/marca-4.ttf')).toString('base64');
html=html.replace('<link rel="stylesheet" href="../../public/fontes/fontes.css">',`<style>@font-face{font-family:Archivo;font-weight:400;src:url(data:font/ttf;base64,${regular})}@font-face{font-family:Archivo;font-weight:700;src:url(data:font/ttf;base64,${negrito})}</style>`).replace('../../public/marca/logo/PCM-Direto_horizontal-slogan_cor.svg','data:image/svg+xml;base64,'+logo);
const navegador=await chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 const p=await navegador.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});await p.route('**/*',r=>r.abort());await p.setContent(html);await p.evaluate(()=>document.fonts.ready);await mkdir('artifacts/divulgacao-portal',{recursive:true});
 const slides=p.locator('.slide');for(let i=0;i<await slides.count();i++){const slide=slides.nth(i),id=await slide.getAttribute('id');if(!await slide.evaluate(e=>e.scrollHeight<=e.clientHeight))throw new Error(id+': conteúdo ultrapassa o quadro.');await slide.screenshot({path:'artifacts/divulgacao-portal/'+id+'.png'});}
 console.log(`${await slides.count()} slides de 1080×1350 exportados para artifacts/divulgacao-portal. Nenhuma publicação realizada.`);
}finally{await navegador.close();}
