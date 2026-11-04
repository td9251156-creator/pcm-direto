import {MODELOS_V2} from '../dados/modelos-v2.js';
import {cartaoModeloV2} from './modelos.js';
import { BIBLIOTECA_PADRAO, estado, demonstrar, emDemonstracao, sairDaDemonstracao } from '../estado.js';
import { esc,baixar,avisar, num } from '../ui.js';
import { correspondeBusca } from '../logica/texto.js';
import { CAMINHOS_COMUNIDADE, modelosDoCaminho, acessoAoPcm } from '../logica/entrada-comunidade.js';
import { ligarOrientacaoModelos } from './orientacao-modelo.js';

// Preferências de navegação só em memória; não fazem parte da base nem do backup.
const filtros = { caminho: 'os', todos: false, categoria: 'documentos', busca: '' };
let exemploPendente = null;
export const aberturaExemploPendente = () => exemploPendente;

export function telaComunidade(main, ir){
  let encerrada=false;
  main.innerHTML=`<div class="comunidade-abertura">
    <header class="cabecalho-tela"><p class="sobretitulo">Comunidade PCM Direto</p><h2>Conhecimento aberto.<br>Manutenção melhor organizada.</h2><p class="origem">Baixe documentos, encontre tarefas de referência e compartilhe modelos com outros profissionais.</p><div class="acoes"><button id="explorar-modelos">Encontrar um modelo</button><a class="botao secundario" href="#catalogo">Participar da comunidade</a></div><p class="origem nota-acesso">Downloads gratuitos, sem precisar de conta.</p></header>
    <section class="cartao acesso-pcm" id="acesso-pcm"></section>
    </div>
    <section class="cartao"><h3>Biblioteca PCM v2</h3><p>${MODELOS_V2.length} modelos em Excel e Word organizados por finalidade: planejamento, ordens de serviço, falhas, segurança, materiais, indicadores e manuais.</p><div class="acoes"><a class="botao secundario" href="#modelos">Ver modelos por finalidade</a></div></section><section class="banco-cabecalho" aria-labelledby="titulo-modelos"><p class="sobretitulo">Banco de modelos</p><h3 id="titulo-modelos">Baixe, adapte e comece a usar</h3><p class="origem">Baixe os modelos da Biblioteca PCM v2 em branco. Na opção Máquinas e tarefas, encontre roteiros de referência.</p></section>
    <h3>O que você precisa organizar?</h3><div class="caminhos-comunidade" role="group" aria-label="Sua necessidade">${CAMINHOS_COMUNIDADE.map(c=>`<button class="secundario" data-caminho="${c.id}" aria-pressed="false" aria-controls="banco-modelos">${esc(c.titulo)}</button>`).join('')}</div>
    <div class="filtros-modelos"><div class="categorias" role="group" aria-label="Tipo de modelo"><button id="categoria-documentos" aria-pressed="true" aria-controls="banco-modelos">Documentos PCM</button><button id="categoria-maquinas" class="secundario" aria-pressed="false" aria-controls="banco-modelos">Máquinas e tarefas</button></div><div class="busca-modelos"><label for="buscar-modelos">Buscar modelos</label><input type="search" id="buscar-modelos" value="${esc(filtros.busca)}" placeholder="Ex.: criticidade, motor, rolamento…" aria-controls="banco-modelos"></div></div>
    <div class="controles-caminho"><p class="origem">Três sugestões para começar. A busca encontra todos os modelos da categoria.</p><button class="secundario" id="ver-todos-modelos" aria-controls="banco-modelos" aria-pressed="false">Ver todos os 19 modelos</button></div>
    <p class="origem" id="resultado-modelos" role="status" aria-live="polite" aria-atomic="true"></p><section class="grade duas" id="banco-modelos" aria-labelledby="titulo-modelos"></section>
    <section class="cartao convite-comunidade"><div><h3>Compartilhe o que funciona</h3><p>Publique modelos, curta e comente as contribuições. Para publicar, entre na sua conta. As publicações passam por moderação.</p><p class="origem">Seu inventário e os registros da fábrica continuam privados.</p></div><div class="acoes"><a class="botao secundario" href="#catalogo">Abrir publicações</a><a class="botao secundario" href="#contribuir">Como contribuir</a></div></section>`;
  const busca=main.querySelector('#buscar-modelos');
  const acesso=main.querySelector('#acesso-pcm');
  function desenharAcesso(){
    if (!acesso.isConnected) return;
    const a=acessoAoPcm(estado,emDemonstracao());
    const explorar='<button type="button" data-demonstrar>Explorar o exemplo</button>';
    acesso.innerHTML=`<p class="sobretitulo">${a.exemplo?'Demonstração · dados fictícios':'Seu espaço de trabalho'}</p><h3>${a.exemplo?'Conheça a rotina sem substituir seus dados':'O PCM da sua fábrica'}</h3><p>Cadastre os equipamentos, organize o plano e acompanhe as execuções.</p><div class="acoes">${a.novo?explorar:''}<a class="botao secundario" href="#${a.rota}">${a.titulo}</a>${a.exemplo?'<button class="secundario" type="button" data-sair-exemplo>Voltar aos meus dados</button>':a.novo?'':explorar}</div><p class="origem">Dados da fábrica privados neste aparelho. A operação local funciona sem internet após o carregamento.</p>`;
    acesso.setAttribute('aria-busy',String(!!exemploPendente));
    for(const b of acesso.querySelectorAll('button'))b.disabled=!!exemploPendente;
    if(exemploPendente)acesso.insertAdjacentHTML('beforeend','<p role="status">Abrindo o exemplo. Aguarde a gravação em andamento terminar.</p>');
    acesso.querySelector('[data-sair-exemplo]')?.addEventListener('click',()=>{sairDaDemonstracao();ir('comunidade');main.querySelector('#acesso-pcm a')?.focus();});
    acesso.querySelector('[data-demonstrar]')?.addEventListener('click',async()=>{
      if(exemploPendente)return;
      exemploPendente=(async()=>{
        try{await demonstrar();if(!encerrada&&acesso.isConnected)ir('semana');else if(emDemonstracao())sairDaDemonstracao();}
        catch{if(emDemonstracao())sairDaDemonstracao();if(!encerrada)avisar('Não foi possível abrir o exemplo. Seus dados foram mantidos.');}
        finally{exemploPendente=null;if(!encerrada)desenharAcesso();}
      })();
      desenharAcesso();
    });
  }
  desenharAcesso();
  if(exemploPendente)exemploPendente.finally(desenharAcesso).catch(()=>{});
  main.querySelector('#explorar-modelos').onclick=()=>{busca.focus({preventScroll:true});busca.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  const lista=main.querySelector('#banco-modelos');
  ligarOrientacaoModelos(lista);
  function render(){const q=main.querySelector('#buscar-modelos').value.trim();
    filtros.busca=busca.value;
    for(const c of main.querySelectorAll('[data-caminho]'))c.setAttribute('aria-pressed',String(filtros.categoria==='documentos'&&c.dataset.caminho===filtros.caminho));
    for(const valor of ['documentos','maquinas']){const b=main.querySelector('#categoria-'+valor);b.setAttribute('aria-pressed',String(filtros.categoria===valor));b.classList.toggle('secundario',filtros.categoria!==valor);}
    const todos=main.querySelector('#ver-todos-modelos');todos.hidden=filtros.categoria!=='documentos';todos.setAttribute('aria-pressed',String(filtros.todos));todos.textContent=filtros.todos?'Voltar às três sugestões':'Ver todos os 19 modelos';
    lista.innerHTML=filtros.categoria==='documentos'?modelosDoCaminho(MODELOS_V2,{...filtros,busca:q}).map(m=>cartaoModeloV2(m,'modelo-publico')).join(''):
      BIBLIOTECA_PADRAO.tipos.filter(t=>correspondeBusca([t.nome,t.id,...t.tarefas.flatMap(tarefa=>[tarefa.id,tarefa.descricao,tarefa.especialidade,tarefa.periodicidade])].join(' '),q)).map(t=>`<article class="cartao modelo-publico"><span class="sobretitulo">Máquinas e tarefas · PDF</span><h3>${esc(t.nome)}</h3><p>${t.tarefas.length} tarefas preventivas de referência.</p><p class="origem">Biblioteca ${esc(BIBLIOTECA_PADRAO.versao)}.</p><details class="previa-tarefas"><summary>Ver as ${t.tarefas.length} tarefas de ${esc(t.nome)}</summary><ol>${t.tarefas.map(tarefa=>`<li><strong>${esc(tarefa.id)} · ${esc(tarefa.descricao)}</strong>${tarefa.seguranca?' <span class="selo-seguranca">SEGURANÇA</span>':''}<p>${esc(tarefa.periodicidade)} · ${esc(tarefa.especialidade)} · ${num(tarefa.duracao_horas, 3)} h por execução</p>${tarefa.observacao?`<p>${esc(tarefa.observacao)}</p>`:''}</li>`).join('')}</ol></details><div class="acoes"><a class="botao" href="./modelos/maquinas/pcm-modelo-${esc(t.id)}.pdf" download>Baixar modelo em PDF</a><a href="#biblioteca">Criar uma versão local</a></div><details><summary>Outros formatos</summary><button class="secundario" data-baixar-tipo="${esc(t.id)}">Baixar dados editáveis (.json)</button></details></article>`).join('');
    const quantidade=lista.querySelectorAll('article').length;
    main.querySelector('#resultado-modelos').textContent=`${quantidade} ${quantidade===1?'modelo encontrado':'modelos encontrados'}${q?' para sua busca':''}.`;
    if(!lista.innerHTML){lista.innerHTML='<div class="cartao estado-vazio"><h3>Nenhum modelo encontrado</h3><p>Tente outro termo ou escolha outra categoria.</p><button class="secundario" id="limpar-busca">Limpar busca</button></div>';lista.querySelector('#limpar-busca').onclick=()=>{busca.value='';render();busca.focus();};}
    lista.querySelectorAll('[data-baixar-tipo]').forEach(b=>b.onclick=()=>{const tipo=BIBLIOTECA_PADRAO.tipos.find(t=>t.id===b.dataset.baixarTipo);baixar(JSON.stringify({...BIBLIOTECA_PADRAO,tipos:[tipo]},null,2),`pcm-modelo-${tipo.id}.json`,'application/json');avisar('Modelo técnico preparado para download. Revise antes de usar.');});
  }
  for(const valor of ['documentos','maquinas'])main.querySelector('#categoria-'+valor).onclick=()=>{filtros.categoria=valor;render();};
  main.querySelector('#ver-todos-modelos').onclick=()=>{filtros.todos=!filtros.todos;render();};
  for(const botao of main.querySelectorAll('[data-caminho]'))botao.onclick=()=>{filtros.caminho=botao.dataset.caminho;filtros.categoria='documentos';filtros.todos=false;busca.value='';render();};
  main.querySelector('#buscar-modelos').oninput=render;render();
  return ()=>{encerrada=true;};
}
