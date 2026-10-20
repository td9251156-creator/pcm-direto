// Checklist da última execução de cada tarefa, guardado somente neste aparelho.
import { estado, dadosAtuais, salvar } from '../estado.js';
import { chaveAjuste } from '../logica/plano.js';
import { marcarExecucao } from '../logica/execucao.js';
import { textoData } from '../logica/cronograma.js';
import { esc, avisar, baixar } from '../ui.js';

export function telaExecucao(main) {
  const dados = dadosAtuais();
  const hoje = textoData(new Date());
  const ativas = dados.plano.filter((l) => l.ativa);
  main.innerHTML = `
    <section class="cartao">
      <h2>Checklist de execução</h2>
      <p>Marque o que foi executado e registre a data e uma observação técnica, sem dados pessoais.
      Esta tela guarda apenas a última marcação de cada tarefa. Não é um histórico de todas as execuções.</p>
      <p>Marcar uma tarefa não altera a periodicidade nem as datas do plano. Confira o cronograma e o manual antes de executar.</p>
      <p><a href="#revisao">Voltar à revisão</a> · <a href="#entrega">Ir para a entrega</a></p>
      <button type="button" id="baixar-execucoes">Baixar marcações (.json)</button>
    </section>
    <div id="checklists">${dados.equipamentos.map((e) => `
      <details class="cartao">
        <summary><strong>${esc(e.tag)}</strong> — ${esc(e.descricao)}</summary>
        ${ativas.filter((l) => l.equipamentoId === e.id).map((l) => {
    const chave = chaveAjuste(l.equipamentoId, l.tarefaId);
    const r = estado.execucoes[chave];
    const id = `${l.equipamentoId}-${l.tarefaId}`;
    return `<form class="cartao" data-equipamento="${esc(l.equipamentoId)}" data-tarefa="${esc(l.tarefaId)}">
      <h3>${esc(l.tarefaId)} — ${esc(l.descricao)} ${l.seguranca ? '<span class="selo-seguranca">SEGURANÇA</span>' : ''}</h3>
      <p>${esc(l.periodicidade)} · ${esc(l.especialidade)}</p>
      <label class="caixa"><input type="checkbox" name="concluida" ${r ? 'checked' : ''}> Execução realizada</label>
      <div class="grade duas">
        <div><label for="data-${id}">Data da execução</label><input id="data-${id}" name="data" type="date" max="${hoje}" value="${esc(r?.data ?? hoje)}"></div>
        <div><label for="nota-${id}">Observação técnica (opcional, sem dados pessoais)</label><textarea id="nota-${id}" name="observacao" maxlength="2000">${esc(r?.observacao ?? '')}</textarea></div>
      </div>
      <div class="acoes"><button id="registrar-${id}" type="submit">Guardar marcação de ${esc(l.tarefaId)}</button></div>
    </form>`;
  }).join('') || '<p>Não há tarefas ativas para este equipamento.</p>'}
      </details>`).join('') || '<p>Nenhum equipamento válido para executar. <a href="#equipamentos">Conferir equipamentos</a>.</p>'}
    </div>`;

  main.querySelector('#checklists').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const linha = ativas.find((l) => l.equipamentoId === form.dataset.equipamento && l.tarefaId === form.dataset.tarefa);
    const concluida = form.elements.concluida.checked;
    const chave = chaveAjuste(linha.equipamentoId, linha.tarefaId);
    if (!concluida && estado.execucoes[chave] && !confirm('Apagar a última marcação desta tarefa? O plano não será alterado.')) return;
    const r = marcarExecucao(estado.execucoes, linha, { concluida, data: form.elements.data.value, observacao: form.elements.observacao.value });
    if (!r.ok) { avisar(r.motivo); return; }
    estado.execucoes = r.registros;
    const guardado = salvar();
    avisar(guardado ? 'Marcação guardada neste aparelho.' : 'Marcação aplicada nesta sessão. Baixe uma cópia antes de sair.');
  });
  main.querySelector('#baixar-execucoes').addEventListener('click', () => baixar(JSON.stringify(estado.execucoes, null, 2), 'pcm-direto-execucoes.json', 'application/json'));
}
