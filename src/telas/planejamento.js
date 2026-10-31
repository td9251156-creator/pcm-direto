import { estado, dadosAtuais } from '../estado.js';
import { ocorrenciasPlanejadas, resumoMensal } from '../logica/gestao.js';
import { resumoMensalRevisoes } from '../logica/programacao.js';
import { chaveAjuste } from '../logica/plano.js';
import { textoData } from '../logica/cronograma.js';
import { esc, num } from '../ui.js';
import { copiaGestao, guardar, pessoasOpcoes, tabela } from './gestao-ui.js';
import { dataExibida } from '../logica/consulta-execucao.js';
import { indicadoresMensais, ativosDosIndicadores, mesFechado } from '../logica/indicadores-mensais.js';
import { avisar } from '../ui.js';

export function telaPlano(main) {
  const dados = dadosAtuais(); const hoje = textoData(new Date());
  const previstas = ocorrenciasPlanejadas(dados);
  const concluidas = new Set(estado.gestao.historico.filter(h => !h.cancelada && h.dataPrevista).map(h => `${h.equipamentoId}|${h.tarefaId}|${h.dataPrevista}`));
  main.innerHTML = `<section class="cartao"><h2>Plano Mestre</h2><p>Uma linha por tarefa ativa, derivada da biblioteca e dos ajustes já revisados. A próxima data abaixo é uma ocorrência planejada, não uma nova regra de vencimento.</p><p><a href="#revisao">Editar frequências e capacidade na Revisão</a> · <a href="#mensal">Ver planejamento mensal</a> · <a href="#execucao">Registrar execução</a></p><label for="busca-plano">Buscar TAG, atividade ou especialidade</label><input id="busca-plano" type="search" placeholder="Ex.: UTL ou lubrificação"></section><section class="cartao"><div id="lista-plano"></div></section>`;
  const lista = main.querySelector('#lista-plano');
  function mostrar() {
    const busca = main.querySelector('#busca-plano').value.toLocaleLowerCase('pt-BR');
    lista.innerHTML = tabela(['Ativo / atividade', 'Frequência / horas', 'Especialidade', 'Responsável', 'Próxima ocorrência'], dados.plano.filter(l => l.ativa && `${l.tag} ${l.descricao} ${l.especialidade}`.toLocaleLowerCase('pt-BR').includes(busca)).map(l => {
      const chave = chaveAjuste(l.equipamentoId, l.tarefaId);
      const proxima = previstas.find(o => o.equipamentoId === l.equipamentoId && o.tarefaId === l.tarefaId && o.dataPrevista >= hoje && !concluidas.has(o.chave));
      return `<tr><td><strong>${esc(l.tag)}</strong> · ${esc(l.tarefaId)}<br>${esc(l.descricao)}${l.seguranca ? ' <span class="selo-seguranca">SEGURANÇA</span>' : ''}<div class="origem">${esc(l.origem)} · versão ${esc(l.versao)}</div></td><td>${esc(l.periodicidade)}<br>${num(l.duracaoHoras, 2)} h por execução</td><td>${esc(l.especialidade)}</td><td><label class="oculto" for="resp-${l.equipamentoId}-${l.tarefaId}">Responsável por ${esc(l.tag)} ${esc(l.tarefaId)}</label><select id="resp-${l.equipamentoId}-${l.tarefaId}" data-chave="${esc(chave)}">${pessoasOpcoes(estado.gestao.responsaveis[chave])}</select></td><td>${proxima ? dataExibida(proxima.dataPrevista) : 'Sem ocorrência futura neste ciclo'}</td></tr>`;
    }), 'Nenhuma tarefa ativa com esses filtros.');
  }
  mostrar();
  main.querySelector('#busca-plano').addEventListener('input', mostrar);
  lista.addEventListener('change', async e => {
    if (!e.target.dataset.chave) return;
    const nova = copiaGestao(); nova.responsaveis[e.target.dataset.chave] = e.target.value;
    const foco = e.target.id; (await guardar(nova, mostrar, foco));
  });
}

export function telaMensal(main) {
  const dados = dadosAtuais();
  main.innerHTML = `<section class="cartao"><h2>Planejamento mensal</h2><p>Janeiro a dezembro, somando as ocorrências do cronograma semanal atual. Não existe um segundo balanceamento mensal.</p><label for="ano-mensal">Ano de consulta</label><input id="ano-mensal" required type="number" min="1900" max="9999" step="1" value="${dados.inicio.getFullYear()}"><p><a href="#revisao">Revisar plano e capacidade</a> · <a href="#execucao">Vincular execuções a ocorrências previstas</a></p></section><section class="cartao" id="resumo-mensal"></section>`;
  const campoAno = main.querySelector('#ano-mensal');
  function mostrar() {
    if (!campoAno.reportValidity() || !Number.isInteger(Number(campoAno.value))) return;
    const r = resumoMensal(dados, estado.gestao, Number(campoAno.value));
    if (estado.programacao.revisoes.length) r.meses = resumoMensalRevisoes(estado.programacao, estado.gestao.historico, Number(campoAno.value));
    main.querySelector('#resumo-mensal').innerHTML = tabela(['Mês', 'Ocorrências previstas', 'Horas previstas', 'Realizadas com vínculo', '% realizado'], r.meses.map(m => `<tr><th scope="row">${new Date(Number(campoAno.value), m.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}</th><td>${m.previstas}</td><td>${num(m.horas, 2)} h</td><td>${m.realizadas}</td><td>${m.percentual === null ? '—' : num(m.percentual) + '%'}</td></tr>`)) + `<p><strong>Fora do ano selecionado:</strong> ${r.foraDoAno.previstas} ocorrências · ${num(r.foraDoAno.horas, 2)} h do mesmo ciclo de 52 semanas.</p><p><strong>Execuções sem vínculo no ano:</strong> ${r.semVinculo}. Esses registros permanecem no histórico e não entram automaticamente no percentual.</p><p class="origem">Realizado = ocorrências com pelo menos uma execução válida e vinculada ÷ ocorrências previstas no mês. Uma ocorrência conta no máximo uma vez; cancelamentos não contam. Registros sem vínculo não provam a conclusão do previsto.</p>`;
  }
  mostrar(); campoAno.addEventListener('change', mostrar);
  montarIndicadores(main);
}

function montarIndicadores(main) {
  const hoje = textoData(new Date());
  const anterior = new Date(); anterior.setDate(1); anterior.setMonth(anterior.getMonth() - 1);
  const ativos = ativosDosIndicadores(dadosAtuais().equipamentos, estado.gestao);
  const secao = document.createElement('section'); secao.className = 'cartao';
  secao.innerHTML = `<h3>Indicadores por ativo e mês fechado</h3><p>Informe totais conferidos do mês. As horas planejadas já devem excluir paradas programadas. Na parada total, conte sobreposições uma vez e somente a parte dentro deste mês. As durações individuais das falhas não são somadas aqui.</p><form id="form-indicadores"><div class="grade duas"><div><label for="indicador-ativo">Ativo dos indicadores</label><select id="indicador-ativo" required><option value="">Escolha o ativo</option>${ativos.map(a => `<option value="${esc(a.id)}">${esc(a.tag)}${a.removido ? ' (fora da lista atual)' : ''}</option>`).join('')}</select></div><div><label for="indicador-mes">Mês fechado</label><input id="indicador-mes" type="month" min="1900-01" max="${textoData(anterior).slice(0,7)}" value="${textoData(anterior).slice(0,7)}" required></div><div><label for="indicador-planejadas">Horas planejadas sem paradas programadas</label><input id="indicador-planejadas" type="number" min="0" step="any" aria-describedby="indicador-ausentes"></div><div><label for="indicador-parada">Parada total conferida no mês (h)</label><input id="indicador-parada" type="number" min="0" step="any" aria-describedby="indicador-ausentes"></div></div><p id="indicador-ausentes">Deixe em branco o que não foi apurado. Zero significa apurado sem horas; vazio não é zero.</p><button id="salvar-indicadores">Guardar totais mensais</button></form><div id="resultado-indicadores" aria-live="polite"></div><p class="origem">Falhas: um registro por ocorrência no mês, inclusive com zero horas de parada. Corrigir o mesmo registro não aumenta a contagem. MTBF = horas operadas ÷ falhas. MTTR = tempo total dos reparos concluídos no mês ÷ reparos concluídos, mesmo se começaram antes. Disponibilidade = horas operadas ÷ horas planejadas × 100. Horas operadas = planejadas − parada total.</p><p><a href="#falhas">Informar conclusão e duração dos reparos em Falhas</a></p>`;
  main.append(secao);
  const ativo = secao.querySelector('#indicador-ativo'); const mes = secao.querySelector('#indicador-mes');
  const planejadas = secao.querySelector('#indicador-planejadas'); const parada = secao.querySelector('#indicador-parada');
  const resultado = secao.querySelector('#resultado-indicadores');
  function mostrar(carregar = true) {
    const r = indicadoresMensais(estado.gestao, ativo.value, mes.value, hoje);
    if (carregar) { planejadas.value = r.total?.horasPlanejadas ?? ''; parada.value = r.total?.horasParada ?? ''; }
    const metrica = (n, unidade) => n === null ? 'Não calculado' : `${num(n, 2)}${unidade}`;
    resultado.innerHTML = !ativo.value ? '<p>Escolha um ativo para consultar os indicadores.</p>' : !r.fechado ? '<p>Escolha um mês já encerrado.</p>' : `<dl><dt>Horas operadas</dt><dd>${metrica(r.horasOperadas, ' h')}</dd><dt>Falhas no mês da ocorrência</dt><dd>${r.falhas}</dd><dt>MTBF</dt><dd>${metrica(r.mtbf, ' h')}</dd><dt>Reparos com conclusão no mês</dt><dd>${r.reparosConcluidos}</dd><dt>MTTR</dt><dd>${metrica(r.mttr, ' h')}</dd><dt>Disponibilidade</dt><dd>${metrica(r.disponibilidade, '%')}</dd></dl><p>${r.horasOperadas === null ? 'Faltam totais mensais válidos para calcular operação, MTBF e disponibilidade. ' : ''}${!r.falhas ? 'Sem falhas no mês: MTBF não calculado. ' : ''}${!r.reparosConcluidos ? 'Sem reparos com conclusão informada no mês: MTTR não calculado. ' : ''}${r.semDuracao ? `${r.semDuracao} reparo(s) concluído(s) sem duração: MTTR não calculado. ` : ''}${r.semConclusao} registro(s) até este mês sem conclusão informada; não são presumidos concluídos.</p>`;
  }
  ativo.addEventListener('change', () => mostrar()); mes.addEventListener('change', () => mostrar()); mostrar();
  secao.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!mesFechado(mes.value, textoData(new Date()))) { avisar('Escolha um mês já encerrado.'); return; }
    const a = ativos.find(x => x.id === ativo.value); if (!a) return;
    const valor = c => c.value === '' ? null : Number(c.value);
    const hp = valor(planejadas); const pp = valor(parada);
    if ((hp !== null && (!Number.isFinite(hp) || hp < 0)) || (pp !== null && (!Number.isFinite(pp) || pp < 0)) || (hp !== null && pp !== null && pp > hp)) { avisar('Informe horas válidas; a parada não pode superar as horas planejadas.'); return; }
    const nova = copiaGestao(); nova.versao = 2;
    const registro = { equipamentoId: a.id, tag: a.tag, mes: mes.value, horasPlanejadas: hp, horasParada: pp };
    nova.indicadoresMensais = [...(nova.indicadoresMensais ?? []).filter(r => r.equipamentoId !== a.id || r.mes !== mes.value), registro];
    const campos = [...secao.querySelectorAll('input, select, button')]; campos.forEach(c => { c.disabled = true; });
    try { await guardar(nova, () => mostrar(false)); } finally { campos.forEach(c => { c.disabled = false; }); }
  });
}
