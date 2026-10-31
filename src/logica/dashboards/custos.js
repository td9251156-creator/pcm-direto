// Dashboard de Custos: realizado (modelo 012) contra orçamento normalizado por setor, categoria e competência.
// Sem rateio por TAG: o orçamento não tem TAG, por isso família e TAG não filtram esta visão.
import { noPeriodo } from './filtros.js';
import { periodoEfetivo } from './manutencao.js';

const FONTE_REAL = 'Modelo 012 · tb_pcm_custos (setor do lançamento)';
const FONTE_ORC = 'Orçamento normalizado (setor × categoria × competência), fonte complementar';
const ROTULO_CAT = { MATERIAL: 'Material', MAO_OBRA: 'Mão de obra', TERCEIROS: 'Terceiros', OUTROS: 'Outros' };
const arred = (n) => Math.round(n * 100) / 100;
const mes = (d) => String(d).slice(0, 7);
const soma = (a, f) => a.reduce((s, r) => s + (r[f] ?? 0), 0);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function setoresDeCustos(bases) {
  return [...new Set([...bases.custos_manutencao, ...bases.orcamento_manutencao].map((r) => r.setor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function calcularCustos(fonte, filtro) {
  const { bases, metadados } = fonte;
  const periodo = periodoEfetivo(filtro, metadados);
  const mIni = mes(periodo.inicio), mFim = mes(periodo.fim);
  const doSetor = (r) => !filtro.setor || r.setor === filtro.setor;
  const avisos = [...fonte.avisos];

  const vistos = new Set();
  let repetidos = 0;
  const orcamento = bases.orcamento_manutencao.filter((o) => {
    if (!o.competencia || !o.setor || !o.categoria_custo) return false;
    const k = `${mes(o.competencia)}|${o.setor}|${o.categoria_custo}`;
    if (vistos.has(k)) { repetidos++; return false; }
    vistos.add(k);
    return true;
  }).filter((o) => doSetor(o) && mes(o.competencia) >= mIni && mes(o.competencia) <= mFim);
  if (repetidos) avisos.push(`${repetidos} linha(s) de orçamento repetida(s) (mesmo mês, setor e categoria) ignorada(s).`);
  const lancamentos = bases.custos_manutencao.filter((c) => doSetor(c) && noPeriodo(c.data_lancamento, periodo));
  const semValor = lancamentos.filter((c) => c.valor_realizado === null).length;
  const semSetor = filtro.setor ? bases.custos_manutencao.filter((c) => !c.setor && noPeriodo(c.data_lancamento, periodo)).length : 0;

  const realizado = arred(soma(lancamentos, 'valor_realizado'));
  const orcado = arred(soma(orcamento, 'valor_orcado'));
  const orcSemValor = orcamento.filter((o) => o.valor_orcado === null).length;
  const comOrcamento = orcamento.some((o) => o.valor_orcado !== null);
  const temOrcamento = orcado > 0;
  const semData = bases.custos_manutencao.filter((c) => !c.data_lancamento).length;
  const ultimoDia = new Date(Date.UTC(+mFim.slice(0, 4), +mFim.slice(5, 7), 0)).getUTCDate();
  const mesParcial = +periodo.fim.slice(8, 10) !== ultimoDia || periodo.inicio.slice(8, 10) !== '01';
  const nota = mesParcial ? `Realizado de mês parcial (até ${periodo.fim}) comparado ao orçamento do mês completo.` : '';
  const desvio = arred(realizado - orcado);
  const incompleto = mesParcial || semValor > 0;

  const base = { data: `Lançamentos de ${periodo.inicio} a ${periodo.fim}; orçamento das competências ${mIni} a ${mFim}` };
  const comparado = { fonte: `${FONTE_REAL} e ${FONTE_ORC}`, populacao: 'Mesmo período e mesmo setor nas duas fontes.', ...base };
  const indicadores = {
    realizado: {
      id: 'realizado', titulo: 'Realizado', valor: realizado, unidade: 'R$', estado: semValor || semSetor ? 'parcial' : (lancamentos.length ? 'ok' : 'zero'), fonte: FONTE_REAL,
      formula: 'Soma do valor realizado dos lançamentos no período.', populacao: `${lancamentos.length} lançamentos.`,
      exclusoes: 'Compromissos não entram: somente gasto realizado. Cada lançamento é contado uma vez; total e componentes não são somados juntos.',
      ausencias: semValor ? `${semValor} lançamento(s) sem valor.` : '', ...base,
    },
    orcado: {
      id: 'orcado', titulo: 'Orçado', valor: comOrcamento ? orcado : null, unidade: 'R$', estado: comOrcamento ? (mesParcial || orcSemValor ? 'parcial' : (orcado ? 'ok' : 'zero')) : 'indefinido', fonte: FONTE_ORC,
      formula: 'Soma do orçamento mensal das competências do período.', populacao: `${orcamento.length} linhas de orçamento.`,
      exclusoes: 'Sem rateio por TAG; o seletor de setor do template 012 não define o dono do orçamento.',
      ausencias: temOrcamento ? nota : 'Sem orçamento comparável no período/setor.', ...base,
    },
    desvio: {
      id: 'desvio', titulo: 'Desvio', valor: comOrcamento ? desvio : null, unidade: 'R$', estado: comOrcamento ? (incompleto || orcSemValor ? 'parcial' : 'ok') : 'indefinido',
      formula: 'Realizado − orçado (positivo = acima do orçamento).', exclusoes: 'Sem orçamento comparável não há desvio.',
      ausencias: comOrcamento ? nota : 'Orçamento não comparável: apenas o realizado é mostrado.', ...comparado,
    },
    consumo: {
      id: 'consumo', titulo: 'Consumo do orçamento', valor: temOrcamento ? arred((realizado / orcado) * 100) : null, unidade: '%', estado: temOrcamento ? (incompleto ? 'parcial' : 'ok') : 'indefinido',
      formula: 'Realizado ÷ orçado, apenas com orçado maior que zero.', exclusoes: 'Orçado zero ou ausente deixa o cálculo indefinido.',
      ausencias: temOrcamento ? nota : 'Orçado ausente ou zero.', ...comparado,
    },
  };

  const meses = {};
  for (const c of lancamentos) (meses[mes(c.data_lancamento)] ??= { real: 0, orc: 0 }).real += c.valor_realizado ?? 0;
  for (const o of orcamento) (meses[mes(o.competencia)] ??= { real: 0, orc: 0 }).orc += o.valor_orcado ?? 0;
  const porMes = Object.keys(meses).sort().map((m) => ({ mes: m, realizado: arred(meses[m].real), orcado: arred(meses[m].orc), parcial: Boolean(metadados.ultimoMesParcial) && m === mes(metadados.referencia) && m === mFim }));

  const agrupar = (campo, rotulo = (x) => x) => {
    const g = {};
    const sem = campo === 'setor' ? '(sem setor)' : '(sem categoria)';
    for (const c of lancamentos) (g[c[campo] ?? sem] ??= { real: 0, orc: 0 }).real += c.valor_realizado ?? 0;
    for (const o of orcamento) (g[o[campo] ?? sem] ??= { real: 0, orc: 0 }).orc += o.valor_orcado ?? 0;
    return Object.keys(g).map((k) => ({ chave: k, rotulo: rotulo(k), realizado: arred(g[k].real), orcado: arred(g[k].orc), desvio: arred(g[k].real - g[k].orc), consumo: g[k].orc > 0 ? arred((g[k].real / g[k].orc) * 100) : null }));
  };
  const porCategoria = agrupar('categoria_custo', (k) => ROTULO_CAT[k] ?? k).sort((a, b) => b.realizado - a.realizado);
  const porSetor = agrupar('setor').sort((a, b) => b.desvio - a.desvio || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  const frases = {
    mes: porMes.length
      ? (temOrcamento
        ? `No período, o realizado foi ${brl(realizado)} contra ${brl(orcado)} orçados (${desvio >= 0 ? '+' : '−'}${brl(Math.abs(desvio))}).${mesParcial ? ' O último mês tem realizado parcial e orçamento completo.' : ''}`
        : `Realizado de ${brl(realizado)}; sem orçamento comparável para calcular desvio.`)
      : 'Sem lançamentos no período filtrado.',
    categoria: porCategoria.length
      ? `${porCategoria[0].rotulo} é a maior categoria realizada: ${brl(porCategoria[0].realizado)}${realizado > 0 ? ` (${Math.round((porCategoria[0].realizado / realizado) * 100)}% do total)` : ''}.`
      : 'Sem custos por categoria no período filtrado.',
  };

  const acoes = [];
  const pior = porSetor.find((s) => s.desvio > 0 && s.orcado > 0);
  if (pior) acoes.push({ texto: `Conferir ${pior.rotulo}: realizado ${brl(pior.realizado)} contra ${brl(pior.orcado)} orçados (desvio ${brl(pior.desvio)}).`, evidencia: 'Realizado − orçado do setor no período.' });
  const catPior = porCategoria.filter((c) => c.orcado > 0).sort((a, b) => b.desvio - a.desvio)[0];
  if (catPior && catPior.desvio > 0) acoes.push({ texto: `Revisar a categoria ${catPior.rotulo}: ${brl(catPior.desvio)} acima do orçado.`, evidencia: 'Realizado − orçado da categoria; não indica causa.' });
  const semGasto = porCategoria.filter((c) => c.orcado > 0 && c.realizado === 0);
  if (semGasto.length) acoes.push({ texto: `Conferir orçamento de ${semGasto.map((c) => c.rotulo).join(', ')}: há valor orçado e nenhum lançamento.`, evidencia: 'Categoria sem lançamentos no período.' });
  if (!temOrcamento && lancamentos.length) acoes.push({ texto: 'Informar orçamento do período para comparar com o realizado.', evidencia: 'Sem orçamento comparável.' });

  if (orcSemValor) avisos.push(`${orcSemValor} linha(s) de orçamento sem valor tratada(s) como ausente(s).`);
  if (semData) avisos.push(`${semData} lançamento(s) sem data ficaram fora das contagens.`);
  if (semSetor) avisos.push(`${semSetor} lançamento(s) sem setor ficaram de fora do filtro de setor.`);
  return {
    referencia: metadados.referencia, periodo, indicadores, graficos: { porMes, porCategoria }, porSetor, frases, acoes: acoes.slice(0, 3), avisos, mesParcial, lancamentos: lancamentos.length,
    limitacoes: [
      'Setor e competência são os do lançamento; não há rateio do orçamento por TAG.',
      'Compromissos, estoque e compras não entram: somente gasto realizado.',
      'O orçamento do template 012 comporta um ano e um escopo por emissão; aqui vem de fonte complementar normalizada.',
    ],
  };
}
