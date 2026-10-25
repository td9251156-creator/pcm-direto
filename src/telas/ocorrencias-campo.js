import { estado, registrarOcorrencia, cancelarExecucao } from '../estado.js';
import { ocorrenciasVigentes, idsConcluidos, painelDaSemana } from '../logica/programacao.js';
import { textoData } from '../logica/cronograma.js';
import { esc, num, avisar } from '../ui.js';
import { pessoaNome } from './gestao-ui.js';
import { abrirExecucao } from './campo-ui.js';

export function telaOcorrenciasCampo(main, _ir, anterior = {}) {
  const todas=ocorrenciasVigentes(estado.programacao); const feitas=idsConcluidos(estado.programacao,estado.gestao.historico);
  const hoje=textoData(new Date());const semana=painelDaSemana(estado.programacao,estado.gestao.historico);
  const ui={periodo:'semana',especialidade:'',setor:'',tag:'',responsavelId:'',...anterior};
  const opcoes=[['semana','Vencidas e semana'],['todas','Todas pendentes'],['feitas','Concluídas']];
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Executar</p><h2>Ocorrências e histórico</h2><p class="origem">Uma realização por ocorrência prevista. Cancelamentos preservam o registro e reabrem a pendência.</p></header><section class="filtros-execucao cartao"><div class="periodos" role="group" aria-label="Período das ocorrências">${opcoes.map(([v,n])=>`<button type="button" data-periodo="${v}" aria-pressed="${ui.periodo===v}">${n}</button>`).join('')}</div><div class="chips" id="chips-especialidade" role="group" aria-label="Especialidade"></div><details><summary>Setor, equipamento e responsável</summary><div class="grade tres">${[['setor','Setor'],['tag','Equipamento'],['responsavelId','Responsável']].map(([k,n])=>`<div><label for="f-${k}">${n}</label><select id="f-${k}" data-filtro="${k}"><option value="">Todos</option>${[...new Set(todas.map(o=>o[k]))].filter(Boolean).sort().map(v=>`<option value="${esc(v)}" ${ui[k]===v?'selected':''}>${esc(k==='responsavelId'?pessoaNome(v):v)}</option>`).join('')}</select></div>`).join('')}</div></details></section><div class="execucao-paineis"><section id="lista-ocorrencias" aria-label="Ocorrências"></section><section class="cartao historico-campo"><h3>Histórico completo</h3><div id="registros-campo"></div></section></div>`;
  const visita=main.querySelector('.filtros-execucao');
  const redesenhar=()=>{if(visita.isConnected&&main.isConnected && location.hash.split('?')[0]==='#executar')telaOcorrenciasCampo(main,null,ui);};
  function listar(){
    const base=todas.filter(o=>(ui.periodo==='feitas'?feitas.has(o.id):!feitas.has(o.id))&&(ui.periodo!=='semana'||o.dataPrevista<=semana.fim)&&['setor','tag','responsavelId'].every(k=>!ui[k]||o[k]===ui[k]));
    const especialidades=['',...new Set(todas.map(o=>o.especialidade).filter(Boolean))];
    const chips=main.querySelector('#chips-especialidade');const focoChip=chips.contains(document.activeElement)?document.activeElement.dataset.especialidade:null;chips.innerHTML=especialidades.map(esp=>`<button class="secundario" type="button" data-especialidade="${esc(esp)}" aria-pressed="${esp===ui.especialidade}">${esc(esp||'Todas')} · ${base.filter(o=>!esp||o.especialidade===esp).length}</button>`).join('');
    chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{ui.especialidade=b.dataset.especialidade;listar();});
    if(focoChip!==null)[...chips.querySelectorAll('button')].find(b=>b.dataset.especialidade===focoChip)?.focus();
    const lista=base.filter(o=>!ui.especialidade||o.especialidade===ui.especialidade).sort((a,b)=>a.dataPrevista.localeCompare(b.dataPrevista));
    const grupos=new Map();
    for(const o of lista){const grupo=ui.periodo==='feitas'?'Concluídas':o.dataPrevista<hoje?'Vencidas':o.dataPrevista===hoje?'Hoje':o.dataPrevista;const itens=grupos.get(grupo)||[];itens.push(o);grupos.set(grupo,itens);}
    const area=main.querySelector('#lista-ocorrencias');
    area.innerHTML=[...grupos].map(([nome,itens])=>`<section class="cartao grupo-ocorrencias"><h3>${esc(nome)} <small>${itens.length} ocorrências · ${num(itens.reduce((s,o)=>s+o.horas,0),3)} h</small></h3>${itens.map(o=>`<article class="ocorrencia"><div><strong>${esc(o.tag)}</strong> · ${esc(o.dataPrevista)} ${o.dataPrevista<hoje&&!feitas.has(o.id)?'<span class="pendencia">Vencida</span>':''}${o.seguranca?' <span class="selo-seguranca">SEGURANÇA</span>':''}<p>${esc(o.descricao)}</p><p class="origem">${esc(o.especialidade)} · ${num(o.horas,3)} h · ${esc(pessoaNome(o.responsavelId))}</p><button class="secundario" data-detalhes="${esc(o.id)}">Data e observação</button></div>${feitas.has(o.id)?'<span class="sucesso">Concluída</span>':`<button data-feito="${esc(o.id)}">Feito hoje</button>`}</article>`).join('')}</section>`).join('')||`<section class="cartao"><h3>${ui.periodo==='feitas'?'Nenhuma conclusão ainda':'Nenhuma ocorrência com esses filtros'}</h3>${ui.especialidade?'<button type="button" class="secundario" id="limpar-especialidade">Limpar filtro</button>':''}</section>`;
    area.querySelector('#limpar-especialidade')?.addEventListener('click',()=>{ui.especialidade='';listar();main.querySelector('#chips-especialidade button')?.focus();});
    area.querySelectorAll('[data-detalhes]').forEach(b=>b.onclick=()=>abrirExecucao(b.dataset.detalhes,redesenhar));
    area.querySelectorAll('[data-feito]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await registrarOcorrencia(b.dataset.feito);if(!visita.isConnected||!main.isConnected||location.hash.split('?')[0]!=='#executar')return;if(!r.ok){b.disabled=false;avisar(r.motivo);return;}redesenhar();avisar(r.guardado?'Execução registrada neste aparelho.':'Não foi possível guardar; baixe um backup antes de sair.');});
  }
  main.querySelectorAll('[data-periodo]').forEach(b=>b.onclick=()=>{ui.periodo=b.dataset.periodo;main.querySelectorAll('[data-periodo]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));listar();});
  main.querySelectorAll('[data-filtro]').forEach(s=>s.onchange=()=>{ui[s.dataset.filtro]=s.value;listar();});
  const historico=estado.gestao.historico.slice().reverse();let completo=false;
  function registros(){
    const area=main.querySelector('#registros-campo');const focoExpandir=document.activeElement?.id==='expandir-historico';area.innerHTML=(completo?historico:historico.slice(0,4)).map(h=>`<article class="ocorrencia ${h.cancelada?'registro-cancelado':''}"><div><strong>${esc(h.tag)}</strong> · ${esc(h.data)}<p>${esc(h.descricao)}</p><p class="origem">${h.ocorrenciaId?'Ocorrência de '+esc(h.dataPrevista):h.dataPrevista?'Vínculo legado explícito':'Sem vínculo'} · ${esc(pessoaNome(h.responsavelId))} · ${esc(h.observacao)} · ${h.cancelada?'Cancelada':'Realizada'}</p></div>${h.cancelada?'':`<button class="secundario" data-cancelar="${esc(h.id)}">Cancelar registro</button>`}</article>`).join('')||'<p>Nenhuma execução registrada.</p>';
    if(historico.length>4)area.insertAdjacentHTML('beforeend',`<button type="button" class="secundario" id="expandir-historico">${completo?'Mostrar menos':'Ver todos os registros ('+historico.length+')'}</button>`);
    area.querySelector('#expandir-historico')?.addEventListener('click',()=>{completo=!completo;registros();});
    if(focoExpandir)area.querySelector('#expandir-historico')?.focus();
    area.querySelectorAll('[data-cancelar]').forEach(b=>b.onclick=async()=>{if(!confirm('Cancelar a execução? O registro permanecerá no histórico.'))return;b.disabled=true;const r=await cancelarExecucao(b.dataset.cancelar);if(!visita.isConnected)return;redesenhar();avisar(r.guardado?'Execução cancelada e preservada.':'Gravação indisponível. Baixe um backup.');});
  }
  listar();registros();
}
