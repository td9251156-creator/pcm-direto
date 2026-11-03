// Conversas públicas independentes do inventário, dos backups e das telas operacionais.
import { rpcComunidade, entrarNaConversa } from './servicos/comunidade-materiais.js';
import { sessaoCatalogo, observarSessaoCatalogo, moderadorCatalogo, sairCatalogo } from './servicos/catalogo.js';
const esc = valor => String(valor ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const codigoValido = c => /^PCM-MAN-(00[1-9]|01[0-9])$/.test(c || '');
const rotulo = c => c.publicado ? 'Publicado' : c.situacao === 'pendente' ? 'Aguardando moderação' : 'Fora da página pública';
const indisponivel = 'As conversas ainda não estão disponíveis. Você pode continuar lendo e baixando os materiais ou enviar sua sugestão para pcmdireto@gmail.com.';

async function iniciarConversa(raiz) {
  raiz.hidden = false;
  const codigo = raiz.dataset.comunidadeModelo || null;
  const prefixo = raiz.dataset.prefixo;
  let iniciado=false, sessao=null, moderador=false, vista=codigo?'publicos':'meus', pagina=0, pedido=0, versao=0, ocupado=false, eventos=0, ultimaConta=0, ciclo=0, pararSessao;
  let rascunho={apelido:'',texto:'',resposta:null,nonce:crypto.randomUUID()};
  let registros=[];const desativados=new Map();
  const mensagem=document.createElement('p'); mensagem.setAttribute('role','status'); mensagem.tabIndex=-1;
  raiz.append(mensagem);
  const area=raiz.querySelector('[data-conversas-conteudo]');
  const vivo=()=>raiz.isConnected;
  const avisar=texto=>{if(vivo())mensagem.textContent=texto;};
  function limparRascunho(){rascunho={apelido:'',texto:'',resposta:null,nonce:crypto.randomUUID()};}
  function bloquearControles(){for(const e of raiz.querySelectorAll('button,input,textarea')){if(!desativados.has(e))desativados.set(e,e.disabled);e.disabled=true;}}
  function desativar(e,valor){if(ocupado){desativados.set(e,valor);e.disabled=true;}else e.disabled=valor;}
  async function atuar(acao) {
    if(ocupado || !vivo())return false;
    ocupado=true; const epoca=versao;
    const usuarioId=sessao?.user.id;bloquearControles();
    try{const atual=()=>vivo()&&epoca===versao;await acao(atual,(nome,parametros)=>rpcComunidade(nome,parametros,{usuarioId,vigente:atual}));return vivo()&&epoca===versao;}
    catch(e){if(epoca===versao)avisar(e.message);return false;}
    finally{if(vivo()&&epoca===versao){ocupado=false;for(const [e,valor] of desativados)if(e.isConnected)e.disabled=valor;desativados.clear();}}
  }
  function desenhar() {
    const conta = sessao ? `<p>Conta conectada. Seu e-mail não aparece nas conversas.</p><button type="button" data-sair>Sair desta conta</button>` : `<form data-entrar><label>E-mail para receber o link de acesso<input type="email" name="email" required maxlength="254" autocomplete="email"></label><p>Abra o link neste mesmo navegador para voltar a este material. O acesso é necessário somente para participar.</p><button type="submit">Receber link de acesso</button></form>`;
    area.innerHTML=`<section class="conta-conversa"><h3>${sessao?'Sua participação':'Entre para participar'}</h3>${conta}</section><div class="acoes controles-conversa">${codigo?`<button type="button" data-vista="publicos" aria-pressed="${vista==='publicos'}">Conversas publicadas</button>`:''}${sessao?`<button type="button" data-vista="meus" aria-pressed="${vista==='meus'}">Minhas mensagens</button>`:''}${moderador?`<button type="button" data-vista="moderacao" aria-pressed="${vista==='moderacao'}">Fila de moderação</button><button type="button" data-vista="denuncias" aria-pressed="${vista==='denuncias'}">Denúncias privadas</button>`:''}</div><div data-lista-conversas tabindex="-1"></div><div class="acoes"><button type="button" data-anterior ${pagina===0?'disabled':''}>Anterior</button><span>Página ${pagina+1}</span><button type="button" data-proxima>Próxima</button><button type="button" data-atualizar>Atualizar conversas</button></div><div data-formulario-conversa></div>`;
    area.querySelector('[data-entrar]')?.addEventListener('submit',e=>{e.preventDefault();const email=new FormData(e.currentTarget).get('email').trim();atuar(async atual=>{await entrarNaConversa(email,codigo,prefixo);if(atual())avisar('Se o envio foi autorizado, confira seu e-mail e abra o link neste navegador.');});});
    area.querySelector('[data-sair]')?.addEventListener('click',()=>atuar(async()=>{await sairCatalogo();}));
    area.querySelectorAll('[data-vista]').forEach(b=>b.onclick=()=>{if(ocupado)return;vista=b.dataset.vista;pagina=0;desenhar();atualizar();});
    area.querySelector('[data-anterior]').onclick=()=>{if(ocupado||!pagina)return;pagina--;desenhar();atualizar();};
    area.querySelector('[data-proxima]').onclick=()=>{if(ocupado)return;pagina++;desenhar();atualizar();};
    area.querySelector('[data-atualizar]').onclick=()=>{if(!ocupado)atuar(async()=>{await aplicarSessao(sessao,true);});};
    desenharFormulario();if(ocupado)bloquearControles();
  }
  function desenharFormulario(){
    const f=area.querySelector('[data-formulario-conversa]');if(!f)return;
    if(!sessao||!codigo){f.innerHTML='';return;}
    f.innerHTML=`<section><h3>${rascunho.resposta?'Responder à pergunta selecionada':'Faça uma pergunta ou compartilhe sua experiência'}</h3>${rascunho.resposta?'<button type="button" data-cancelar-resposta>Cancelar resposta</button>':''}<form data-enviar><label>Apelido público<input name="apelido" required maxlength="60" value="${esc(rascunho.apelido)}" autocomplete="off"></label><p>Use um apelido, sem e-mail. Não inclua nomes ou dados privados da fábrica na mensagem.</p><label>Mensagem<textarea name="texto" required maxlength="2000" rows="5">${esc(rascunho.texto)}</textarea></label><p>Até 2.000 caracteres. O rascunho não enviado fica apenas nesta página e é descartado ao recarregar. Uma mensagem enviada fica na sua conta para moderação. O envio aguarda moderação antes de aparecer publicamente.</p><button type="submit">Enviar para moderação</button></form></section>`;
    f.querySelector('[data-cancelar-resposta]')?.addEventListener('click',()=>{if(ocupado)return;rascunho.resposta=null;rascunho.nonce=crypto.randomUUID();desenharFormulario();});
    f.querySelectorAll('input,textarea').forEach(i=>i.oninput=()=>{rascunho[i.name]=i.value;rascunho.nonce=crypto.randomUUID();});
    f.querySelector('form').onsubmit=e=>{e.preventDefault();if(rascunho.apelido.includes('@')){avisar('Escolha um apelido sem e-mail.');return;}const dados={p_codigo:codigo,p_apelido:rascunho.apelido.trim(),p_texto:rascunho.texto.trim(),p_resposta_a:rascunho.resposta,p_nonce:rascunho.nonce};atuar(async(atual,mutar)=>{await mutar('enviar',dados);if(!atual())return;const apelido=rascunho.apelido;limparRascunho();rascunho.apelido=apelido;vista='meus';pagina=0;desenhar();await atualizar();avisar('Mensagem enviada. Ela aguarda moderação.');});};
  }
  async function atualizar(){
    const numero=++pedido, epoca=versao;
    const lista=area.querySelector('[data-lista-conversas]');if(!lista)return;
    if(!codigo&&!sessao){lista.textContent='Escolha um material para ler as conversas públicas. Entre para acompanhar suas mensagens.';desativar(area.querySelector('[data-proxima]'),true);return;}
    lista.textContent='Carregando conversas…';
    try{
      const dados=await rpcComunidade(vista==='denuncias'?'denuncias_listar':'listar',vista==='denuncias'?{p_pagina:pagina}:{p_codigo:codigo,p_vista:vista,p_pagina:pagina},{usuarioId:sessao?.user.id,vigente:()=>vivo()&&numero===pedido&&epoca===versao});
      if(!vivo()||numero!==pedido||epoca!==versao)return;
      registros=dados||[];
      desativar(area.querySelector('[data-proxima]'),registros.length===0 || (vista==='publicos'?registros.filter(c=>!c.resposta_a).length<10:registros.length<20));
      lista.innerHTML=registros.length?registros.map(c=>vista==='denuncias'?`<article class="mensagem-conversa"><p>${esc(c.codigo)} · Denúncia privada</p><p class="texto-conversa">${esc(c.motivo)}</p><p class="texto-conversa">Mensagem: ${esc(c.texto||'Retirada pelo autor')}</p><div class="acoes"><button type="button" data-ocultar="${c.comentario_id}">Ocultar comentário</button><button type="button" data-resolver="${c.id}">Resolver denúncia</button></div></article>`:`<article class="mensagem-conversa ${c.resposta_a?'resposta-conversa':''}" data-comentario="${c.id}"><p class="sobretitulo">${esc(c.codigo)} · ${c.resposta_a?'Resposta':'Pergunta / experiência'}</p><h3>${esc(c.apelido)}</h3><p>${esc(rotulo(c))} · ${esc(new Date(c.criado_em).toLocaleDateString('pt-BR'))}</p><p class="texto-conversa">${esc(c.texto)}</p><div class="acoes">${vista==='publicos'&&!c.resposta_a?`<button type="button" data-responder="${c.id}">Responder</button>`:''}${c.proprio?`<button type="button" data-retirar="${c.id}">Retirar minha mensagem</button>`:''}${c.publicado&&sessao?`<button type="button" data-denunciar="${c.id}">Denunciar</button>`:''}${moderador&&vista==='moderacao'?`<button type="button" data-aprovar="${c.id}">Publicar</button><button type="button" data-ocultar="${c.id}">Não publicar</button>`:''}</div></article>`).join(''):'<p>Nenhuma mensagem nesta página.</p>';
      lista.querySelectorAll('[data-responder]').forEach(b=>b.onclick=()=>{if(ocupado)return;if(!sessao){avisar('Entre e depois escolha a pergunta que deseja responder.');area.querySelector('input[type="email"]')?.focus();return;}rascunho.resposta=b.dataset.responder;rascunho.nonce=crypto.randomUUID();desenharFormulario();area.querySelector('textarea')?.focus();});
      lista.querySelectorAll('[data-retirar]').forEach(b=>b.onclick=()=>{if(ocupado||!confirm('Retirar esta mensagem? O texto deixará de aparecer nas conversas.'))return;atuar(async(atual,mutar)=>{await mutar('retirar',{p_id:b.dataset.retirar});if(atual()){await atualizar();avisar('Sua mensagem foi retirada.');}});});
      lista.querySelectorAll('[data-aprovar],[data-ocultar],[data-resolver]').forEach(b=>b.onclick=()=>atuar(async(atual,mutar)=>{if(b.dataset.resolver)await mutar('denuncia_resolver',{p_id:b.dataset.resolver});else await mutar('moderar',{p_id:b.dataset.aprovar||b.dataset.ocultar,p_aprovar:!!b.dataset.aprovar});if(atual()){await atualizar();avisar('Decisão registrada.');}}));
      lista.querySelectorAll('[data-denunciar]').forEach(b=>b.onclick=()=>denunciar(b.dataset.denunciar,b));if(ocupado)bloquearControles();
    }catch(e){if(vivo()&&numero===pedido&&epoca===versao){lista.textContent=e.indisponivel?indisponivel:e.message;desativar(area.querySelector('[data-proxima]'),true);}}
  }
  function denunciar(id,origem){
    if(ocupado)return;
    const epoca=versao,d=document.createElement('dialog');d.className='dialogo-comunidade';d.setAttribute('aria-labelledby','titulo-denuncia');
    d.innerHTML='<h2 id="titulo-denuncia">Denunciar mensagem</h2><form><label>Motivo privado para a moderação<textarea required maxlength="500" rows="4" name="motivo"></textarea></label><p>O motivo não aparece na conversa pública.</p><div class="acoes"><button type="submit">Enviar denúncia</button><button type="button" data-cancelar>Cancelar</button></div><p data-erro-denuncia role="alert"></p></form>';
    document.body.append(d);d.querySelector('[data-cancelar]').onclick=()=>d.close();
    d.querySelector('form').onsubmit=async e=>{e.preventDefault();if(epoca!==versao){d.close();return;}const motivo=new FormData(e.currentTarget).get('motivo').trim();const b=d.querySelector('button[type="submit"]');b.disabled=true;const ok=await atuar(async(atual,mutar)=>{await mutar('denunciar',{p_id:id,p_motivo:motivo});if(atual())avisar('Denúncia enviada em particular à moderação.');});if(ok)d.close();else{b.disabled=false;d.querySelector('[data-erro-denuncia]').textContent=mensagem.textContent;}};
    d.addEventListener('close',()=>{d.remove();if(origem.isConnected)origem.focus();else mensagem.focus();},{once:true});d.showModal();
  }
  async function aplicarSessao(nova,forcar=false){
    const mudou=sessao?.user.id!==nova?.user.id;
    sessao=nova;
    if(!mudou&&!forcar&&area.querySelector('[data-lista-conversas]'))return;
    const numeroConta=++ultimaConta;
    if(mudou){versao++;pedido++;ocupado=false;desativados.clear();area.replaceChildren();avisar('Conferindo a conta…');limparRascunho();pagina=0;if(!sessao)vista=codigo?'publicos':'meus';document.querySelectorAll('dialog.dialogo-comunidade').forEach(d=>d.close());}
    const epoca=versao;
    let pode;try{pode=!!sessao&&await moderadorCatalogo();}catch{pode=false;}
    if(!vivo()||epoca!==versao||numeroConta!==ultimaConta)return;
    moderador=pode;if(!moderador&&['moderacao','denuncias'].includes(vista))vista=codigo?'publicos':'meus';desenhar();await atualizar();
  }
  function limparAoSair(){
    ciclo++;versao++;pedido++;ultimaConta++;pararSessao?.();pararSessao=undefined;
    sessao=null;moderador=false;ocupado=false;desativados.clear();iniciado=false;vista=codigo?'publicos':'meus';pagina=0;registros=[];limparRascunho();
    document.querySelectorAll('dialog.dialogo-comunidade').forEach(d=>d.close());area.replaceChildren();mensagem.textContent='';
    const botao=raiz.querySelector('[data-carregar-conversas]');botao.hidden=false;botao.disabled=false;
  }
  window.addEventListener('pagehide',limparAoSair);
  window.addEventListener('pageshow',e=>{if(e.persisted)limparAoSair();});
  raiz.querySelector('[data-carregar-conversas]').onclick=async e=>{
    if(iniciado)return;iniciado=true;const cicloAtual=ciclo;const valido=()=>vivo()&&cicloAtual===ciclo;const botao=e.currentTarget;botao.disabled=true;avisar('Carregando conversas…');
    try{
      const ativa=await rpcComunidade('ativa');if(!valido())return;
      if(ativa!==true){avisar(indisponivel);botao.disabled=false;iniciado=false;return;}
      const parar=await observarSessaoCatalogo(nova=>{if(valido()){eventos++;aplicarSessao(nova);}});
      if(!valido()){parar();return;}pararSessao=parar;
      const versaoInicial=eventos;const atual=await sessaoCatalogo();if(!valido())return;if(eventos===versaoInicial)await aplicarSessao(atual);
      if(valido()){avisar('');botao.hidden=true;}
    }catch(e){if(!valido())return;pararSessao?.();avisar(e.indisponivel?indisponivel:e.message);botao.disabled=false;iniciado=false;}
  };
}
for(const raiz of document.querySelectorAll('[data-comunidade-modelo]'))iniciarConversa(raiz);
for(const raiz of document.querySelectorAll('[data-comunidade-resumo]')){
 raiz.hidden=false;const botao=raiz.querySelector('button'),lista=raiz.querySelector('[data-resumo-conversas]');
 botao.onclick=async()=>{botao.disabled=true;try{if(await rpcComunidade('ativa')!==true){lista.textContent=indisponivel;return;}const itens=await rpcComunidade('resumo');lista.innerHTML=itens?.length?`<ul>${itens.filter(i=>codigoValido(i.codigo)).map(i=>`<li><a href="${raiz.dataset.prefixo}modelos/${i.codigo.toLowerCase()}/#conversa">${i.codigo}: ${Number(i.comentarios)} mensagens publicadas</a></li>`).join('')}</ul>`:'Ainda não há conversas publicadas. Escolha um material para começar.';}catch(e){lista.textContent=e.indisponivel?indisponivel:e.message;}finally{botao.disabled=false;}};
}
const retorno=document.querySelector('[data-retorno-comunidade]');
if(retorno){
 const codigo=new URLSearchParams(location.search).get('assunto');
 try{const sessao=await sessaoCatalogo();if(!sessao)throw new Error();location.replace(new URL(codigoValido(codigo)?`../../modelos/${codigo.toLowerCase()}/#conversa`:'../../comunidade/',location.href));}
 catch{retorno.querySelector('[role="status"]').textContent='Não foi possível confirmar este link. Volte à Comunidade e solicite outro acesso neste navegador.';}
}
