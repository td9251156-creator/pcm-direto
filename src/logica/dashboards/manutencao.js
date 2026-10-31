// Dashboard de Manutenção e Programação. Funções puras: a mesma saída alimenta cartões,
// gráficos, tabela, frases, ações e a exportação HTML.
import { tagsPermitidas, filtroPorAtivo, noPeriodo, dia, mesesParciais } from './filtros.js';

const FONTE_OS = 'Modelo 004 · tb_pcm_os (cadastro por TAG em tb_pcm_ativos)';
const FIM = ['CONCLUIDA', 'CANCELADA'];

const dias = (de, ate) => Math.round((Date.parse(ate.slice(0, 10)) - Date.parse(de.slice(0, 10))) / 86400000);
const mes = (d) => d.slice(0, 7);
const arred = (n) => Math.round(n * 100) / 100;

export function periodoEfetivo(filtro, metadados) {
  return { ...filtro, inicio: filtro.inicio ?? metadados.periodo.inicio, fim: filtro.fim ?? metadados.referencia };
}

export function calcularManutencao(fonte, filtro) {
  const { bases, metadados } = fonte;
  const referencia = metadados.referencia;
  const periodo = periodoEfetivo(filtro, metadados);
  const permitidas = tagsPermitidas(bases, filtro);
  const porAtivo = filtroPorAtivo(filtro);
  // Com filtro de setor/família/TAG, OS sem TAG cadastrada fica fora e é contada.
  const semAtivo = porAtivo ? bases.ordens_servico.filter((o) => !o.tag || !permitidas.has(o.tag)).length : 0;
  const todas = bases.ordens_servico.filter((o) => !porAtivo || (o.tag && permitidas.has(o.tag)));
  const emitidas = todas.filter((o) => o.data_abertura && dia(o.data_abertura) <= referencia);
  const semAbertura = todas.filter((o) => !o.data_abertura).length;
  const encerrada = (o) => FIM.includes(o.status) || Boolean(o.data_conclusao);
  const canceladas = todas.filter((o) => o.status === 'CANCELADA');
  const abertas = emitidas.filter((o) => !encerrada(o));
  const comPrazo = abertas.filter((o) => o.data_prevista);
  const atrasadas = comPrazo.filter((o) => dia(o.data_prevista) < referencia)
    .map((o) => ({ ...o, diasAtraso: dias(o.data_prevista, referencia) }));
  const semProgramacao = abertas.length - comPrazo.length;
  const semHoras = abertas.filter((o) => o.horas_restantes === null).length;
  const backlogSemDados = abertas.length > 0 && semHoras === abertas.length;
  const backlogHoras = arred(abertas.reduce((s, o) => s + (o.horas_restantes ?? 0), 0));
  const inconsistentes = todas.filter((o) => o.status !== 'CONCLUIDA' && o.status !== 'CANCELADA' && o.data_conclusao).length;

  const concluidasPeriodo = todas.filter((o) => o.status === 'CONCLUIDA' && noPeriodo(o.data_conclusao, periodo));
  const avaliaveis = concluidasPeriodo.filter((o) => o.data_prevista);
  const noPrazo = avaliaveis.filter((o) => dia(o.data_conclusao) <= dia(o.data_prevista)).length;
  const abertasPeriodo = todas.filter((o) => o.status !== 'CANCELADA' && noPeriodo(o.data_abertura, periodo));

  const base = { data: `Posição em ${referencia}`, exclusoes: 'Canceladas não entram; OS com abertura após a referência não entram.' };
  const indicadores = {
    abertas: {
      id: 'abertas', titulo: 'OS abertas', valor: abertas.length, unidade: 'OS', estado: abertas.length ? 'ok' : 'zero',
      fonte: FONTE_OS, formula: 'OS sem conclusão e sem status Concluída/Cancelada, abertas até a referência.',
      populacao: `${emitidas.length} OS emitidas até a referência (${canceladas.length} canceladas fora).`, ...base,
      ausencias: semProgramacao ? `${semProgramacao} sem programação (sem data prevista).` : '',
    },
    atrasadas: {
      id: 'atrasadas', titulo: 'OS atrasadas', valor: atrasadas.length, unidade: 'OS', estado: !abertas.length ? 'zero' : comPrazo.length ? (atrasadas.length ? 'ok' : 'zero') : 'indefinido',
      fonte: FONTE_OS, formula: 'OS abertas com data prevista anterior à referência.',
      populacao: `${comPrazo.length} OS abertas com data prevista.`, ...base,
      ausencias: semProgramacao ? `${semProgramacao} OS sem programação, não classificadas como atrasadas.` : '',
    },
    backlog: {
      id: 'backlog', titulo: 'Backlog', valor: backlogSemDados ? null : backlogHoras, unidade: 'h', estado: backlogSemDados ? 'indefinido' : semHoras ? 'parcial' : (abertas.length ? 'ok' : 'zero'),
      fonte: FONTE_OS, formula: 'Soma das horas restantes das OS abertas.',
      populacao: `${abertas.length} OS abertas.`, ...base,
      ausencias: semHoras ? `Backlog incompleto: ${semHoras} OS abertas sem horas restantes.` : '',
    },
    cumprimento: {
      id: 'cumprimento', titulo: 'Cumprimento do prazo', valor: avaliaveis.length ? arred((noPrazo / avaliaveis.length) * 100) : null, unidade: '%',
      estado: avaliaveis.length ? 'ok' : 'indefinido',
      fonte: FONTE_OS, formula: 'OS concluídas no período e dentro da data prevista ÷ OS concluídas no período com data prevista.',
      data: `Conclusão entre ${periodo.inicio} e ${periodo.fim}`, populacao: `${avaliaveis.length} OS concluídas no período com data prevista.`,
      exclusoes: 'Canceladas e concluídas sem data prevista não entram. A data prevista é a registrada hoje, não o prazo original.',
      ausencias: avaliaveis.length ? '' : 'Sem OS concluídas com prazo no período.',
    },
  };

  const meses = {};
  for (const o of abertasPeriodo) (meses[mes(o.data_abertura)] ??= { abertas: 0, concluidas: 0 }).abertas++;
  for (const o of concluidasPeriodo) (meses[mes(o.data_conclusao)] ??= { abertas: 0, concluidas: 0 }).concluidas++;
  const parciais = mesesParciais(periodo);
  const movimento = Object.keys(meses).sort().map((m) => ({ mes: m, ...meses[m], parcial: parciais.has(m) }));

  const faixas = [['No prazo', 0], ['1 a 7 dias', 0], ['8 a 30 dias', 0], ['Mais de 30 dias', 0], ['Sem programação', 0]];
  for (const o of abertas) {
    if (!o.data_prevista) faixas[4][1]++;
    else {
      const a = dia(o.data_prevista) < referencia ? dias(o.data_prevista, referencia) : 0;
      faixas[a === 0 ? 0 : a <= 7 ? 1 : a <= 30 ? 2 : 3][1]++;
    }
  }
  const idade = faixas.map(([rotulo, valor]) => ({ rotulo, valor }));

  const pendencias = [...atrasadas].sort((a, b) => b.diasAtraso - a.diasAtraso || a.numero_os.localeCompare(b.numero_os))
    .slice(0, 8).map((o) => ({
      numero_os: o.numero_os, tag: o.tag, atividade: o.atividade, prioridade: o.prioridade, status: o.status,
      data_prevista: o.data_prevista, diasAtraso: o.diasAtraso, horas_restantes: o.horas_restantes,
    }));

  const porTag = {};
  for (const o of atrasadas) porTag[o.tag ?? '(sem TAG)'] = (porTag[o.tag ?? '(sem TAG)'] ?? 0) + 1;
  const ranking = Object.entries(porTag).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const altas = atrasadas.filter((o) => o.prioridade === 'ALTA').length;

  const frases = {
    movimento: movimento.length
      ? `No período, ${abertasPeriodo.length} OS foram abertas e ${concluidasPeriodo.length} concluídas${movimento.some((m) => m.parcial) ? '; o último mês está parcial' : ''}.`
      : 'Sem OS abertas ou concluídas no período filtrado.',
    idade: abertas.length
      ? `${atrasadas.length} das ${abertas.length} OS abertas passaram da data prevista; ${idade[3].valor} há mais de 30 dias.`
      : 'Nenhuma OS aberta na posição de referência.',
  };

  const acoes = [];
  if (atrasadas.length) acoes.push({ texto: `Tratar as ${atrasadas.length} OS atrasadas, começando pela mais antiga (${pendencias[0].numero_os}, ${pendencias[0].diasAtraso} dias).`, evidencia: `${atrasadas.length} OS com data prevista anterior a ${referencia}.` });
  if (ranking.length && ranking[0][1] > 1) acoes.push({ texto: `Conferir ${ranking[0][0]}: concentra ${ranking[0][1]} OS atrasadas.`, evidencia: `${ranking[0][1]} de ${atrasadas.length} atrasadas.` });
  if (altas) acoes.push({ texto: `Priorizar ${altas} OS atrasadas de prioridade alta.`, evidencia: `Prioridade registrada na OS.` });
  if (semProgramacao) acoes.push({ texto: `Programar ${semProgramacao} OS abertas sem data prevista.`, evidencia: 'Campo data prevista vazio.' });
  if (semHoras) acoes.push({ texto: `Informar horas restantes de ${semHoras} OS para completar o backlog.`, evidencia: 'Campo horas restantes vazio.' });

  const avisos = [...fonte.avisos];
  if (semAtivo) avisos.push(`${semAtivo} OS fora do cadastro de ativos ficaram de fora dos filtros de setor/família/TAG.`);
  if (semAbertura) avisos.push(`${semAbertura} OS sem data de abertura ficaram fora das contagens.`);
  if (inconsistentes) avisos.push(`${inconsistentes} OS têm data de conclusão com status em aberto; foram tratadas como encerradas.`);

  return {
    referencia, periodo, indicadores, graficos: { movimento, idade }, pendencias, frases,
    acoes: acoes.slice(0, 3), totalPendencias: atrasadas.length, canceladas: canceladas.length, avisos,
    limitacoes: [
      'Mostra a situação atual das OS; não reconstrói backlog nem prazo original de datas passadas.',
      'Não há registro de início da execução: tempo de execução não é calculado.',
      'O planner 003 é uma grade e não entra nos cálculos.',
    ],
  };
}
