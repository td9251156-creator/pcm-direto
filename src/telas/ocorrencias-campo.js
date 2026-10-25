import { estado, registrarOcorrencia, cancelarExecucao } from '../estado.js';
import { ocorrenciasVigentes, conclusoesPorOcorrencia, painelDaSemana } from '../logica/programacao.js';
import { textoData } from '../logica/cronograma.js';
import { correspondeBusca } from '../logica/texto.js';
import { dataExibida,grupoDaPrevisao,consultarHistorico,paginarConsulta } from '../logica/consulta-execucao.js';
import { esc, num, avisar, baixar } from '../ui.js';
import { pessoaNome } from './gestao-ui.js';
import { abrirExecucao } from './campo-ui.js';
import { confirmarCancelamento } from './confirmacao.js';

export function telaOcorrenciasCampo(main, _ir, anterior = {}) {
  const todas=ocorrenciasVigentes(estado.programacao);
  const conclusoes=conclusoesPorOcorrencia(estado.programacao,estado.gestao.historico);
  const hoje=textoData(new Date());
  const semana=painelDaSemana(estado.programacao,estado.gestao.historico);
  const ui={periodo:'semana',especialidade:'',setor:'',tag:'',responsavelId:'',busca:'',pagina:1,completo:false,historico:{busca:'',situacao:'todas',de:'',ate:''},...anterior};
  const opcoes=[['semana','Vencidas e semana'],['todas','Todas pendentes'],['feitas','Concluídas']];
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Executar</p><h2>Ocorrências e histórico</h2><p class="origem">Registre cada ocorrência uma vez e consulte o que já foi realizado.</p></header>
  <section class="filtros-execucao cartao"><label for="buscar-ocorrencias">Buscar por TAG, tarefa ou responsável</label><input type="search" id="buscar-ocorrencias" value="${esc(ui.busca)}" placeholder="Ex.: motor, lubrificação…" aria-controls="lista-ocorrencias">
  <div class="periodos" role="group" aria-label="Período das ocorrências">${opcoes.map(([v,n])=>`<button type="button" data-periodo="${v}" aria-pressed="${ui.periodo===v}">${n}</button>`).join('')}</div><div class="chips" id="chips-especialidade" role="group" aria-label="Especialidade"></div>
  <details><summary>Setor, equipamento e responsável</summary><div class="grade tres">${[['setor','Setor'],['tag','Equipamento'],['responsavelId','Responsável']].map(([k,n])=>`<div><label for="f-${k}">${n}</label><select id="f-${k}" data-filtro="${k}"><option value="">Todos</option>${[...new Set(todas.map(o=>o[k]))].filter(Boolean).sort().map(v=>`<option value="${esc(v)}" ${ui[k]===v?'selected':''}>${esc(k==='responsavelId'?pessoaNome(v):v)}</option>`).join('')}</select></div>`).join('')}</div></details>
  <p class="origem" id="resumo-ocorrencias" role="status" tabindex="-1"></p></section>
  <div class="execucao-paineis"><section id="lista-ocorrencias" aria-label="Ocorrências"></section><section class="cartao historico-campo"><h3>Histórico completo</h3><p class="origem">Filtre pela data realizada. Cancelamentos e registros sem previsão continuam disponíveis.</p>
  <label for="h-busca">Buscar no histórico</label><input id="h-busca" type="search" value="${esc(ui.historico.busca)}" aria-controls="registros-campo" placeholder="TAG, tarefa ou observação">
  <div class="grade duas"><div><label for="h-de">Realizada de</label><input id="h-de" type="date" value="${esc(ui.historico.de)}"></div><div><label for="h-ate">Realizada até</label><input id="h-ate" type="date" value="${esc(ui.historico.ate)}"></div></div>
  <label for="h-situacao">Situação do registro</label><select id="h-situacao">${[['todas','Todas'],['realizadas','Realizadas'],['canceladas','Canceladas']].map(([v,n])=>`<option value="${v}" ${ui.historico.situacao===v?'selected':''}>${n}</option>`).join('')}</select>
  <p id="resumo-historico" role="status" class="origem"></p><div class="acoes"><button type="button" class="secundario" id="limpar-historico">Limpar filtros</button><button type="button" class="secundario" id="baixar-consulta">Baixar resultados (.json)</button></div><p class="origem">Arquivo de consulta. Para restaurar o app, use o backup completo em Meus dados.</p><div id="registros-campo"></div></section></div>`;
  const visita=main.querySelector('.filtros-execucao');
  const ativa=()=>visita.isConnected&&main.isConnected&&location.hash.split('?')[0]==='#executar';
  const redesenhar=()=>{if(ativa()){telaOcorrenciasCampo(main,null,ui);main.querySelector('#resumo-ocorrencias')?.focus();}};
  let limiteOcorrencias=20;
  let resultados=[];
  function listar(){
    const base=todas.filter(o=>(ui.periodo==='feitas'?conclusoes.has(o.id):!conclusoes.has(o.id))&&(ui.periodo!=='semana'||o.dataPrevista<=semana.fim)&&['setor','tag','responsavelId'].every(k=>!ui[k]||o[k]===ui[k])&&correspondeBusca([o.tag,o.descricao,o.especialidade,pessoaNome(o.responsavelId),o.dataPrevista,dataExibida(o.dataPrevista)].join(' '),ui.busca));
    const especialidades=['',...new Set(todas.map(o=>o.especialidade).filter(Boolean))];
    const chips=main.querySelector('#chips-especialidade');
    const focoChip=chips.contains(document.activeElement)?document.activeElement.dataset.especialidade:null;
    chips.innerHTML=especialidades.map(esp=>`<button class="secundario" type="button" data-especialidade="${esc(esp)}" aria-pressed="${esp===ui.especialidade}">${esc(esp||'Todas')} · ${base.filter(o=>!esp||o.especialidade===esp).length}</button>`).join('');
    chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{ui.especialidade=b.dataset.especialidade;limiteOcorrencias=20;listar();});
    if(focoChip!==null)[...chips.querySelectorAll('button')].find(b=>b.dataset.especialidade===focoChip)?.focus();
    const lista=base.filter(o=>!ui.especialidade||o.especialidade===ui.especialidade).sort((a,b)=>ui.periodo==='feitas'?(conclusoes.get(b.id)?.data??'').localeCompare(conclusoes.get(a.id)?.data??'')||a.id.localeCompare(b.id):a.dataPrevista.localeCompare(b.dataPrevista)||a.id.localeCompare(b.id));
    main.querySelector('#resumo-ocorrencias').textContent=`${lista.length} ocorrências · ${num(lista.reduce((s,o)=>s+o.horas,0),3)} h previstas. Exibindo ${Math.min(limiteOcorrencias,lista.length)}.`;
    const grupos=new Map();
    for(const o of lista.slice(0,limiteOcorrencias)){
      const grupo=ui.periodo==='feitas'?'Concluídas':grupoDaPrevisao(o.dataPrevista,hoje);
      const itens=grupos.get(grupo)||[];itens.push(o);grupos.set(grupo,itens);
    }
    const area=main.querySelector('#lista-ocorrencias');const focoMais=document.activeElement?.id==='mais-ocorrencias';
    area.innerHTML=[...grupos].map(([nome,itens])=>`<section class="cartao grupo-ocorrencias"><h3>${esc(nome)} <small>${itens.length} ocorrências · ${num(itens.reduce((s,o)=>s+o.horas,0),3)} h</small></h3>${itens.map(o=>`<article class="ocorrencia" data-item-ocorrencia="${esc(o.id)}"><div><strong>${esc(o.tag)}</strong> · prevista ${dataExibida(o.dataPrevista)} ${o.dataPrevista<hoje&&!conclusoes.has(o.id)?'<span class="pendencia">Vencida</span>':''}${o.seguranca?' <span class="selo-seguranca">SEGURANÇA</span>':''}<p>${esc(o.descricao)}</p><p class="origem">${esc(o.especialidade)} · ${num(o.horas,3)} h · ${esc(pessoaNome(o.responsavelId))}</p><button class="secundario" data-detalhes="${esc(o.id)}">Data e observação</button></div>${conclusoes.has(o.id)?`<span class="sucesso">Concluída em ${dataExibida(conclusoes.get(o.id).data)}</span>`:`<button data-feito="${esc(o.id)}">Feito hoje</button>`}</article>`).join('')}</section>`).join('')||'<section class="cartao"><h3>Nenhuma ocorrência com esses filtros</h3><p>Tente outro termo ou limpe os filtros.</p><button type="button" class="secundario" id="limpar-ocorrencias">Limpar filtros</button></section>';
    area.querySelector('#limpar-ocorrencias')?.addEventListener('click',()=>{ui.busca='';ui.especialidade='';for(const k of ['setor','tag','responsavelId']){ui[k]='';main.querySelector('#f-'+k).value='';}main.querySelector('#buscar-ocorrencias').value='';listar();main.querySelector('#buscar-ocorrencias').focus();});
    if(lista.length>limiteOcorrencias)area.insertAdjacentHTML('beforeend','<button type="button" class="secundario" id="mais-ocorrencias">Mostrar mais 20 ocorrências</button>');
    area.querySelector('#mais-ocorrencias')?.addEventListener('click',()=>{limiteOcorrencias+=20;listar();});
    if(focoMais)(area.querySelector('#mais-ocorrencias')||main.querySelector('#resumo-ocorrencias')).focus();
    area.querySelectorAll('[data-detalhes]').forEach(b=>b.onclick=()=>abrirExecucao(b.dataset.detalhes,redesenhar));
    area.querySelectorAll('[data-feito]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{const r=await registrarOcorrencia(b.dataset.feito);if(!ativa())return;if(!r.ok){b.disabled=false;avisar(r.motivo);return;}redesenhar();avisar(r.guardado?'Execução registrada neste aparelho.':'Não foi possível guardar; baixe um backup antes de sair.');}
      catch{if(ativa()){b.disabled=false;avisar('Não foi possível registrar. Confira o histórico antes de tentar novamente.');}}
    });
  }
  main.querySelector('#buscar-ocorrencias').oninput=e=>{ui.busca=e.target.value;limiteOcorrencias=20;listar();};
  main.querySelectorAll('[data-periodo]').forEach(b=>b.onclick=()=>{ui.periodo=b.dataset.periodo;limiteOcorrencias=20;main.querySelectorAll('[data-periodo]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));listar();});
  main.querySelectorAll('[data-filtro]').forEach(s=>s.onchange=()=>{ui[s.dataset.filtro]=s.value;limiteOcorrencias=20;listar();});
  function registros(){
    const invalido=ui.historico.de&&ui.historico.ate&&ui.historico.de>ui.historico.ate;
    resultados=invalido?[]:consultarHistorico(estado.gestao.historico,ui.historico,pessoaNome);
    const pagina=paginarConsulta(resultados,ui.completo?ui.pagina:1,ui.completo?20:4);ui.pagina=pagina.pagina;
    main.querySelector('#resumo-historico').textContent=invalido?'A data inicial deve ser anterior ou igual à data final.':`${pagina.inicio}–${pagina.fim} de ${pagina.total} registros encontrados.`;
    main.querySelector('#baixar-consulta').disabled=!resultados.length;
    const area=main.querySelector('#registros-campo');const foco=document.activeElement?.id;
    area.innerHTML=pagina.itens.map(h=>`<article class="ocorrencia ${h.cancelada?'registro-cancelado':''}" data-registro="${esc(h.id)}"><div><strong>${esc(h.tag)}</strong> · realizada ${dataExibida(h.data)}<p>${esc(h.descricao)}</p><p class="origem">${h.dataPrevista?'Prevista '+dataExibida(h.dataPrevista):'Sem previsão'} · ${h.ocorrenciaId?'Vinculada à ocorrência':h.dataPrevista?'Vínculo legado explícito':'Sem vínculo'} · ${esc(pessoaNome(h.responsavelId))}</p>${h.observacao?`<p>${esc(h.observacao)}</p>`:''}<span class="${h.cancelada?'origem':'sucesso'}">${h.cancelada?'Cancelada':'Realizada'}</span></div>${h.cancelada?'':`<button class="secundario" data-cancelar="${esc(h.id)}">Cancelar registro</button>`}</article>`).join('')||'<p>Nenhum registro com esses filtros.</p>';
    if(resultados.length>4)area.insertAdjacentHTML('beforeend',`<button type="button" class="secundario" id="expandir-historico">${ui.completo?'Mostrar menos':'Ver todos os registros ('+resultados.length+')'}</button>`);
    if(ui.completo&&pagina.paginas>1)area.insertAdjacentHTML('beforeend',`<nav class="paginacao" aria-label="Páginas do histórico"><button type="button" class="secundario" id="pagina-anterior" ${pagina.pagina===1?'disabled':''}>Anterior</button><span>Página ${pagina.pagina} de ${pagina.paginas}</span><button type="button" class="secundario" id="pagina-proxima" ${pagina.pagina===pagina.paginas?'disabled':''}>Próxima</button></nav>`);
    area.querySelector('#expandir-historico')?.addEventListener('click',()=>{ui.completo=!ui.completo;ui.pagina=1;registros();});
    for(const [id,incremento] of [['pagina-anterior',-1],['pagina-proxima',1]])area.querySelector('#'+id)?.addEventListener('click',()=>{ui.pagina+=incremento;registros();});
    if(['expandir-historico','pagina-anterior','pagina-proxima'].includes(foco)){
      const alvo=area.querySelector('#'+foco);if(alvo&&!alvo.disabled)alvo.focus();else main.querySelector('#resumo-historico').setAttribute('tabindex','-1'),main.querySelector('#resumo-historico').focus();
    }
    area.querySelectorAll('[data-cancelar]').forEach(b=>b.onclick=async()=>{
      const h=estado.gestao.historico.find(h=>h.id===b.dataset.cancelar);
      if(!h||!await confirmarCancelamento(h)||!ativa())return;
      b.disabled=true;
      try{const r=await cancelarExecucao(h.id);if(!ativa())return;if(!r.ok){b.disabled=false;avisar(r.motivo);return;}redesenhar();avisar('Execução cancelada e preservada.');}
      catch{if(ativa()){b.disabled=false;avisar('Não foi possível cancelar. O registro anterior foi preservado.');}}
    });
  }
  for(const [id,k] of [['h-busca','busca'],['h-de','de'],['h-ate','ate'],['h-situacao','situacao']])main.querySelector('#'+id).addEventListener(id==='h-busca'?'input':'change',e=>{ui.historico[k]=e.target.value;ui.pagina=1;registros();});
  main.querySelector('#limpar-historico').onclick=()=>{ui.historico={busca:'',situacao:'todas',de:'',ate:''};for(const [id,v] of [['h-busca',''],['h-de',''],['h-ate',''],['h-situacao','todas']])main.querySelector('#'+id).value=v;ui.pagina=1;registros();main.querySelector('#h-busca').focus();};
  main.querySelector('#baixar-consulta').onclick=()=>baixar(JSON.stringify({aplicativo:'PCM Direto',tipo:'consulta-historico',geradoEm:new Date().toISOString(),filtros:ui.historico,registros:resultados},null,2),'pcm-direto-consulta-historico.json','application/json');
  listar();registros();
}
