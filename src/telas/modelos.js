import contrato from '../dados/modelos-refeitos.json';
import {guiaModelo} from '../dados/guias-modelos.js';
import {esc} from '../ui.js';
import {correspondeBusca} from '../logica/texto.js';

const filtros={busca:'',grupo:''};
export function telaModelos(main){
  const grupos=[...new Set(contrato.modelos.map(m=>m.grupo))];
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Modelos para sua rotina</p><h2>Escolha o modelo que precisa</h2><p>Veja para que serve cada documento e baixe somente o arquivo que vai usar. Downloads gratuitos, sem conta.</p><p class="origem">Para gerar documentos com uma revisão do plano, execuções e falhas, acesse <a href="#entrega">Documentos da revisão ativa</a>.</p></header>
    <div class="grade duas filtros-documentos"><div><label for="buscar-documentos">O que você precisa organizar?</label><input type="search" id="buscar-documentos" value="${esc(filtros.busca)}" placeholder="Ex.: estoque, checklist, falha…" aria-controls="lista-documentos"></div><div><label for="grupo-documentos">Finalidade</label><select id="grupo-documentos" aria-controls="lista-documentos"><option value="">Todas as finalidades</option>${grupos.map(g=>`<option ${filtros.grupo===g?'selected':''}>${esc(g)}</option>`).join('')}</select></div></div>
    <p id="resultado-documentos" class="origem" role="status" aria-live="polite" aria-atomic="true"></p><div id="lista-documentos"></div>
    <details class="cartao"><summary>Como usar os arquivos</summary><p>Abra o Excel no Excel ou LibreOffice e o Word em um editor compatível. Nas planilhas, azul-claro indica entradas e cinza indica fórmulas protegidas. Recalcule as fórmulas e confira a impressão.</p><p>Os arquivos baixados não sincronizam com o aplicativo nem entre si. Escolha onde manter cada controle e confira o conteúdo antes de usar.</p></details>`;
  const input=main.querySelector('#buscar-documentos');const grupo=main.querySelector('#grupo-documentos');const lista=main.querySelector('#lista-documentos');
  function render(){
    filtros.busca=input.value;filtros.grupo=grupo.value;
    const modelos=contrato.modelos.filter(m=>(!grupo.value||m.grupo===grupo.value)&&correspondeBusca([m.codigo,m.titulo,m.descricao,m.grupo,guiaModelo(m.codigo).quando].join(' '),input.value));
    main.querySelector('#resultado-documentos').textContent=`${modelos.length} ${modelos.length===1?'modelo encontrado':'modelos encontrados'}.`;
    lista.innerHTML=grupos.filter(g=>modelos.some(m=>m.grupo===g)).map((g,i)=>`<section class="grupo-documentos" aria-labelledby="finalidade-${i}"><h3 id="finalidade-${i}">${esc(g)}</h3><div class="grade duas">${modelos.filter(m=>m.grupo===g).map(m=>{
      const guia=guiaModelo(m.codigo);const formato=m.arquivo.endsWith('xlsx')?'Excel':'Word';
      return `<article class="cartao modelo-documental" aria-labelledby="modelo-${m.codigo}"><p class="sobretitulo">${esc(m.codigo)} · ${formato}</p><h4 id="modelo-${m.codigo}">${esc(m.titulo)}</h4><p>${esc(guia.quando)}</p><p class="origem"><strong>Comece assim:</strong> ${esc(guia.comecar)}</p><div class="acoes"><a class="botao" href="./modelos/refeitos/${esc(m.arquivo)}" download aria-label="Baixar ${esc(m.titulo)} em ${formato}">Baixar ${formato}</a><a href="./modelos/refeitos/previas/${esc(m.arquivo.replace(/\.(xlsx|docx)$/,'.pdf'))}" target="_blank" rel="noopener" aria-label="Ver prévia de ${esc(m.titulo)} em PDF, abre em nova aba">Ver PDF <span class="oculto">(nova aba)</span></a></div>${m.preenchimento==='parcial'?`<p class="origem"><a href="#entrega-modelos?documento=${m.codigo}">Preencher ${esc(m.titulo)} com meus equipamentos</a></p>`:'<p class="origem">Preenchimento no próprio arquivo. Não exige cadastro no aplicativo.</p>'}</article>`;
    }).join('')}</div></section>`).join('')||'<section class="cartao estado-vazio"><h3>Nenhum modelo encontrado</h3><p>Tente outra palavra ou remova o filtro de finalidade.</p><button class="secundario" id="limpar-documentos">Limpar filtros</button></section>';
    lista.querySelector('#limpar-documentos')?.addEventListener('click',()=>{input.value='';grupo.value='';render();input.focus();});
  }
  input.addEventListener('input',render);grupo.addEventListener('change',render);render();
}
