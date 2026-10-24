import { BIBLIOTECA_PADRAO, estado } from '../estado.js';
import { esc,baixar,avisar } from '../ui.js';
export const MODELOS_DOCUMENTAIS=[
  ['PCMD-01','Controle documental','Lista mestra, organização, pessoas e referências.','PCMD-01-Controle-Documental','xlsx'],
  ['PCMD-02','Ativos e criticidade','Inventário de ativos e avaliação A/B/C.','PCMD-02-Ativos-Criticidade','xlsx'],
  ['PCMD-03/04','Plano e cronograma','Plano mestre, ocorrências e acompanhamento mensal.','PCMD-03-04-Plano-Cronograma','xlsx'],
  ['PCMD-05','Ficha de falha','Sintoma, causa, ação, peça e parada.','PCMD-05-Ficha-Falha','xlsx'],
  ['PCMD-W1','Gestão de ativos','Manual para organizar ativos e responsabilidades.','PCMD-W1-Manual-Gestao-Ativos','docx'],
  ['PCMD-W2','Estratégia de manutenção','Manual de planejamento e revisão das estratégias.','PCMD-W2-Manual-Estrategia-Manutencao','docx'],
];
export function telaComunidade(main){
  main.innerHTML=`<div class="comunidade-abertura">
    <header class="cabecalho-tela"><p class="sobretitulo">Comunidade PCM Direto</p><h2>Conhecimento aberto.<br>Manutenção melhor organizada.</h2><p class="origem">Baixe documentos, encontre tarefas de referência e compartilhe modelos com outros profissionais.</p><div class="acoes"><button id="explorar-modelos">Encontrar um modelo</button><a class="botao secundario" href="#catalogo">Participar da comunidade</a></div><p class="origem nota-acesso">Downloads gratuitos, sem precisar de conta.</p></header>
    <section class="cartao acesso-pcm"><p class="sobretitulo">Seu espaço de trabalho</p><h3>O PCM da sua fábrica</h3><p>Cadastre os equipamentos, organize o plano e acompanhe as execuções.</p><a class="botao secundario" href="#inicio">${estado.equipamentos.length?'Continuar meu PCM':'Começar meu PCM'}</a><p class="origem">Dados da fábrica privados neste aparelho. A operação local funciona sem internet.</p></section>
    </div>
    <section class="banco-cabecalho" aria-labelledby="titulo-modelos"><p class="sobretitulo">Banco de modelos</p><h3 id="titulo-modelos">Baixe, adapte e comece a usar</h3><p class="origem">Documentos PCMD e modelos de máquinas com tarefas de referência. Revise o conteúdo antes de aplicar.</p></section>
    <div class="filtros-modelos"><div class="categorias" role="group" aria-label="Tipo de modelo"><button id="categoria-documentos" aria-pressed="true" aria-controls="banco-modelos">Documentos PCMD</button><button id="categoria-maquinas" class="secundario" aria-pressed="false" aria-controls="banco-modelos">Máquinas e tarefas</button></div><div class="busca-modelos"><label for="buscar-modelos">Buscar modelos</label><input type="search" id="buscar-modelos" placeholder="Ex.: criticidade, motor, falha…" aria-controls="banco-modelos"></div></div>
    <p class="origem" id="resultado-modelos" role="status" aria-live="polite" aria-atomic="true"></p><section class="grade duas" id="banco-modelos" aria-labelledby="titulo-modelos"></section>
    <section class="cartao convite-comunidade"><div><h3>Compartilhe o que funciona</h3><p>Publique modelos, curta e comente as contribuições. Para contribuir, entre na sua conta. As publicações passam por moderação.</p><p class="origem">Somente o conteúdo que você propõe é enviado. Seu inventário e os registros da fábrica continuam privados.</p></div><a class="botao secundario" href="#catalogo">Abrir publicações</a></section>`;
  const busca=main.querySelector('#buscar-modelos');
  main.querySelector('#explorar-modelos').onclick=()=>{busca.focus({preventScroll:true});busca.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  let categoria='documentos';
  const lista=main.querySelector('#banco-modelos');
  function render(){const q=main.querySelector('#buscar-modelos').value.toLocaleLowerCase('pt-BR');
    lista.innerHTML=categoria==='documentos'?MODELOS_DOCUMENTAIS.filter(m=>m.join(' ').toLocaleLowerCase('pt-BR').includes(q)).map(([codigo,nome,descricao,arquivo,ext])=>`<article class="cartao modelo-publico"><span class="sobretitulo">${codigo} · ${ext.toUpperCase()}</span><h3>${nome}</h3><p>${descricao}</p><p class="origem">PCM Direto · versão 1.0.0 · MIT</p><div class="acoes"><a class="botao" href="./modelos/${arquivo}.${ext}" download>Baixar modelo</a><a href="./modelos/${arquivo}-Exemplo.${ext}" download>Ver exemplo preenchido</a></div></article>`).join(''):
      BIBLIOTECA_PADRAO.tipos.filter(t=>`${t.nome} ${t.id}`.toLocaleLowerCase('pt-BR').includes(q)).map(t=>`<article class="cartao modelo-publico"><span class="sobretitulo">Máquinas e tarefas</span><h3>${esc(t.nome)}</h3><p>${t.tarefas.length} tarefas preventivas de referência, com origem e versão.</p><p class="origem">Biblioteca ${esc(BIBLIOTECA_PADRAO.versao)} · base genérica a validar com manual do fabricante.</p><div class="acoes"><button data-baixar-tipo="${esc(t.id)}">Baixar modelo (.json)</button><a href="#biblioteca">Criar uma versão local</a></div></article>`).join('');
    const quantidade=lista.querySelectorAll('article').length;
    main.querySelector('#resultado-modelos').textContent=`${quantidade} ${quantidade===1?'modelo encontrado':'modelos encontrados'}${q?' para sua busca':''}.`;
    if(!lista.innerHTML){lista.innerHTML='<div class="cartao estado-vazio"><h3>Nenhum modelo encontrado</h3><p>Tente outro termo ou escolha outra categoria.</p><button class="secundario" id="limpar-busca">Limpar busca</button></div>';lista.querySelector('#limpar-busca').onclick=()=>{busca.value='';render();busca.focus();};}
    lista.querySelectorAll('[data-baixar-tipo]').forEach(b=>b.onclick=()=>{const tipo=BIBLIOTECA_PADRAO.tipos.find(t=>t.id===b.dataset.baixarTipo);baixar(JSON.stringify({...BIBLIOTECA_PADRAO,tipos:[tipo]},null,2),`pcm-modelo-${tipo.id}.json`,'application/json');avisar('Modelo técnico preparado para download. Revise antes de usar.');});
  }
  for(const valor of ['documentos','maquinas'])main.querySelector('#categoria-'+valor).onclick=()=>{categoria=valor;for(const v of ['documentos','maquinas']){const b=main.querySelector('#categoria-'+v);b.setAttribute('aria-pressed',String(v===valor));b.classList.toggle('secundario',v!==valor);}render();};
  main.querySelector('#buscar-modelos').oninput=render;render();
}
