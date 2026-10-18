// Tela 3: Revisão — tarefas por equipamento, ajustes de periodicidade e carga semanal.
import biblioteca from '../dados/biblioteca.json';
import { estado, salvar, dadosAtuais } from '../estado.js';
import { validarLista } from '../logica/validacao.js';
import { PERIODICIDADES, vezesPorAno, aplicarAjuste } from '../logica/plano.js';
import { esc, num, avisar } from '../ui.js';
import { dataDaSemana, diaMes } from '../logica/cronograma.js';

/** Barras da carga semanal (horas por semana). */
function htmlCarga(dados) {
  const r = dados.resumo;
  const pico = r.picoSemana || 1;
  const barras = dados.carga.map((h, i) =>
    `<div class="barra" style="height:${Math.max(2, (h / pico) * 100)}%" title="Semana ${i + 1} (${diaMes(dataDaSemana(dados.inicio, i + 1))}): ${num(h)} h"></div>`).join('');
  const especialidades = Object.entries(r.cargaPorEspecialidade).sort((a, b) => b[1].total - a[1].total).map(([esp, c]) =>
    `<tr><td>${esc(esp)}</td><td>${num(c.total)} h</td><td>${num(c.media)} h</td><td>S${c.semanaPico} (${diaMes(dataDaSemana(dados.inicio, c.semanaPico))}): ${num(c.pico)} h</td></tr>`).join('');
  return `
    <ul class="numeros">
      <li><strong>${r.tarefas}</strong> tarefas ativas</li>
      <li><strong>${r.tarefasSeguranca}</strong> de segurança</li>
      <li><strong>${num(r.horasAno)} h</strong> no ano</li>
      <li><strong>${num(r.mediaSemana)} h</strong> por semana em média</li>
      <li>Semana mais carregada: <strong>S${r.semanaPico}</strong> (a partir de ${diaMes(r.dataSemanaPico)}) com <strong>${num(r.picoSemana)} h</strong></li>
    </ul>
    <div class="grafico" role="img" aria-label="Horas previstas por semana, da semana 1 à 52. Média ${num(r.mediaSemana)} horas, pico ${num(r.picoSemana)} horas na semana ${r.semanaPico}.">${barras}</div>
    <p class="origem">Semanas 1 a 52, a partir de ${dados.inicio.toLocaleDateString('pt-BR')}. As execuções foram distribuídas para evitar picos de carga.</p>
    <h4>Por especialidade</h4>
    <div class="tabela-rolagem"><table>
      <thead><tr><th>Especialidade</th><th>Horas no ano</th><th>Média por semana</th><th>Semana mais carregada</th></tr></thead>
      <tbody>${especialidades}</tbody>
    </table></div>`;
}

function opcoesPeriodicidade(linha) {
  // Tarefa de segurança: só aparecem opções iguais ou mais frequentes que a original
  const minimo = linha.seguranca ? vezesPorAno(linha.periodicidadeOriginal) : 0;
  return PERIODICIDADES.filter((p) => p.vezes >= minimo).map((p) =>
    `<option ${p.nome === linha.periodicidade ? 'selected' : ''}>${p.nome}</option>`).join('');
}

function htmlLinha(l) {
  const id = `${l.equipamentoId}-${l.tarefaId}`;
  const alterada = l.periodicidade !== l.periodicidadeOriginal;
  return `
    <tr class="${l.ativa ? '' : 'retirada'}">
      <td>
        ${esc(l.descricao)} ${l.seguranca ? '<span class="selo-seguranca">SEGURANÇA</span>' : ''}
        <div class="origem">
          ${esc(l.tarefaId)} · Origem: ${esc(l.origem)} · versão ${esc(l.versao)}.
          Base genérica: confirmar com o manual do fabricante.${l.observacao ? ' ' + esc(l.observacao) : ''}
        </div>
      </td>
      <td>
        <label class="oculto" for="per-${id}">Periodicidade</label>
        <select id="per-${id}" data-eq="${l.equipamentoId}" data-tarefa="${l.tarefaId}" data-acao="periodicidade">${opcoesPeriodicidade(l)}</select>
        ${alterada ? `<div class="origem">Biblioteca: ${esc(l.periodicidadeOriginal)}</div>` : ''}
      </td>
      <td>${esc(l.especialidade)}</td>
      <td>${num(l.duracaoHoras, 2)}</td>
      <td>
        <input type="checkbox" id="ativa-${id}" data-eq="${l.equipamentoId}" data-tarefa="${l.tarefaId}" data-acao="ativa"
          ${l.ativa ? 'checked' : ''} ${l.seguranca ? 'disabled' : ''}>
        <label class="oculto" for="ativa-${id}">Manter no plano</label>
        ${l.seguranca ? '<div class="origem">Obrigatória</div>' : ''}
      </td>
    </tr>`;
}

export function telaRevisao(main, ir) {
  const problemas = validarLista(estado.equipamentos, biblioteca.tipos);
  const comErro = Object.keys(problemas).length;
  const dados = dadosAtuais();

  const blocos = estado.equipamentos
    .filter((e) => !problemas[e.id])
    .map((e) => {
      const linhas = dados.plano.filter((l) => l.equipamentoId === e.id);
      return `
        <details class="cartao">
          <summary><strong>${esc(e.tag)}</strong> — ${esc(e.descricao)} (${linhas.filter((l) => l.ativa).length} tarefas)</summary>
          <div class="tabela-rolagem">
            <table>
              <thead><tr><th>Tarefa</th><th>Periodicidade</th><th>Especialidade</th><th>Horas</th><th>No plano</th></tr></thead>
              <tbody>${linhas.map(htmlLinha).join('')}</tbody>
            </table>
          </div>
        </details>`;
    }).join('');

  main.innerHTML = `
    <section class="cartao">
      <h2>Revisão do plano</h2>
      ${comErro ? `<p class="erro"><strong>${comErro} equipamento(s) com pendência ficaram fora do plano.</strong>
        <a href="#equipamentos">Corrigir na tela Equipamentos</a>.</p>` : ''}
      <p>Confira as tarefas de cada equipamento. Você pode mudar a periodicidade e retirar tarefas que não se aplicam.
      <strong>Tarefas de segurança</strong> só aceitam periodicidade igual ou mais frequente e não podem ser retiradas.</p>
      <p class="origem">Biblioteca: ${esc(biblioteca.nome)}, versão ${esc(biblioteca.versao)} (${esc(biblioteca.data)}).
      Todas as tarefas são base genérica a validar com o manual do fabricante.</p>
    </section>

    <section class="cartao">
      <h3>Carga de trabalho no ano</h3>
      <div class="grade duas"><div>
        <label for="inicio">Início do plano (dia da semana 1)</label>
        <input type="date" id="inicio" value="${esc(estado.inicio)}" required>
      </div></div>
      <div id="carga">${htmlCarga(dados)}</div>
    </section>

    <div id="tarefas">${blocos || '<p>Nenhum equipamento sem pendência para revisar.</p>'}</div>

    <div class="acoes">
      <button type="button" class="secundario" id="desfazer">Desfazer meus ajustes</button>
      <button type="button" id="ir-entrega">Ir para a entrega</button>
    </div>
  `;

  main.querySelector('#tarefas').addEventListener('change', (e) => {
    const alvo = e.target;
    if (!alvo.dataset.acao) return;
    const tarefa = biblioteca.tipos.flatMap((t) => t.tarefas).find((t) => t.id === alvo.dataset.tarefa);
    const alteracao = alvo.dataset.acao === 'ativa' ? { ativa: alvo.checked } : { periodicidade: alvo.value };
    const r = aplicarAjuste(estado.ajustes, alvo.dataset.eq, tarefa, alteracao);
    if (!r.ok) {
      avisar(r.motivo);
      telaRevisao(main, ir); // volta o campo para o valor permitido
      return;
    }
    estado.ajustes = r.ajustes;
    salvar();
    alvo.closest('tr').classList.toggle('retirada', alvo.dataset.acao === 'ativa' && !alvo.checked);
    main.querySelector('#carga').innerHTML = htmlCarga(dadosAtuais());
    avisar('Ajuste salvo.');
  });

  main.querySelector('#inicio').addEventListener('change', (e) => {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(e.target.value)) { avisar('Informe uma data válida.'); return; }
    estado.inicio = e.target.value;
    salvar();
    main.querySelector('#carga').innerHTML = htmlCarga(dadosAtuais());
    avisar('Data de início salva.');
  });

  main.querySelector('#desfazer').addEventListener('click', () => {
    if (!confirm('Voltar todas as tarefas para o padrão da biblioteca?')) return;
    estado.ajustes = {};
    salvar();
    telaRevisao(main, ir);
    avisar('Ajustes desfeitos.');
  });
  main.querySelector('#ir-entrega').addEventListener('click', () => ir('entrega'));
}
