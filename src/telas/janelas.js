import { estado } from '../estado.js';
import { novoId } from '../logica/entrada.js';
import { textoData } from '../logica/cronograma.js';
import { dataExibida } from '../logica/consulta-execucao.js';
import { ocorrenciasVigentes, idsConcluidos } from '../logica/programacao.js';
import { DIAS_POR_PERIODICIDADE } from '../logica/biblioteca-v2-dados.js';
import { sugerirJanela, TOLERANCIA_DIAS } from '../logica/janelas.js';
import { esc, num, avisar } from '../ui.js';
import { campo, copiaGestao, guardar, tabela } from './gestao-ui.js';

const ajuste = (d) => (d === 0 ? 'No prazo' : d > 0 ? `Adiada ${d} dia(s)` : `Antecipada ${-d} dia(s)`);

/** Ocorrências previstas ainda não executadas, com o intervalo da tarefa (para a regra da segurança antecipada). */
function pendentes() {
  const p = estado.programacao; const feitas = idsConcluidos(p, estado.gestao.historico);
  const periodicidade = new Map(p.revisoes.flatMap((r) => r.plano.map((t) => [`${r.id}|${t.equipamentoId}|${t.tarefaId}`, t.periodicidade])));
  return ocorrenciasVigentes(p).filter((o) => !feitas.has(o.id)).map((o) => ({ ...o,
    intervaloDias: DIAS_POR_PERIODICIDADE[periodicidade.get(`${o.revisaoId}|${o.equipamentoId}|${o.tarefaId}`)] ?? null }));
}

export function telaJanelas(main) {
  const hoje = textoData(new Date());
  const janelas = (estado.gestao.janelasParada ?? []).slice().sort((a, b) => a.data.localeCompare(b.data));
  const revisao = estado.programacao.revisoes.at(-1);
  // Janelas em ordem de data: o que entra numa janela não é sugerido de novo na seguinte.
  let restantes = revisao ? pendentes() : [];
  const sugestoes = janelas.map((j) => {
    const r = sugerirJanela(j, restantes);
    const usadas = new Set(r.incluidas.map((x) => x.id)); restantes = restantes.filter((o) => !usadas.has(o.id));
    return [j, r];
  });
  main.innerHTML = `<section class="cartao"><h2>Janelas de parada</h2>
    <p>Informe as paradas da produção e as horas disponíveis para a manutenção. O app sugere as tarefas previstas que cabem em cada janela, sem mudar o plano.</p>
    <p class="origem">Regra aprovada (D4): tarefas comuns podem ser antecipadas ou adiadas em até ${TOLERANCIA_DIAS} dias. Tarefa de segurança nunca é adiada; pode ser antecipada, e então a próxima deve ocorrer até a data da janela mais o intervalo dela. Entram primeiro as de segurança, depois as de vencimento mais próximo, até completar as horas.</p>
    ${revisao ? '' : '<p class="pendencia"><a href="#planejar">Ative uma revisão do plano</a> para ver as sugestões.</p>'}
    <form id="form-janela"><div class="grade tres">${campo('janela-data', 'Data da parada', '', 'date', `min="${hoje}" required`)}${campo('janela-horas', 'Horas disponíveis para manutenção', '', 'number', 'min="0.25" max="24" step="0.25" required')}${campo('janela-descricao', 'Descrição (opcional)', '', 'text', 'maxlength="120"')}</div>
    <button id="salvar-janela">Acrescentar janela</button></form></section>
    ${sugestoes.map(([j, r]) => `<section class="cartao janela" aria-labelledby="janela-${esc(j.id)}"><h3 id="janela-${esc(j.id)}">${dataExibida(j.data)}${j.descricao ? ` · ${esc(j.descricao)}` : ''}${j.data < hoje ? ' (passada)' : ''}</h3>
      <p>Ocupação sugerida: <strong>${num(r.ocupacao, 2)} de ${num(r.capacidade, 2)} h</strong>.</p>
      ${r.conflitos.map((c) => `<p class="pendencia">${esc(c)}</p>`).join('')}
      ${tabela(['TAG', 'Tarefa', 'Prevista', 'Ajuste', 'Horas'], r.incluidas.map((x) => `<tr><td>${esc(x.tag)}</td><td>${esc(x.descricao)}${x.seguranca ? ' <span class="selo-seguranca">SEGURANÇA</span>' : ''}${x.proximaAte ? `<br><span class="origem">Próxima até ${dataExibida(x.proximaAte)}</span>` : ''}</td><td>${dataExibida(x.dataPrevista)}</td><td>${ajuste(x.desloc)}</td><td>${num(x.horas, 2)}</td></tr>`), 'Nenhuma tarefa prevista dentro da tolerância desta janela.')}
      ${r.naoCouberam.length ? `<p class="origem">Dentro da tolerância, mas sem horas na janela: ${r.naoCouberam.map((x) => `${esc(x.tag)} · ${esc(x.descricao)} (${num(x.horas, 2)} h)`).join('; ')}.</p>` : ''}
      <button type="button" class="secundario" data-remover-janela="${esc(j.id)}">Remover esta janela</button></section>`).join('')}`;

  main.querySelector('#form-janela').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target.elements;
    const data = f['janela-data'].value; const horas = Number(f['janela-horas'].value);
    if (!data || !(horas > 0 && horas <= 24)) { avisar('Informe a data e as horas disponíveis (até 24 h).'); return; }
    const nova = copiaGestao(); nova.versao = Math.max(nova.versao, 2); // nunca rebaixa uma base com dados da operação
    nova.janelasParada = [...(nova.janelasParada ?? []), { id: novoId(), data, horas, descricao: f['janela-descricao'].value.trim() }];
    await guardar(nova, () => telaJanelas(main), 'salvar-janela');
  });
  main.querySelectorAll('[data-remover-janela]').forEach((b) => b.addEventListener('click', async () => {
    const nova = copiaGestao(); nova.janelasParada = (nova.janelasParada ?? []).filter((j) => j.id !== b.dataset.removerJanela);
    await guardar(nova, () => telaJanelas(main), 'salvar-janela');
  }));
}
