import { esc,avisar } from '../ui.js';
import { interacoesModelo,minhaCurtida,curtirModelo,listarComentarios,comentarModelo,denunciarModelo,moderarComentario,listarDenuncias,resolverDenuncia } from '../servicos/catalogo.js';

export async function mostrarInteracoes(area,id,sessao,moderador){
  area.innerHTML='<p role="status">Consultando interações…</p>';
  try{
    const [contagem,comentarios,curtiu]=await Promise.all([interacoesModelo(id),listarComentarios(id),sessao?minhaCurtida(id,sessao.user.id):false]);
    if(!area.isConnected)return;
    area.innerHTML=`<section class="interacoes"><h4>Conversa sobre este modelo</h4><p>${Number(contagem.curtidas)} curtidas · ${Number(contagem.comentarios)} comentários publicados</p>${sessao?`<button data-curtir aria-pressed="${curtiu}">${curtiu?'Retirar minha curtida':'Curtir modelo'}</button>`:'<p>Entre na sua conta acima para curtir, comentar ou denunciar.</p>'}<div>${comentarios.map(c=>`<article class="cartao"><strong>${esc(c.apelido)}</strong><p>${esc(c.texto)}</p><small>${esc(c.situacao==='pendente'?'Aguardando moderação':c.situacao==='oculto'?'Oculto pela moderação':'Publicado')}</small>${moderador&&['pendente','aprovado'].includes(c.situacao)?`<div class="acoes">${c.situacao==='pendente'?`<button data-aprovar-comentario="${esc(c.id)}">Aprovar comentário</button>`:''}<button class="secundario" data-ocultar-comentario="${esc(c.id)}">Ocultar comentário</button></div>`:''}</article>`).join('')||'<p>Nenhum comentário publicado ainda.</p>'}</div>${sessao?`<form data-comentar><label>Apelido público<input name="apelido" maxlength="60" required placeholder="Como deseja aparecer"></label><label>Comentário técnico<textarea name="texto" maxlength="2000" required></textarea></label><p class="origem">Não inclua dados de fábrica ou pessoas. O comentário ficará pendente até a moderação.</p><button>Enviar comentário para moderação</button></form><details><summary>Denunciar conteúdo</summary><form data-denunciar><label>Motivo da denúncia<textarea name="motivo" maxlength="2000" required></textarea></label><p class="origem">A denúncia será visível apenas para você e a moderação.</p><button class="secundario">Enviar denúncia</button></form></details>`:''}</section>`;
    async function executar(botao,tarefa,mensagem){botao.disabled=true;try{await tarefa();if(!area.isConnected)return;await mostrarInteracoes(area,id,sessao,moderador);avisar(mensagem);}catch(e){avisar(e.message);botao.disabled=false;}}
    area.querySelector('[data-curtir]')?.addEventListener('click',e=>executar(e.target,()=>curtirModelo(id,!curtiu),'Curtida atualizada.'));
    area.querySelector('[data-comentar]')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);executar(e.target.querySelector('button'),()=>comentarModelo(id,fd.get('texto').trim(),fd.get('apelido').trim()),'Comentário enviado para moderação.');});
    area.querySelector('[data-denunciar]')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);executar(e.target.querySelector('button'),()=>denunciarModelo(id,fd.get('motivo').trim()),'Denúncia enviada à moderação.');});
    area.querySelectorAll('[data-aprovar-comentario]').forEach(b=>b.onclick=()=>executar(b,()=>moderarComentario(b.dataset.aprovarComentario,true),'Comentário aprovado.'));
    area.querySelectorAll('[data-ocultar-comentario]').forEach(b=>b.onclick=()=>executar(b,()=>moderarComentario(b.dataset.ocultarComentario,false),'Comentário ocultado.'));
  }catch(e){if(area.isConnected)area.textContent=e.message;}
}

export async function mostrarDenuncias(area){
  area.innerHTML='<p>Consultando denúncias…</p>';
  try{const denuncias=await listarDenuncias();if(!area.isConnected)return;area.innerHTML='<h3>Denúncias abertas</h3>'+denuncias.map(d=>`<article class="cartao"><strong>Modelo ${esc(d.modelo_id)}</strong><p>${esc(d.motivo)}</p><button data-resolver="${esc(d.id)}">Marcar como analisada</button></article>`).join('');area.querySelectorAll('[data-resolver]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await resolverDenuncia(b.dataset.resolver);await mostrarDenuncias(area);}catch(e){avisar(e.message);b.disabled=false;}});}catch(e){if(area.isConnected)area.textContent=e.message;}
}
