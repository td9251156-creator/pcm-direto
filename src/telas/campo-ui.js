import { estado, registrarOcorrencia, atualizarGestao } from '../estado.js';
import { TEXTO_CIENCIA, acrescentarCiencia } from '../logica/ciencia.js';
import { novoId } from '../logica/entrada.js';
import { ocorrenciasVigentes, conclusoesPorOcorrencia } from '../logica/programacao.js';
import { textoData } from '../logica/cronograma.js';
import { dataExibida } from '../logica/consulta-execucao.js';
import { esc, num, avisar } from '../ui.js';
import { pessoasOpcoes, copiaGestao } from './gestao-ui.js';

export function abrirExecucao(id, atualizar = () => {}) {
  const o = ocorrenciasVigentes(estado.programacao).find(o => o.id === id);
  if (!o) return;
  const tarefa = estado.programacao.revisoes.find(r=>r.id===o.revisaoId)?.plano.find(t=>t.equipamentoId===o.equipamentoId&&t.tarefaId===o.tarefaId);
  const rota = location.hash;
  const anterior = document.activeElement;
  const hoje = textoData(new Date());
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  const datas = [...new Set([hoje, textoData(ontem), o.dataPrevista].filter(d => d <= hoje))];
  const feita = conclusoesPorOcorrencia(estado.programacao, estado.gestao.historico).get(id);
  const dialogo = document.createElement('dialog');
  dialogo.className = 'painel-execucao';
  dialogo.setAttribute('aria-labelledby', 'titulo-execucao');
  dialogo.innerHTML = `<header><button type="button" class="secundario fechar-painel" aria-label="Fechar painel">×</button><p class="sobretitulo">Registrar execução</p><h2 id="titulo-execucao">${esc(o.tag)}</h2><p>Prevista ${dataExibida(o.dataPrevista)} ${o.seguranca?'<span class="selo-seguranca">SEGURANÇA</span>':''}</p></header><p><strong>${esc(o.descricao)}</strong></p><p class="origem">${esc(o.especialidade)} · ${num(o.horas,3)} h</p>${tarefa?.observacao?`<p class="aviso-tecnico">${esc(tarefa.observacao)}</p>`:''}${feita?`<p class="sucesso">Concluída em ${dataExibida(feita.data)}. Para reabrir, cancele o registro no histórico.</p>${blocoCiencia(feita)}`:`<form><label for="painel-data">Data realizada</label><input id="painel-data" type="date" name="data" max="${hoje}" value="${hoje}" required><div class="chips">${datas.map(d=>`<button type="button" class="secundario" data-data="${d}">${d===hoje?'Hoje':d===textoData(ontem)?'Ontem':'Data prevista'}</button>`).join('')}</div><label for="painel-observacao">Observação técnica</label><textarea id="painel-observacao" name="observacao" rows="3" maxlength="2000" placeholder="Sem dados pessoais"></textarea><label for="painel-responsavel">Responsável</label><select id="painel-responsavel" name="responsavelId">${pessoasOpcoes(o.responsavelId)}</select><p id="erro-painel" role="alert"></p><button class="registrar-painel">Registrar execução</button></form>`}<p class="origem">Marcar uma tarefa não altera a periodicidade nem as datas do plano. Confira o manual antes de executar.</p>`;
  document.body.append(dialogo);
  let gravando = false;
  dialogo.querySelector('.fechar-painel').onclick = () => { if (!gravando) dialogo.close(); };
  dialogo.addEventListener('cancel', e => { if (gravando) e.preventDefault(); });
  dialogo.addEventListener('click', e => { if (e.target === dialogo && !gravando) { const r=dialogo.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialogo.close(); } });
  dialogo.addEventListener('close', () => { dialogo.remove(); if(location.hash!==rota)return; if(anterior?.isConnected)anterior.focus();else if(!document.activeElement||document.activeElement===document.body||document.activeElement===dialogo)document.querySelector('#conteudo')?.focus(); }, {once:true});
  dialogo.querySelectorAll('[data-data]').forEach(b=>b.onclick=()=>{dialogo.querySelector('[name=data]').value=b.dataset.data;});
  const formCiencia = dialogo.querySelector('#form-ciencia');
  if (formCiencia) formCiencia.onsubmit = async e => {
    e.preventDefault(); if (gravando) return; gravando = true; const botao = formCiencia.querySelector('button'); botao.disabled = true;
    try {
      const nova = copiaGestao(); const i = nova.historico.findIndex(h => h.id === feita.id);
      const r = i < 0 ? { ok: false, motivo: 'Execução não encontrada.' } : acrescentarCiencia(nova.historico[i], formCiencia.elements.nome.value, novoId());
      if (!r.ok) { formCiencia.querySelector('#erro-ciencia').textContent = r.motivo; return; }
      nova.historico[i] = r.execucao; nova.versao = Math.max(nova.versao, 2); // nunca rebaixa uma base com dados da operação
      const s = await atualizarGestao(nova);
      if (!s.ok) { formCiencia.querySelector('#erro-ciencia').textContent = s.motivo; return; }
      gravando = false; dialogo.close(); abrirExecucao(id, atualizar); avisar(s.guardado ? 'Ciência registrada neste aparelho.' : 'Não foi possível guardar; baixe um backup antes de sair.');
    } finally { gravando = false; botao.disabled = false; }
  };
  const form = dialogo.querySelector('form:not(#form-ciencia)');
  if (form) form.onsubmit=async e=>{
    e.preventDefault(); if(gravando)return; gravando=true;
    const b=form.querySelector('[type=submit],.registrar-painel');b.disabled=true;
    try {
      const r=await registrarOcorrencia(id,Object.fromEntries(new FormData(form)));
      if(!dialogo.isConnected || location.hash !== rota)return;
      if(!r.ok){form.querySelector('#erro-painel').textContent=r.motivo;return;}
      dialogo.close();atualizar();avisar(r.guardado?'Execução registrada neste aparelho.':'Não foi possível guardar; baixe um backup antes de sair.');
    } catch { if(dialogo.isConnected)form.querySelector('#erro-painel').textContent='Não foi possível registrar. Confira o histórico antes de tentar novamente.'; } finally { gravando=false;b.disabled=false; }
  };
  dialogo.showModal();
}

/** Registro de ciência (D5): lista as ciências e o formulário com a declaração. Não é aprovação nem assinatura certificada. */
function blocoCiencia(execucao) {
  const lista = (execucao.ciencias ?? []).map(c => `<li><strong>${esc(c.nome)}</strong> · ${new Date(c.em).toLocaleString('pt-BR')}</li>`).join('');
  const nomes = estado.gestao.pessoas.filter(p => p.ativo).map(p => `<option value="${esc(p.nome)}"></option>`).join('');
  return `<section class="ciencia" aria-labelledby="titulo-ciencia"><h3 id="titulo-ciencia">Registro de ciência</h3>${lista ? `<ul>${lista}</ul>` : '<p class="origem">Nenhuma ciência registrada.</p>'}
    <form id="form-ciencia"><label for="ciencia-nome">Nome de quem toma ciência</label><input id="ciencia-nome" name="nome" maxlength="120" autocomplete="name" list="ciencia-pessoas" required><datalist id="ciencia-pessoas">${nomes}</datalist>
    <label class="caixa caixa-bloco"><input type="checkbox" name="declaro" required> ${esc(TEXTO_CIENCIA)}</label>
    <p id="erro-ciencia" role="alert"></p><button>Registrar ciência</button>
    <p class="origem">Fica guardado o nome, a data e a hora e o conteúdo desta execução. É um registro de ciência: não comprova identidade, não é aprovação técnica e não tem validade jurídica garantida.</p></form></section>`;
}
