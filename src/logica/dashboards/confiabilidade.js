// Dashboard de Confiabilidade. MTBF, MTTR e disponibilidade seguem como "Definição pendente":
// dependem de operação por TAG e de definições aprovadas pelo mantenedor (F-005).
import { tagsPermitidas, filtroPorAtivo, noPeriodo, dia } from './filtros.js';
import { periodoEfetivo } from './manutencao.js';

const FONTE = 'Modelo 008 · tb_pcm_falhas (cadastro por TAG em tb_pcm_ativos)';
const HORA = 3600000;
// Horários locais sem fuso são comparados entre si como relógio de parede (sem horário de verão em vigor).
const ms = (v) => (v ? Date.parse(`${String(v).slice(0, 19)}Z`) : NaN);
const arred = (n) => Math.round(n * 100) / 100;

// União de intervalos [ini, fim): sobreposições da mesma TAG não contam duas vezes.
export function uniaoEmHoras(intervalos) {
  const ord = intervalos.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0, atual = null;
  for (const [a, b] of ord) {
    if (!atual || a > atual[1]) { if (atual) total += atual[1] - atual[0]; atual = [a, b]; } else atual[1] = Math.max(atual[1], b);
  }
  if (atual) total += atual[1] - atual[0];
  return total / HORA;
}

export function calcularConfiabilidade(fonte, filtro) {
  const { bases, metadados } = fonte;
  const periodo = periodoEfetivo(filtro, metadados);
  const ini = ms(`${periodo.inicio}T00:00:00`);
  const fim = ms(`${periodo.fim}T00:00:00`) + 24 * HORA;
  const permitidas = tagsPermitidas(bases, filtro);
  const porAtivo = filtroPorAtivo(filtro);
  const ativos = new Map(bases.ativos.map((a) => [a.tag, a]));
  const semAtivo = porAtivo ? bases.falhas.filter((f) => !f.tag || !permitidas.has(f.tag)).length : 0;
  const falhas = bases.falhas.filter((f) => (!porAtivo || (f.tag && permitidas.has(f.tag))) && noPeriodo(f.inicio_falha, periodo));

  const abertas = falhas.filter((f) => !f.fim_falha);
  const semInicio = bases.falhas.filter((f) => !f.inicio_falha).length;
  const invalidas = falhas.filter((f) => f.fim_falha && !(ms(f.fim_falha) >= ms(f.inicio_falha)));
  const reparoInvalido = falhas.filter((f) => f.inicio_reparo && f.fim_reparo && !(ms(f.fim_reparo) >= ms(f.inicio_reparo))).length;
  const semReparo = falhas.filter((f) => f.fim_falha && !(f.inicio_reparo && f.fim_reparo)).length;
  const corte = (a, b) => [Math.max(a, ini), Math.min(b, fim)];

  const porTag = new Map();
  for (const f of falhas) {
    const t = f.tag ?? '(sem TAG)';
    if (!porTag.has(t)) porTag.set(t, { tag: t, falhas: 0, abertas: 0, indisp: [], reparo: [] });
    const g = porTag.get(t);
    g.falhas++;
    if (!f.fim_falha) g.abertas++;
    else if (ms(f.fim_falha) >= ms(f.inicio_falha)) g.indisp.push(corte(ms(f.inicio_falha), ms(f.fim_falha)));
    if (f.inicio_reparo && f.fim_reparo && ms(f.fim_reparo) >= ms(f.inicio_reparo)) g.reparo.push(corte(ms(f.inicio_reparo), ms(f.fim_reparo)));
  }
  const ranking = [...porTag.values()].map((g) => ({
    tag: g.tag, equipamento: ativos.get(g.tag)?.descricao_ativo ?? '—', falhas: g.falhas, abertas: g.abertas,
    indisponibilidade: arred(uniaoEmHoras(g.indisp)), reparo: arred(uniaoEmHoras(g.reparo)),
  })).sort((a, b) => b.falhas - a.falhas || b.indisponibilidade - a.indisponibilidade || a.tag.localeCompare(b.tag));
  const horasIndisp = arred(ranking.reduce((s, g) => s + g.indisponibilidade, 0));
  const horasReparo = arred(ranking.reduce((s, g) => s + g.reparo, 0));

  const semHorasValidas = falhas.length > 0 && abertas.length + invalidas.length === falhas.length;
  const base = { fonte: FONTE, data: `Início da falha entre ${periodo.inicio} e ${periodo.fim}` };
  const indicadores = {
    falhas: {
      id: 'falhas', titulo: 'Falhas registradas', valor: falhas.length, unidade: 'falhas', estado: falhas.length ? 'ok' : 'zero',
      formula: 'Contagem de registros com início da falha no período.', populacao: `${ranking.length} ativos com ocorrência.`,
      exclusoes: 'Registros fora do período ou de ativos fora dos filtros.', ausencias: abertas.length ? `${abertas.length} falha(s) ainda aberta(s).` : '', ...base,
    },
    indisponibilidade: {
      id: 'indisponibilidade', titulo: 'Indisponibilidade registrada', valor: semHorasValidas ? null : horasIndisp, unidade: 'h',
      estado: semHorasValidas ? 'indefinido' : abertas.length || invalidas.length ? 'parcial' : (falhas.length ? 'ok' : 'zero'),
      formula: 'Soma, por TAG, do tempo entre início e fim da falha; sobreposições contadas uma vez e intervalos recortados ao período.',
      populacao: `${falhas.length - abertas.length - invalidas.length} falhas com início e fim válidos.`,
      exclusoes: 'Falhas abertas e intervalos com fim anterior ao início não entram nas horas.',
      ausencias: abertas.length ? `Incompleto: ${abertas.length} falha(s) aberta(s) sem fim registrado.` : '', ...base,
    },
    reparo: {
      id: 'reparo', titulo: 'Tempo de reparo registrado', valor: horasReparo, unidade: 'h', estado: semReparo || reparoInvalido ? 'parcial' : (falhas.length ? 'ok' : 'zero'),
      formula: 'Soma, por TAG, do tempo entre início e fim do reparo; separado da indisponibilidade.',
      populacao: `${falhas.length - semReparo - abertas.length} falhas com reparo registrado.`, exclusoes: 'Reparos sem início ou fim não entram.',
      ausencias: semReparo ? `${semReparo} falha(s) encerrada(s) sem intervalo de reparo.` : '', ...base,
    },
    mtbf: {
      id: 'mtbf', titulo: 'MTBF, MTTR e disponibilidade', valor: null, unidade: '', estado: 'pendente', fonte: 'Definição técnica do mantenedor (F-005) e horas de operação por TAG',
      formula: 'Não calculados: falta definição aprovada e exposição operacional válida.', data: '—',
      populacao: '—', exclusoes: 'Não se usa horas de calendário no lugar da operação.', ausencias: 'Dados insuficientes / definição pendente.',
    },
  };

  const meses = {};
  for (const f of falhas) meses[dia(f.inicio_falha).slice(0, 7)] = (meses[dia(f.inicio_falha).slice(0, 7)] ?? 0) + 1;
  const porMes = Object.keys(meses).sort().map((m) => ({ mes: m, falhas: meses[m], parcial: Boolean(metadados.ultimoMesParcial) && m === metadados.referencia.slice(0, 7) }));
  const topo = ranking.slice(0, 8);
  const semOS = falhas.filter((f) => !f.numero_os).length;

  const frases = {
    mes: porMes.length ? `${falhas.length} falhas no período, média de ${(falhas.length / porMes.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por mês com ocorrência${porMes.some((m) => m.parcial) ? '; o último mês está parcial' : ''}.` : 'Sem falhas no período filtrado.',
    ativos: ranking.length ? `${topo[0].tag} lidera com ${topo[0].falhas} falhas e ${topo[0].indisponibilidade.toLocaleString('pt-BR')} h de indisponibilidade; os ${topo.length} primeiros somam ${topo.reduce((s, g) => s + g.falhas, 0)} de ${falhas.length} falhas.` : 'Sem ativos com falha no período filtrado.',
  };
  const acoes = [];
  if (ranking.length) acoes.push({ texto: `Analisar ${topo[0].tag} (${topo[0].equipamento}): ${topo[0].falhas} falhas no período.`, evidencia: 'Contagem de registros; não indica causa.' });
  const maiorIndisp = [...ranking].sort((a, b) => b.indisponibilidade - a.indisponibilidade)[0];
  if (maiorIndisp && maiorIndisp.indisponibilidade > 0 && maiorIndisp.tag !== topo[0]?.tag) acoes.push({ texto: `Conferir ${maiorIndisp.tag}: maior indisponibilidade registrada (${maiorIndisp.indisponibilidade.toLocaleString('pt-BR')} h).`, evidencia: 'Soma dos intervalos de falha.' });
  if (abertas.length) acoes.push({ texto: `Fechar ou atualizar ${abertas.length} falha(s) aberta(s) para completar as horas.`, evidencia: 'Fim da falha vazio.' });
  if (semOS && acoes.length < 3) acoes.push({ texto: `Vincular OS a ${semOS} falha(s) sem número de OS.`, evidencia: 'Campo número da OS vazio.' });

  const avisos = [...fonte.avisos];
  if (semAtivo) avisos.push(`${semAtivo} falhas fora do cadastro de ativos ficaram de fora dos filtros de setor/família/TAG.`);
  if (semInicio) avisos.push(`${semInicio} falha(s) sem início registrado ficaram fora das contagens.`);
  if (invalidas.length) avisos.push(`${invalidas.length} falha(s) com fim anterior ao início: horas não contadas.`);
  if (reparoInvalido) avisos.push(`${reparoInvalido} reparo(s) com fim anterior ao início: horas não contadas.`);

  return {
    referencia: metadados.referencia, periodo, indicadores, graficos: { porMes, topo }, ranking: topo, totalAtivos: ranking.length,
    frases, acoes: acoes.slice(0, 3), avisos,
    limitacoes: [
      'Indisponibilidade e reparo são lidos como registrados; não são disponibilidade nem MTTR aprovados.',
      'MTBF não é calculado: não há horas de operação por TAG com regra aprovada.',
      'Falhas abertas ficam fora das horas, para não inventar o fim.',
      'Cada falha entra pelo dia de início: uma falha iniciada antes do período não entra, mesmo que termine dentro dele.',
    ],
  };
}
