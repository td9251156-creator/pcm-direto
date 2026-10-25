import { estado,dadosAtuais,ativarRevisao,referenciaRevisao } from '../estado.js';
import { prepararRevisao } from '../logica/programacao.js';
import { compararTarefas,cargaAfetada } from '../logica/comparar-revisao.js';
import { textoData } from '../logica/cronograma.js';
import { dataExibida } from '../logica/consulta-execucao.js';
import { novoId } from '../logica/entrada.js';
import { esc,num,avisar } from '../ui.js';
import { pessoaNome } from './gestao-ui.js';

const atalhos=`<div class="acoes"><a href="#equipamentos">Equipamentos</a><a href="#criticidade">Criticidade</a><a href="#plano">Responsáveis</a><a href="#revisao">Tarefas e capacidade</a><a href="#mensal">Mensal</a></div>`;
const resumoTarefa=(t,responsavel)=>t?`${t.periodicidade} · ${num(t.duracaoHoras,3)} h/execução · ${t.especialidade} · ${pessoaNome(responsavel)} · segurança: ${t.seguranca?'sim':'não'}`:'Fora do plano';
const detalhesAlterados=m=>m.antes&&m.depois?[['tag','TAG'],['descricao','Descrição'],['observacao','Observação'],['origem','Origem'],['versao','Versão']].filter(([c])=>m.antes[c]!==m.depois[c]).map(([c,n])=>`<p>${n}: ${esc(m.antes[c]||'não informado')} → ${esc(m.depois[c]||'não informado')}</p>`).join(''):'';

export function telaPlanejar(main,ir){
  const dados=dadosAtuais();const hoje=textoData(new Date());const rota=location.hash;
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Planejar</p><h2>Rascunho e revisões do plano</h2><p class="origem">Ajustes de tarefas e capacidade permanecem no rascunho até a ativação de uma revisão.</p></header>
  <section class="cartao">${atalhos}<p><strong>${dados.equipamentos.length}</strong> ativos válidos · <strong>${dados.resumo.tarefas}</strong> tarefas ativas · ${num(dados.resumo.horasAno)} h estimadas no ciclo do rascunho.</p><p>${estado.programacao.revisoes.length?`${estado.programacao.revisoes.length} revisão(ões) preservada(s).`:'Nenhuma revisão ativada ainda.'}</p></section>
  <section class="cartao"><h3>Ativar uma revisão</h3><form id="form-revisao"><div class="grade duas"><div><label for="rev-vigencia">Vigência</label><input id="rev-vigencia" name="vigencia" type="date" min="${hoje}" value="${hoje}" required></div><div><label for="rev-elaborador">Elaborado por</label><input id="rev-elaborador" name="elaborador" maxlength="120" value="${esc(estado.gestao.organizacao.elaborador)}" required></div></div><label for="rev-resumo">Resumo das alterações</label><input id="rev-resumo" name="resumo" maxlength="2000" required placeholder="Ex.: Plano preventivo inicial"><button type="submit">Conferir impacto da revisão</button></form><div id="aviso-previa" role="status"></div><div id="impacto-revisao"></div></section>
  <section class="cartao"><h3>Revisões preservadas</h3>${estado.programacao.revisoes.slice().reverse().map(r=>`<details><summary>Revisão ${r.numero} · vigência ${dataExibida(r.vigencia)}</summary><p>${esc(r.resumo)} · ${esc(r.elaborador)}</p><p>${r.plano.filter(t=>t.ativa).length} tarefas ativas no retrato desta revisão.</p></details>`).join('')||'<p class="origem">Ative a primeira revisão após conferir tarefas e capacidade.</p>'}</section>`;
  const form=main.querySelector('#form-revisao');const impacto=main.querySelector('#impacto-revisao');const aviso=main.querySelector('#aviso-previa');
  const visita=main.querySelector('.cabecalho-tela');const ativa=()=>visita.isConnected&&location.hash===rota;
  let previa=null;let gravando=false;
  const metadados=()=>Object.fromEntries(new FormData(form));
  function invalidar(texto){previa=null;impacto.replaceChildren();aviso.textContent=texto;}
  form.addEventListener('input',()=>{if(previa)invalidar('Os campos mudaram. Confira o impacto novamente antes de ativar.');});
  form.addEventListener('change',()=>{if(previa)invalidar('Os campos mudaram. Confira o impacto novamente antes de ativar.');});
  form.onsubmit=e=>{
    e.preventDefault();if(gravando)return;
    invalidar('');const valores=metadados();const meta={...valores,id:novoId(),capacidade:structuredClone(estado.capacidade)};
    const referencia=referenciaRevisao();const r=prepararRevisao(estado.programacao,dadosAtuais(),estado.gestao,meta);
    if(!r.ok){aviso.textContent=r.motivo;return;}
    const anterior=estado.programacao.revisoes.at(-1);
    const mudancas=compararTarefas(anterior?.plano||[],r.programacao.revisoes.at(-1).plano,anterior?.responsaveis,estado.gestao.responsaveis);
    const antes=estado.programacao.ocorrencias.filter(o=>o.situacao==='prevista');
    const situacoes=new Map(r.programacao.ocorrencias.map(o=>[o.id,o.situacao]));
    const substituidas=antes.filter(o=>situacoes.get(o.id)==='substituida');
    const adicionadas=r.programacao.ocorrencias.filter(o=>o.revisaoId===meta.id);
    previa={meta,referencia,valores:JSON.stringify(valores)};
    impacto.innerHTML=`<h4 tabindex="-1" id="titulo-impacto">Confira a revisão ${estado.programacao.revisoes.length+1}</h4><p>Vigência: <strong>${dataExibida(meta.vigencia)}</strong> · ${esc(meta.elaborador)}</p><p>${esc(meta.resumo)}</p>
    <ul><li>${r.impacto.adicionadas} novas ocorrências.</li><li>${r.impacto.substituidas} previsões futuras substituídas.</li><li>${r.impacto.preservadasConcluidas} ocorrências já concluídas preservadas.</li></ul><p>Previsões anteriores à vigência e registros de execução permanecem preservados.</p>${!adicionadas.length?'<p class="pendencia">Nenhuma nova ocorrência neste período. Confira o início do ciclo em Tarefas e capacidade antes de ativar.</p>':''}
    <h4>Carga afetada a partir da vigência</h4><p>${num(r.impacto.horasAnteriores,3)} h substituídas → ${num(r.impacto.horasNovas,3)} h novas. Estes valores são do período afetado, não horas por semana.</p>
    <div class="tabela-rolagem"><table><thead><tr><th>Especialidade</th><th>Horas substituídas</th><th>Horas novas</th><th>Diferença</th></tr></thead><tbody>${cargaAfetada(substituidas,adicionadas).map(c=>`<tr><td>${esc(c.especialidade)}</td><td>${num(c.antes,3)} h</td><td>${num(c.depois,3)} h</td><td>${num(c.depois-c.antes,3)} h</td></tr>`).join('')}</tbody></table></div>
    <h4>Capacidade por semana</h4>${[...new Set([...Object.keys(anterior?.capacidade||{}),...Object.keys(meta.capacidade)])].map(esp=>`<p>${esc(esp)}: ${anterior?.capacidade[esp]?num(anterior.capacidade[esp])+' h':'não informada'} → ${meta.capacidade[esp]?num(meta.capacidade[esp])+' h':'não informada'} por semana.</p>`).join('')||'<p>Capacidade não informada. Confira os recursos em Tarefas e capacidade.</p>'}
    <details><summary>Tarefas diferentes da última revisão (${mudancas.length})</summary><p class="origem">Comparação com o último retrato ativado, inclusive se sua vigência ainda for futura. IDs mantêm o vínculo quando a TAG muda.</p><div id="mudancas-tarefas"></div></details>
    <details><summary>Previsões futuras que serão substituídas (${substituidas.length})</summary><div id="substituidas-previa"></div></details><div class="acoes"><button id="confirmar-revisao">Ativar revisão ${estado.programacao.revisoes.length+1}</button><button class="secundario" id="voltar-rascunho">Voltar ao rascunho</button></div>`;
    function listar(id,lista,render,limite=20){
      const area=impacto.querySelector('#'+id);
      area.innerHTML=lista.slice(0,limite).map(render).join('')||'<p>Nenhum item neste grupo.</p>';
      if(lista.length>limite){area.insertAdjacentHTML('beforeend','<button type="button" class="secundario">Mostrar mais 20</button>');area.querySelector('button').onclick=()=>{listar(id,lista,render,limite+20);const alvo=area.querySelector('button');if(alvo)alvo.focus();else{area.tabIndex=-1;area.focus();}};}
    }
    listar('mudancas-tarefas',mudancas,m=>`<article class="item-previa"><strong>${esc((m.depois||m.antes).tag)} · ${esc((m.depois||m.antes).tarefaId)} · ${m.situacao}</strong><p>${esc((m.depois||m.antes).descricao)}</p><p>Antes: ${esc(resumoTarefa(m.antes,m.responsavelAntes))}</p><p>Depois: ${esc(resumoTarefa(m.depois,m.responsavelDepois))}</p>${detalhesAlterados(m)}</article>`);
    listar('substituidas-previa',substituidas,o=>`<article class="item-previa"><strong>${esc(o.tag)}</strong> · ${dataExibida(o.dataPrevista)}<p>${esc(o.descricao)} · ${esc(o.especialidade)} · ${num(o.horas,3)} h</p></article>`);
    impacto.querySelector('#voltar-rascunho').onclick=()=>{invalidar('Prévia fechada. O rascunho foi mantido.');form.querySelector('button').focus();};
    impacto.querySelector('#confirmar-revisao').onclick=async()=>{
      if(gravando||!previa)return;
      if(previa.valores!==JSON.stringify(metadados())){invalidar('Os campos mudaram. Confira o impacto novamente.');form.querySelector('button').focus();return;}
      const conferida=previa;gravando=true;for(const b of main.querySelectorAll('button,input'))b.disabled=true;
      aviso.textContent='Guardando revisão neste aparelho…';
      try{
        const resultado=await ativarRevisao(conferida.meta,conferida.referencia);if(!ativa())return;
        if(!resultado.ok){invalidar(resultado.motivo);avisar(resultado.motivo);return;}
        ir('semana');avisar('Revisão ativada e histórico preservado.');
      }catch{if(ativa())invalidar('Não foi possível concluir. Confira as revisões preservadas antes de tentar novamente.');}
      finally{gravando=false;if(ativa()){for(const b of main.querySelectorAll('button,input'))b.disabled=false;form.querySelector('button').focus();}}
    };
    impacto.querySelector('#titulo-impacto').focus();
  };
}
