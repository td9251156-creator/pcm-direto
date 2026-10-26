import contrato from '../dados/modelos-refeitos.json';
import {esc} from '../ui.js';

export function telaModelos(main){
  main.innerHTML=`<header class="abertura-marca"><p class="sobretitulo">Modelos refeitos · ${esc(contrato.versao)}</p><h2>Documentos PCM Direto</h2><p>Escolha o documento pela finalidade. Azul-claro indica entradas; cinza indica fórmulas protegidas.</p><div class="acoes"><a class="botao" href="./modelos/PCMD-refeitos.zip" download>Baixar os 18 modelos em branco (.zip)</a><a class="botao secundario" href="#entrega">Preencher com os dados do aplicativo</a></div><p class="origem">Ativos, plano, controle documental e manuais recebem os dados disponíveis. Os demais controles são manuais. Os arquivos não sincronizam entre si.</p></header><label for="buscar-documentos">Buscar documentos</label><input type="search" id="buscar-documentos" placeholder="Ex.: estoque, checklist, falha…" aria-controls="lista-documentos"><p id="resultado-documentos" role="status" aria-live="polite"></p><div id="lista-documentos"></div><p><a href="#marca">Consultar o manual da marca</a> · <a href="#inicio">Voltar ao início</a></p>`;
  const input=main.querySelector('#buscar-documentos');const list=main.querySelector('#lista-documentos');
  function render(){
    const normal=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q=normal(input.value.trim());const modelos=contrato.modelos.filter(m=>normal([m.codigo,m.titulo,m.descricao,m.grupo].join(' ')).includes(q));
    main.querySelector('#resultado-documentos').textContent=`${modelos.length} documentos encontrados.`;
    const grupos=['Operação','Materiais','Resultados e ações','Governança','Gestão integrada','Manuais'].filter(g=>modelos.some(m=>m.grupo===g));
    list.innerHTML=grupos.map((group,i)=>`<details class="cartao" ${i===0||q?'open':''}><summary><h3>${esc(group)}</h3></summary><div class="grade duas">${modelos.filter(m=>m.grupo===group).map(m=>`<article class="modelo-documental"><p class="sobretitulo">${esc(m.codigo)} · ${m.arquivo.endsWith('xlsx')?'Excel':'Word'}</p><h4>${esc(m.titulo)}</h4><p>${esc(m.descricao)}</p><p class="origem">${m.preenchimento==='parcial'?'Preenchimento parcial pelo aplicativo; requer conferência.':'Preenchimento manual.'}</p><div class="acoes"><a href="./modelos/${esc(m.arquivo)}" download>Baixar modelo</a><a href="./modelos/previas/${esc(m.arquivo.replace(/\.(xlsx|docx)$/,'.pdf'))}" target="_blank" rel="noopener">Ver prévia PDF</a></div></article>`).join('')}</div></details>`).join('')||'<p>Nenhum documento corresponde à busca. Tente outro termo.</p>';
  }
  input.addEventListener('input',render);render();
}
