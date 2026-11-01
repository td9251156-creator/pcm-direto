// Dashboard de Confiabilidade. MTBF, MTTR e disponibilidade são calculados no Mensal (procedimento PCM-MAN-017):
// dependem de operação por TAG e de definições aprovadas pelo mantenedor (F-005).
import { tagsPermitidas, filtroPorAtivo, noPeriodo, dia, mesesParciais } from './filtros.js';
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

  // Critérios diferentes, de propósito: a CONTAGEM usa o dia de início da falha; as HORAS usam o
  // trecho de cada intervalo que cai dentro do período. Uma falha iniciada antes do período e
  // encerrada dentro dele não conta como evento, mas suas horas dentro do período entram.
  const doFiltro = bases.falhas.filter((f) => (!porAtivo || (f.tag && permitidas.has(f.tag))) && f.inicio_falha);
  const anteriores = doFiltro.filter((f) => ms(f.inicio_falha) < ini);
  const anterioresComHoras = anteriores.filter((f) => f.fim_falha && ms(f.fim_falha) > ini && ms(f.fim_falha) >= ms(f.inicio_falha));
  const anterioresAbertas = anteriores.filter((f) => !f.fim_falha).length;
  const porTag = new Map();
  const grupo = (f) => {
    const t = f.tag ?? '(sem TAG)';
    if (!porTag.has(t)) porTag.set(t, { tag: t, falhas: 0, abertas: 0, indisp: [], reparo: [] });
    return porTag.get(t);
  };
  const horas = (g, f) => {
    if (f.fim_falha && ms(f.fim_falha) >= ms(f.inicio_falha)) g.indisp.push(corte(ms(f.inicio_falha), ms(f.fim_falha)));
    if (f.inicio_reparo && f.fim_reparo && ms(f.fim_reparo) >= ms(f.inicio_reparo)) g.reparo.push(corte(ms(f.inicio_reparo), ms(f.fim_reparo)));
  };
  for (const f of falhas) {
    const g = grupo(f);
    g.falhas++;
    if (!f.fim_falha) g.abertas++;
    horas(g, f);
  }
  for (const f of anterioresComHoras) horas(grupo(f), f);
  const anterioresPorTag = new Map();
  for (const f of anterioresComHoras) anterioresPorTag.set(f.tag, [...(anterioresPorTag.get(f.tag) ?? []), corte(ms(f.inicio_falha), ms(f.fim_falha))]);
  const horasAnteriores = arred([...anterioresPorTag.values()].reduce((s, l) => s + uniaoEmHoras(l), 0));
  const ranking = [...porTag.values()].map((g) => ({
    tag: g.tag, equipamento: ativos.get(g.tag)?.descricao_ativo ?? '—', falhas: g.falhas, abertas: g.abertas,
    indisponibilidade: arred(uniaoEmHoras(g.indisp)), reparo: arred(uniaoEmHoras(g.reparo)),
  })).sort((a, b) => b.falhas - a.falhas || b.indisponibilidade - a.indisponibilidade || a.tag.localeCompare(b.tag));
  const comEvento = ranking.filter((g) => g.falhas > 0);
  const horasIndisp = arred(ranking.reduce((s, g) => s + g.indisponibilidade, 0));
  const horasReparo = arred(ranking.reduce((s, g) => s + g.reparo, 0));

  const semHorasValidas = falhas.length > 0 && abertas.length + invalidas.length === falhas.length && !anterioresComHoras.length;
  const notaAnteriores = anterioresComHoras.length ? ` Inclui ${horasAnteriores.toLocaleString('pt-BR')} h de ${anterioresComHoras.length} falha(s) iniciada(s) antes do período (não contadas como evento).` : '';
  const base = { fonte: FONTE, data: `Início da falha entre ${periodo.inicio} e ${periodo.fim}` };
  const indicadores = {
    falhas: {
      id: 'falhas', titulo: 'Falhas registradas', valor: falhas.length, unidade: 'falhas', estado: falhas.length ? 'ok' : 'zero',
      formula: 'Contagem de registros com início da falha no período.', populacao: `${comEvento.length} ativos com ocorrência.`,
      exclusoes: 'Registros fora do período ou de ativos fora dos filtros.', ausencias: abertas.length ? `${abertas.length} falha(s) ainda aberta(s).` : '', ...base,
    },
    indisponibilidade: {
      id: 'indisponibilidade', titulo: 'Indisponibilidade registrada', valor: semHorasValidas ? null : horasIndisp, unidade: 'h',
      estado: semHorasValidas ? 'indefinido' : abertas.length || invalidas.length || anterioresAbertas ? 'parcial' : (falhas.length || anterioresComHoras.length ? 'ok' : 'zero'),
      formula: 'Soma, por TAG, do tempo entre início e fim da falha que cai dentro do período; sobreposições contadas uma vez. Falhas iniciadas antes do período somam só o trecho dentro dele.',
      populacao: `${falhas.length - abertas.length - invalidas.length} falhas do período com início e fim válidos.${notaAnteriores}`,
      exclusoes: 'Falhas abertas e intervalos com fim anterior ao início não entram nas horas.',
      ausencias: [abertas.length && `Incompleto: ${abertas.length} falha(s) aberta(s) sem fim registrado.`,
        anterioresAbertas && `${anterioresAbertas} falha(s) iniciada(s) antes do período continuam abertas: horas não contadas.`].filter(Boolean).join(' '), ...base,
    },
    reparo: {
      id: 'reparo', titulo: 'Tempo de reparo registrado', valor: horasReparo, unidade: 'h', estado: semReparo || reparoInvalido ? 'parcial' : (falhas.length || horasReparo > 0 ? 'ok' : 'zero'),
      formula: 'Soma, por TAG, do tempo entre início e fim do reparo; separado da indisponibilidade.',
      populacao: `${falhas.length - semReparo - abertas.length} falhas com reparo registrado.`, exclusoes: 'Reparos sem início ou fim não entram.',
      ausencias: semReparo ? `${semReparo} falha(s) encerrada(s) sem intervalo de reparo.` : '', ...base,
    },
    mtbf: {
      id: 'mtbf', titulo: 'MTBF, MTTR e disponibilidade', valor: null, unidade: '', estado: 'pendente', fonte: 'Procedimento PCM-MAN-017 (MTBF, MTTR e disponibilidade) — tela Mensal',
      formula: 'Calculados por ativo e mês em Mais → Mensal: HO = HP − HI; MTBF = HO ÷ N; MTTR = reparos completos ÷ nº; disponibilidade = HO ÷ HP × 100.', data: '—',
      populacao: '—', exclusoes: 'Não se usa horas de calendário no lugar da operação.', ausencias: 'Aqui o período pode ter vários meses; o procedimento é por ativo e mês. Consulte o Mensal (precisa das horas planejadas).',
    },
  };

  const meses = {};
  for (const f of falhas) meses[dia(f.inicio_falha).slice(0, 7)] = (meses[dia(f.inicio_falha).slice(0, 7)] ?? 0) + 1;
  const parciais = mesesParciais(periodo);
  const porMes = Object.keys(meses).sort().map((m) => ({ mes: m, falhas: meses[m], parcial: parciais.has(m) }));
  // Ranking de eventos: só TAGs com falha iniciada no período (as horas de falhas anteriores já estão nos totais).
  const topo = comEvento.slice(0, 8);
  const semOS = falhas.filter((f) => !f.numero_os).length;

  const frases = {
    mes: porMes.length ? `${falhas.length} falhas no período, média de ${(falhas.length / porMes.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por mês com ocorrência${porMes.some((m) => m.parcial) ? '; há mês parcial no período' : ''}.` : 'Sem falhas no período filtrado.',
    ativos: comEvento.length ?`${topo[0].tag} lidera com ${topo[0].falhas} falhas e ${topo[0].indisponibilidade.toLocaleString('pt-BR')} h de indisponibilidade; os ${topo.length} primeiros somam ${topo.reduce((s, g) => s + g.falhas, 0)} de ${falhas.length} falhas.` : 'Sem ativos com falha no período filtrado.',
  };
  const acoes = [];
  if (comEvento.length) acoes.push({ texto: `Analisar ${topo[0].tag} (${topo[0].equipamento}): ${topo[0].falhas} falhas no período.`, evidencia: 'Contagem de registros; não indica causa.' });
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
    referencia: metadados.referencia, periodo, indicadores, graficos: { porMes, topo }, ranking: topo, totalAtivos: comEvento.length,
    frases, acoes: acoes.slice(0, 3), avisos,
    limitacoes: [
      'Indisponibilidade e reparo são lidos como registrados; não são disponibilidade nem MTTR aprovados.',
      'MTBF, MTTR e disponibilidade ficam no Mensal, por ativo e mês, pelo procedimento PCM-MAN-017.',
      'Falhas abertas ficam fora das horas, para não inventar o fim.',
      'A contagem usa o dia de início da falha; as horas usam o trecho dentro do período. Uma falha iniciada antes do período não conta como evento, mas suas horas dentro dele entram.',
    ],
  };
}
