// Navegação, intenção e comunidade com API simulada: não cria contas nem envia e-mails reais.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { iniciarServidor, executarComRecursos } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const origem='http://127.0.0.1:4224';
const A='10000000-0000-4000-8000-000000000001',B='20000000-0000-4000-8000-000000000002',M='30000000-0000-4000-8000-000000000003';
const expJWT=Math.floor(Date.now()/1000)+3600;
const jwt=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:expJWT})).toString('base64url')+'.ficticio';
const sessao=id=>({access_token:jwt(id),refresh_token:['refresh','ficticio'].join('-'),token_type:'bearer',expires_in:3600,expires_at:expJWT,user:{id,email:'colaborador@example.invalid',aud:'authenticated',app_metadata:{},user_metadata:{}}});
const sitemap=await readFile('dist/sitemap.xml','utf8');assert.ok(!sitemap.includes('app.html'));assert.ok(!sitemap.includes('/acesso/'));assert.ok(!sitemap.includes('registrar-falhas-pareto'));
assert.match(await readFile('dist/comunidade/acesso/index.html','utf8'),/noindex,nofollow/);
await executarComRecursos({criarServidor:()=>iniciarServidor({raiz:process.cwd(),porta:4224}),criarNavegador:()=>chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),limiteTotal:240000,executar:async({navegador})=>{
 const c=await navegador.newContext({serviceWorkers:'block',acceptDownloads:true});c.setDefaultTimeout(10000);
 await c.addInitScript(()=>{const Canal=window.BroadcastChannel;window.BroadcastChannel=class extends Canal{constructor(nome){super(nome);window.canalComunidadeTeste=nome;}};});
 let ativa=true,emails=0,envios=0,ultimoToken,segurarPapel=false,recebeuPapel,liberarPapel,segurarEnvio=false,recebeuEnvio,liberarEnvio;
 const raizId='50000000-0000-4000-8000-000000000001';
 const itens=[{id:raizId,codigo:'PCM-MAN-004',resposta_a:null,apelido:'Equipe publicada',texto:'Pergunta publicada fictícia',situacao:'aprovado',criado_em:'2026-11-02T12:00:00Z',autor:B}];let denuncias=[];
 const dto=(i,ator)=>({id:i.id,codigo:i.codigo,resposta_a:i.resposta_a,apelido:i.apelido,texto:i.texto,situacao:i.situacao,criado_em:i.criado_em,proprio:i.autor===ator,publicado:i.situacao==='aprovado'&&(!i.resposta_a||itens.some(p=>p.id===i.resposta_a&&p.situacao==='aprovado'))});
 await c.route('**/*',async r=>{
  const req=r.request(),url=new URL(req.url());if(url.hostname==='127.0.0.1')return r.continue();
  if(!url.hostname.endsWith('.supabase.co'))return r.abort();
  const responder=(dados,status=200)=>r.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(dados)});
  if(req.method()==='OPTIONS')return responder({});
  const ator=[A,B,M].find(id=>req.headers().authorization==='Bearer '+jwt(id));
  if(url.pathname.endsWith('/otp')){emails++;assert.equal(new URL(url.searchParams.get('redirect_to')).pathname,'/comunidade/acesso/');assert.equal(new URL(url.searchParams.get('redirect_to')).searchParams.get('assunto'),'PCM-MAN-004');return responder({});}
  if(url.pathname.endsWith('/logout'))return responder({});
  if(url.pathname.endsWith('/catalogo_e_moderador')){if(segurarPapel){segurarPapel=false;recebeuPapel();await new Promise(resolve=>{liberarPapel=resolve;});}return responder(ator===M);}
  const nome=url.pathname.split('/').at(-1);const dados=req.method()==='POST'?req.postDataJSON():{};
  if(nome==='comunidade_ativa')return responder(ativa);
  if(nome==='comunidade_resumo')return responder([{codigo:'PCM-MAN-004',comentarios:1,atualizado_em:'2026-11-02T12:00:00Z'}]);
  if(nome==='comunidade_listar'){
   assert.deepEqual(Object.keys(dados).sort(),['p_codigo','p_vista','p_pagina'].sort());
   if(dados.p_vista!=='publicos'&&!ator)return responder({code:'42501'},403);
   const lista=itens.filter(i=>(!dados.p_codigo||i.codigo===dados.p_codigo)&&(dados.p_vista==='meus'?i.autor===ator&&i.situacao!=='retirado':dados.p_vista==='moderacao'?ator===M&&i.situacao==='pendente':i.situacao==='aprovado'&&(!i.resposta_a||itens.some(p=>p.id===i.resposta_a&&p.situacao==='aprovado'))));
   return responder(lista.map(i=>dto(i,ator)));
  }
  if(nome==='comunidade_enviar'){
   assert.deepEqual(Object.keys(dados).sort(),['p_codigo','p_apelido','p_texto','p_resposta_a','p_nonce'].sort());assert.ok(ator);ultimoToken=ator;envios++;
   if(segurarEnvio){segurarEnvio=false;recebeuEnvio();await new Promise(resolve=>{liberarEnvio=resolve;});}
   const id=crypto.randomUUID();itens.push({id,codigo:dados.p_codigo,apelido:dados.p_apelido,texto:dados.p_texto,resposta_a:dados.p_resposta_a,situacao:'pendente',criado_em:new Date().toISOString(),autor:ator});return responder(id);
  }
  if(nome==='comunidade_retirar'){const item=itens.find(i=>i.id===dados.p_id&&i.autor===ator);if(!item)return responder({code:'42501'},403);item.situacao='retirado';item.texto='';return responder(null);}
  if(nome==='comunidade_moderar'){assert.equal(ator,M);const item=itens.find(i=>i.id===dados.p_id);item.situacao=dados.p_aprovar?'aprovado':'oculto';return responder(null);}
  if(nome==='comunidade_denunciar'){assert.ok(ator);denuncias.push({id:crypto.randomUUID(),comentario_id:dados.p_id,codigo:'PCM-MAN-004',motivo:dados.p_motivo,texto:itens.find(i=>i.id===dados.p_id).texto,criado_em:new Date().toISOString()});return responder(null);}
  if(nome==='comunidade_denuncias_listar'){assert.equal(ator,M);return responder(denuncias);}
  if(nome==='comunidade_denuncia_resolver'){assert.equal(ator,M);denuncias=denuncias.filter(d=>d.id!==dados.p_id);return responder(null);}
  return responder({code:'PGRST202'},404);
 });
 const p=await c.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
 await p.goto(origem+'/guias/');assert.equal(await p.locator('.lista-modelos-publicos li').count(),1);
 await p.getByRole('link',{name:'Ler o guia →'}).click();await p.locator('h1').filter({hasText:'Como organizar ordens'}).waitFor();
 assert.equal(await p.locator('[data-comunidade-modelo]').getAttribute('data-comunidade-modelo'),'PCM-MAN-004');
 assert.equal((await c.request.get(origem+'/guias/nao-existe')).status(),404);const naoExiste=await p.goto(origem+'/guias/nao-existe/');assert.equal(naoExiste.status(),404);assert.ok((await p.locator('h1').innerText()).includes('não foi encontrada'));
 await p.goto(origem+'/modelos/pcm-man-004/');assert.equal(emails,0);await p.locator('[data-carregar-conversas]').click();await p.locator('[data-entrar]').waitFor();
 assert.ok((await p.locator('[data-lista-conversas]').innerText()).includes('Pergunta publicada fictícia'));assert.equal(emails,0);
 await p.locator('[data-responder]').click();assert.equal(await p.locator('[data-entrar] input').evaluate(e=>e===document.activeElement),true);
 await p.locator('[data-entrar] input').fill('colaborador@example.invalid');await p.locator('[data-entrar] button').click();await p.waitForFunction(()=>document.body.innerText.includes('confira seu e-mail'));assert.equal(emails,1);
 const canal=await p.evaluate(()=>window.canalComunidadeTeste);assert.ok(canal);
 const outra=await c.newPage();await outra.goto(origem+'/');
 async function emitir(id,event='SIGNED_IN'){await outra.evaluate(({canal,sessao,event})=>{if(sessao)localStorage.setItem(canal,JSON.stringify(sessao));else localStorage.removeItem(canal);const c=new BroadcastChannel(canal);c.postMessage({event,session:sessao});c.close();},{canal,sessao:id?sessao(id):null,event});}
 await emitir(A);await p.locator('[data-enviar]').waitFor();
 await p.locator('[data-enviar] input').fill('Equipe A');await p.locator('[data-enviar] textarea').fill('Pergunta privada A <img src=x onerror=alert(1)>');
 await p.locator('[data-enviar]').evaluate(f=>{f.requestSubmit();f.requestSubmit();});
 await p.waitForFunction(()=>document.body.innerText.includes('Mensagem enviada. Ela aguarda moderação.'));assert.equal(envios,1);assert.equal(ultimoToken,A);
 assert.equal(await p.locator('[data-lista-conversas] img').count(),0);assert.ok((await p.locator('[data-lista-conversas]').innerText()).includes('<img'));
 await p.locator('[data-enviar] textarea').fill('Rascunho A preservado');await emitir(A,'TOKEN_REFRESHED');await p.waitForTimeout(100);assert.equal(await p.locator('[data-enviar] textarea').inputValue(),'Rascunho A preservado');
 segurarPapel=true;const papel=new Promise(resolve=>{recebeuPapel=resolve;});await p.locator('[data-atualizar]').click();await papel;assert.equal(await p.locator('[data-enviar] textarea').isDisabled(),true);liberarPapel();await p.locator('[data-atualizar]:enabled').waitFor();assert.equal(await p.locator('[data-enviar] textarea').inputValue(),'Rascunho A preservado');
 segurarPapel=true;const troca=new Promise(resolve=>{recebeuPapel=resolve;});await emitir(B);await troca;assert.equal(await p.locator('[data-enviar]').count(),0);assert.ok(!(await p.locator('[data-conversas-conteudo]').innerText()).includes('Pergunta privada A'));
 await emitir(B,'TOKEN_REFRESHED');await p.locator('[data-enviar]').waitFor();liberarPapel();await p.waitForTimeout(100);assert.equal(await p.locator('[data-enviar] textarea').inputValue(),'');
 await emitir(A);await p.locator('[data-enviar]').waitFor();await p.locator('[data-enviar] input').fill('Equipe A');await p.locator('[data-enviar] textarea').fill('Envio A iniciado antes da troca');
 segurarEnvio=true;const envio=new Promise(resolve=>{recebeuEnvio=resolve;});await p.locator('[data-enviar] button[type="submit"]').click();await envio;await emitir(B);await p.locator('[data-enviar]').waitFor();await p.locator('[data-enviar] textarea').fill('Novo rascunho B');liberarEnvio();await p.waitForTimeout(150);assert.equal(ultimoToken,A);assert.equal(await p.locator('[data-enviar] textarea').inputValue(),'Novo rascunho B');
 await p.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});assert.equal(await p.locator('[data-enviar]').count(),0);assert.ok(!(await p.locator('[data-conversas-conteudo]').innerText()).includes('Pergunta privada A'));
 await emitir(A);await p.locator('[data-carregar-conversas]:visible').click();await p.locator('[data-enviar]').waitFor();assert.equal(await p.locator('[data-enviar] textarea').inputValue(),'');
 await p.locator('[data-denunciar]').first().click();const d=p.locator('dialog[open]');await d.locator('textarea').fill('Motivo fictício privado');await d.getByRole('button',{name:'Enviar denúncia'}).click();await p.locator('dialog[open]').waitFor({state:'hidden'});assert.equal(denuncias.length,1);assert.ok(!(await p.locator('[data-lista-conversas]').innerText()).includes('Motivo fictício privado'));
 await p.locator('[data-denunciar]').first().click();await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
 await emitir(M);await p.locator('[data-vista="moderacao"]').waitFor();await p.locator('[data-vista="moderacao"]').click();await p.locator('[data-aprovar]').first().click();await p.locator('[data-atualizar]:enabled').waitFor();
 await p.locator('[data-vista="denuncias"]').click();await p.locator('[data-resolver]').click();await p.waitForFunction(()=>document.body.innerText.includes('Nenhuma mensagem nesta página.'));assert.equal(denuncias.length,0);
 await emitir(A);await p.locator('[data-vista="publicos"]').click();await p.locator('[data-retirar]').first().waitFor();p.once('dialog',d=>d.accept());await p.locator('[data-retirar]').first().click();await p.waitForFunction(()=>document.body.innerText.includes('Sua mensagem foi retirada.'));
 assert.deepEqual(await p.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name)),[],'Conversas públicas não abrem a base operacional');
 await mkdir('artifacts',{recursive:true});
 for(const width of [320,390,820,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`artifacts/conversa-modelo-${width}.png`,fullPage:true});}
 ativa=false;await p.reload();await p.locator('[data-carregar-conversas]').click();await p.waitForFunction(()=>document.body.innerText.includes('As conversas ainda não estão disponíveis.'));
 const [arquivo]=await Promise.all([p.waitForEvent('download'),p.locator('.cabecalho-publico a[download]').click()]);assert.deepEqual(await readFile(await arquivo.path()),await readFile('public/modelos/biblioteca-v2/PCM-MAN-004_Ordens-de-Servico_R00.xlsx'));
 assert.deepEqual(erros,[]);await outra.close();await c.close();

 const retorno=await navegador.newContext({serviceWorkers:'block'});
 await retorno.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await retorno.addInitScript(({canal,sessao})=>localStorage.setItem(canal,JSON.stringify(sessao)),{canal,sessao:sessao(A)});
 const callback=await retorno.newPage();await callback.goto(origem+'/comunidade/acesso/?assunto=PCM-MAN-004');await callback.waitForURL('**/modelos/pcm-man-004/#conversa');await retorno.close();
 const local=await navegador.newContext();const l=await local.newPage();let downloads=0;l.on('download',()=>downloads++);
 await l.goto(origem+'/app.html#inicio');await l.locator('#conteudo h2').first().waitFor();
 const ler=()=>l.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('base');const q=tx.objectStore('base').get('principal');tx.oncomplete=()=>{db.close();resolve(q.result);};};}));
 const antes=await ler();await l.goto(origem+'/app.html?modelo=PCM-MAN-008#inicio');await l.locator('#intencao-modelo').waitFor();for(const width of [320,390,820,1280]){await l.setViewportSize({width,height:900});assert.ok(await l.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Intenção cabe em '+width);await l.screenshot({path:`artifacts/intencao-modelo-${width}.png`,fullPage:true});}assert.deepEqual(await ler(),antes);assert.equal(downloads,0);assert.equal(await l.locator('#intencao-modelo .botao').getAttribute('href'),'#assistente');
 await l.evaluate(()=>location.hash='comunidade');await l.locator('[data-demonstrar]').click();await l.locator('#sair-demo').waitFor();await l.evaluate(()=>location.hash='comunidade');await l.locator('[data-sair-exemplo]').click();await l.waitForFunction(()=>!document.querySelector('#intencao-modelo')?.innerText.includes('Exemplo isolado'));assert.equal(await l.locator('#intencao-modelo .botao').getAttribute('href'),'#assistente');assert.deepEqual(await ler(),antes);
 await l.locator('[data-dispensar-modelo]').click();await l.evaluate(()=>location.hash='apoio');await l.locator('#buscar-apoio').waitFor();assert.equal(await l.locator('#intencao-modelo').count(),0);
 await l.goto(origem+'/app.html?modelo=INVALIDO#inicio');await l.locator('#conteudo h2').first().waitFor();assert.equal(await l.locator('#intencao-modelo').count(),0);await local.close();
 console.log('Portal completo: guia/404/sitemap, contexto sem escrita/geração, saída demo, leitura pública, login por assunto simulado, duas contas, token fixo, rascunho/renovação, pagehide/pageshow simulado, moderação, denúncia privada, retirada, quatro larguras e falha da comunidade sem bloquear download aprovados.');
}});
