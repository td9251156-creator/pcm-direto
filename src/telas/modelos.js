import {MODELOS_V2,GRUPOS_V2,VERSAO_BIBLIOTECA_V2} from '../dados/modelos-v2.js';
import {esc} from '../ui.js';
import {correspondeBusca} from '../logica/texto.js';

const filtros={busca:'',grupo:''};

/** Cartão de download de um modelo da Biblioteca PCM v2 (também usado na Comunidade). */
export function cartaoModeloV2(m,classe='modelo-documental'){
  const conteudo=m.abas.length?`<p class="origem"><strong>Contém:</strong> ${esc(m.abas.join(', '))}.</p>`:'<p class="origem"><strong>Contém:</strong> documento Word com controle de título, código, revisão e aprovação.</p>';
  return `<article class="cartao ${classe}" aria-labelledby="modelo-${esc(m.codigo)}"><p class="sobretitulo">${esc(m.codigo)} · ${m.formato}${m.revisao?` · ${esc(m.revisao)}`:''}</p><h4 id="modelo-${esc(m.codigo)}">${esc(m.titulo)}</h4><p>${esc(m.quando)}</p>${conteudo}<div class="acoes"><a class="botao" href="${esc(m.url)}" download aria-label="Baixar ${esc(m.titulo)} em ${m.formato}">Baixar ${m.formato}</a></div></article>`;
}

export function telaModelos(main){
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Modelos para sua rotina</p><h2>Escolha o modelo que precisa</h2><p>Biblioteca PCM v2: ${MODELOS_V2.length} modelos em Excel e Word. Veja para que serve cada um e baixe somente o arquivo que vai usar. Downloads gratuitos, sem conta.</p><p class="origem">Os arquivos são baixados em branco. O preenchimento automático com os dados do aplicativo está em transição para estes modelos; enquanto isso, <a href="#entrega">Documentos da revisão ativa</a> continua gerando os documentos no formato anterior.</p></header>
    <div class="grade duas filtros-documentos"><div><label for="buscar-documentos">O que você precisa organizar?</label><input type="search" id="buscar-documentos" value="${esc(filtros.busca)}" placeholder="Ex.: estoque, checklist, falha…" aria-controls="lista-documentos"></div><div><label for="grupo-documentos">Finalidade</label><select id="grupo-documentos" aria-controls="lista-documentos"><option value="">Todas as finalidades</option>${GRUPOS_V2.map(g=>`<option ${filtros.grupo===g?'selected':''}>${esc(g)}</option>`).join('')}</select></div></div>
    <p id="resultado-documentos" class="origem" role="status" aria-live="polite" aria-atomic="true"></p><div id="lista-documentos"></div>
    <details class="cartao"><summary>Como usar os arquivos</summary><p>Abra o Excel no Excel ou LibreOffice e o Word em um editor compatível. Cada arquivo tem uma aba Leia-me com as orientações. Recalcule as fórmulas e confira a impressão.</p><p>Os arquivos baixados não sincronizam com o aplicativo nem entre si. Escolha onde manter cada controle e confira o conteúdo antes de usar. Gerar ou baixar um documento não o torna aprovado.</p><p class="origem">Biblioteca ${esc(VERSAO_BIBLIOTECA_V2)} · PCM Direto · MIT.</p></details>`;
  const input=main.querySelector('#buscar-documentos');const grupo=main.querySelector('#grupo-documentos');const lista=main.querySelector('#lista-documentos');
  function render(){
    filtros.busca=input.value;filtros.grupo=grupo.value;
    const modelos=MODELOS_V2.filter(m=>(!grupo.value||m.grupo===grupo.value)&&correspondeBusca([m.codigo,m.titulo,m.quando,m.grupo,...m.abas].join(' '),input.value));
    main.querySelector('#resultado-documentos').textContent=`${modelos.length} ${modelos.length===1?'modelo encontrado':'modelos encontrados'}.`;
    lista.innerHTML=GRUPOS_V2.filter(g=>modelos.some(m=>m.grupo===g)).map((g,i)=>`<section class="grupo-documentos" aria-labelledby="finalidade-${i}"><h3 id="finalidade-${i}">${esc(g)}</h3><div class="grade duas">${modelos.filter(m=>m.grupo===g).map(m=>cartaoModeloV2(m)).join('')}</div></section>`).join('')||'<section class="cartao estado-vazio"><h3>Nenhum modelo encontrado</h3><p>Tente outra palavra ou remova o filtro de finalidade.</p><button class="secundario" id="limpar-documentos">Limpar filtros</button></section>';
    lista.querySelector('#limpar-documentos')?.addEventListener('click',()=>{input.value='';grupo.value='';render();input.focus();});
  }
  input.addEventListener('input',render);grupo.addEventListener('change',render);render();
}
