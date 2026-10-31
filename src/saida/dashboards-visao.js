// Monta o HTML de uma visão a partir do resultado calculado. A tela e o arquivo "Baixar HTML"
// usam este mesmo código; todo texto de origem externa passa por esc().
import { esc } from '../ui.js';
import { MARCA } from '../marca.js';

const nf = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
export const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const dataBr = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const rotuloMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

const ESTADOS = { parcial: 'Incompleto', indefinido: 'Sem dados', pendente: 'Definição pendente' };
// Cores dos dados validadas para daltonismo (azul da família da marca + laranja da marca).
export const COR = { a: '#1F5FAE', b: `#${MARCA.sinal}` };

const ICONES = {
  lista: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pilha: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>',
  alerta: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
  parada: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  chave: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z"/>',
  pulso: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  carteira: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h2M3 10h18"/>',
  tendencia: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  medidor: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/>',
};
const icone = (nome) => `<svg class="pd-icone" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] ?? ICONES.lista}</svg>`;

export function valorDoIndicador(i) {
  if (i.estado === 'indefinido' || i.estado === 'pendente' || i.valor === null) return i.estado === 'pendente' ? 'Definição pendente' : 'Sem dados';
  const v = i.unidade === 'R$' ? brl(i.valor) : nf(i.valor);
  return i.unidade && i.unidade !== 'R$' ? `${v} ${i.unidade}` : v;
}

/** Cartão: indicador + extras de apresentação { icone, tom: 'alerta'|'', contexto, medidor: 0–100+ }. */
export function cartaoHtml(i, extra = {}) {
  const selo = ESTADOS[i.estado] ? `<span class="pd-selo">${ESTADOS[i.estado]}</span>` : '';
  const linhas = [['Fonte', i.fonte], ['Fórmula', i.formula], ['Data utilizada', i.data], ['População', i.populacao], ['Exclusões', i.exclusoes], ['Informações ausentes', i.ausencias]]
    .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  const med = Number.isFinite(extra.medidor)
    ? `<div class="pd-medidor${extra.medidor > 100 ? ' pd-medidor-excede' : ''}" aria-hidden="true"><span style="width:${Math.min(100, Math.max(0, extra.medidor))}%"></span></div>` : '';
  const pendente = i.estado === 'pendente' || i.estado === 'indefinido' ? ' pd-valor-texto' : '';
  return `<article class="pd-cartao${extra.tom ? ` pd-tom-${extra.tom}` : ''}"><div class="pd-cartao-topo">${icone(extra.icone)}<h3>${esc(i.titulo)}</h3></div>` +
    `<p class="pd-valor${pendente}">${esc(valorDoIndicador(i))}</p>${selo}${med}${extra.contexto ? `<p class="pd-contexto">${esc(extra.contexto)}</p>` : ''}` +
    `<details><summary>Como é calculado</summary><dl>${linhas}</dl></details></article>`;
}

// Escala com divisões "redondas" para o eixo.
function escala(max) {
  if (max <= 0) return { topo: 1, passo: 1 };
  const bruto = max / 4, p = 10 ** Math.floor(Math.log10(bruto)), f = bruto / p;
  const passo = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  return { topo: Math.ceil(max / passo) * passo, passo };
}
const curtoEixo = (v) => (v >= 1000 ? `${nf(v / 1000)} mil` : nf(v, 1));

function legendaHtml(series) {
  return series.length > 1 ? `<p class="pd-legenda">${series.map((s) => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join('')}</p>` : '';
}

function figura(titulo, series, corpo, descricao, rotuloAcessivel) {
  return `<figure class="pd-grafico"><figcaption>${esc(titulo)}</figcaption>${legendaHtml(series)}` +
    `<div class="pd-plot" role="img" aria-label="${esc(rotuloAcessivel)}">${corpo}</div><p class="pd-frase">${esc(descricao)}</p></figure>`;
}

/** Linhas no tempo. O último ponto pode ser parcial: o trecho final fica tracejado. */
export function graficoLinhas({ titulo, categorias, series, descricao, parcialUltimo = false, formato = nf }) {
  const L = 480, A = 210, mt = 12, mb = 26, ml = 46, mr = 10;
  const n = categorias.length;
  // Folga de 10% para a linha não encostar no topo.
  const { topo, passo } = escala(Math.max(0, ...series.flatMap((s) => s.valores)) * 1.1);
  const x = (i) => ml + (n <= 1 ? (L - ml - mr) / 2 : (i * (L - ml - mr)) / (n - 1));
  const y = (v) => mt + (A - mt - mb) * (1 - v / topo);
  const resumo = `${titulo}. ` + categorias.map((c, i) => `${c}: ${series.map((s) => `${s.nome} ${formato(s.valores[i])}`).join(', ')}`).join('; ');
  let grade = '';
  for (let v = 0; v <= topo + 1e-9; v += passo) grade += `<line class="pd-grade" x1="${ml}" x2="${L - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="pd-eixo" x="${ml - 6}" y="${y(v) + 4}" text-anchor="end">${curtoEixo(v)}</text>`;
  const salto = Math.max(1, Math.ceil(n / 6));
  const rotulos = categorias.map((c, i) => (i % salto === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < salto / 2)
    ? `<text class="pd-eixo" x="${x(i)}" y="${A - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(c)}</text>` : '').join('');
  const caminho = (vals, de, ate) => vals.slice(de, ate + 1).map((v, k) => `${k ? 'L' : 'M'}${x(de + k).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const linhas = series.map((s, k) => {
    const corte = parcialUltimo && n > 1 ? n - 2 : n - 1;
    const area = k === 0 && n > 1 ? `<path d="${caminho(s.valores, 0, n - 1)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="${s.cor}" opacity=".08"/>` : '';
    const final = parcialUltimo && n > 1 ? `<path d="${caminho(s.valores, n - 2, n - 1)}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-dasharray="4 4"/>` : '';
    const ultimo = n ? `<circle cx="${x(n - 1)}" cy="${y(s.valores[n - 1])}" r="4" fill="${parcialUltimo ? '#fff' : s.cor}" stroke="${parcialUltimo ? s.cor : '#fff'}" stroke-width="2"/>` : '';
    return `${area}<path d="${caminho(s.valores, 0, corte)}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${final}${ultimo}`;
  }).join('');
  const largura = n > 1 ? (L - ml - mr) / (n - 1) : L - ml - mr;
  const alvos = categorias.map((c, i) => {
    const dica = `${c}${parcialUltimo && i === n - 1 ? ' (parcial)' : ''} · ${series.map((s) => `${s.nome}: ${formato(s.valores[i])}`).join(' · ')}`;
    return `<rect class="pd-alvo" x="${x(i) - largura / 2}" y="${mt}" width="${largura}" height="${A - mt - mb}" data-dica="${esc(dica)}" data-x="${x(i)}"><title>${esc(dica)}</title></rect>`;
  }).join('');
  const svg = n ? `<svg viewBox="0 0 ${L} ${A}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${grade}${rotulos}${linhas}<line class="pd-cursor" x1="0" x2="0" y1="${mt}" y2="${A - mb}"/>${alvos}</svg>` : '<p class="pd-vazio">Sem dados no período filtrado.</p>';
  return figura(titulo, series, svg, descricao, resumo);
}

/** Barras horizontais em HTML: texto nítido no celular e valor escrito ao lado de cada barra. */
export function graficoBarrasH({ titulo, itens, series, descricao, formato = nf }) {
  const max = Math.max(1, ...itens.flatMap((it) => it.valores));
  const resumo = `${titulo}. ` + itens.map((it) => `${it.rotulo}: ${series.map((s, k) => `${s.nome} ${formato(it.valores[k])}`).join(', ')}`).join('; ');
  const linhas = itens.map((it) => `<div class="pd-hlinha"><span class="pd-hrotulo" title="${esc(it.rotulo)}">${esc(it.rotulo)}</span><div class="pd-hbarras">` +
    series.map((s, k) => {
      const v = it.valores[k];
      const dica = `${it.rotulo} · ${s.nome}: ${formato(v)}`;
      return `<div class="pd-hbarra" data-dica="${esc(dica)}" title="${esc(dica)}"><span class="pd-hfill" style="width:${v > 0 ? Math.max(1.5, (v / max) * 100) : 0}%;background:${s.cor}"></span><span class="pd-hvalor">${esc(formato(v))}</span></div>`;
    }).join('') + '</div></div>').join('');
  return figura(titulo, series, itens.length ? `<div class="pd-hgrafico${series.length > 1 ? ' pd-hduplo' : ''}">${linhas}</div>` : '<p class="pd-vazio">Sem dados no período filtrado.</p>', descricao, resumo);
}

export function tabelaHtml({ titulo, colunas, linhas, vazio, nota }) {
  const celula = (c, l) => {
    const v = l[c.campo];
    if (c.chip) return `<td><span class="pd-chip pd-chip-${esc(String(v).toLowerCase())}">${esc(v)}</span></td>`;
    return `<td${c.num ? ' class="pd-num"' : ''}>${esc(v)}</td>`;
  };
  const corpo = linhas.length
    ? `<div class="pd-rolagem" tabindex="0" role="region" aria-label="${esc(titulo)}"><table><caption>${esc(titulo)}</caption><thead><tr>${colunas.map((c) => `<th scope="col"${c.num ? ' class="pd-num"' : ''}>${esc(c.titulo)}</th>`).join('')}</tr></thead><tbody>` +
      linhas.map((l) => `<tr>${colunas.map((c) => celula(c, l)).join('')}</tr>`).join('') + '</tbody></table></div>'
    : `<h3>${esc(titulo)}</h3><p class="pd-vazio">${esc(vazio)}</p>`;
  return `<section class="pd-tabela pd-painel">${corpo}${nota ? `<p class="pd-nota">${esc(nota)}</p>` : ''}</section>`;
}

export function acoesHtml(acoes, vazio = 'Sem evidência suficiente nos registros filtrados para indicar uma ação.') {
  const itens = acoes.length
    ? `<ol>${acoes.map((a) => `<li><span class="pd-acao-texto">${esc(a.texto)}</span><span class="pd-evidencia">${esc(a.evidencia)}</span></li>`).join('')}</ol>`
    : `<p>${esc(vazio)}</p>`;
  return `<section class="pd-acoes pd-painel"><h3>Onde agir agora</h3>${itens}</section>`;
}

export function avisosHtml(avisos, limitacoes) {
  const a = avisos.length ? `<ul>${avisos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const l = limitacoes.length ? `<details class="pd-limites"><summary>Limitações desta visão</summary><ul>${limitacoes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>` : '';
  return a || l ? `<section class="pd-avisos">${a}${l}</section>` : '';
}

/** Visão genérica: { cartoes: [[indicador, extra]], graficos (HTML), tabela, acoes, avisos, limitacoes }. */
export function visaoHtml(v) {
  return `<div class="pd-cartoes">${v.cartoes.map((c) => (Array.isArray(c) ? cartaoHtml(...c) : cartaoHtml(c))).join('')}</div>` +
    `<div class="pd-graficos">${v.graficos.join('')}</div><div class="pd-baixo">${acoesHtml(v.acoes)}${tabelaHtml(v.tabela)}</div>${avisosHtml(v.avisos, v.limitacoes)}`;
}

const pctDe = (parte, todo) => (todo > 0 ? (parte / todo) * 100 : null);
const mesesDe = (lista) => lista.map((m) => rotuloMes(m.mes));
const temParcial = (lista) => lista.length > 0 && lista.at(-1).parcial;

export function visaoManutencao(r) {
  const ind = r.indicadores;
  const mov = r.graficos.movimento;
  const abertas = ind.abertas.valor;
  const pAtraso = pctDe(ind.atrasadas.valor, abertas);
  return {
    cartoes: [
      [ind.abertas, { icone: 'lista', contexto: `${r.canceladas} canceladas fora da contagem` }],
      [ind.atrasadas, { icone: 'relogio', tom: ind.atrasadas.valor > 0 ? 'alerta' : '', medidor: pAtraso ?? undefined, contexto: pAtraso === null ? 'Sem OS abertas' : `${nf(pAtraso, 0)}% das OS abertas` }],
      [ind.backlog, { icone: 'pilha', contexto: abertas && ind.backlog.valor !== null ? `Média de ${nf(ind.backlog.valor / abertas)} h por OS aberta` : 'Sem horas restantes informadas' }],
      [ind.cumprimento, { icone: 'alvo', medidor: ind.cumprimento.valor ?? undefined, contexto: 'Concluídas dentro da data prevista' }],
    ],
    graficos: [
      graficoLinhas({
        titulo: 'OS abertas e concluídas por mês', categorias: mesesDe(mov), parcialUltimo: temParcial(mov),
        series: [{ nome: 'Abertas', cor: COR.a, valores: mov.map((m) => m.abertas) }, { nome: 'Concluídas', cor: COR.b, valores: mov.map((m) => m.concluidas) }],
        descricao: r.frases.movimento + (temParcial(mov) ? ' Trecho tracejado = mês parcial.' : ''),
      }),
      graficoBarrasH({
        titulo: 'OS abertas hoje, por atraso', itens: r.graficos.idade.map((f) => ({ rotulo: f.rotulo, valores: [f.valor] })),
        series: [{ nome: 'OS abertas', cor: COR.a }], descricao: r.frases.idade,
      }),
    ],
    tabela: {
      titulo: 'Pendências mais antigas', vazio: 'Nenhuma OS atrasada na posição de referência.',
      colunas: [{ titulo: 'OS', campo: 'numero_os' }, { titulo: 'TAG', campo: 'tag' }, { titulo: 'Atividade', campo: 'atividade' },
        { titulo: 'Prioridade', campo: 'prioridade', chip: true }, { titulo: 'Prevista', campo: 'prevista' }, { titulo: 'Atraso (dias)', campo: 'diasAtraso', num: true },
        { titulo: 'Horas restantes', campo: 'horas', num: true }],
      linhas: r.pendencias.map((p) => ({ ...p, tag: p.tag ?? '—', atividade: p.atividade ?? '—', prioridade: p.prioridade ?? '—', prevista: dataBr(p.data_prevista), horas: p.horas_restantes === null ? 'Sem dado' : nf(p.horas_restantes) })),
      nota: r.totalPendencias > r.pendencias.length ? `Mostrando ${r.pendencias.length} de ${r.totalPendencias} OS atrasadas.` : '',
    },
    acoes: r.acoes, avisos: r.avisos, limitacoes: r.limitacoes,
  };
}

export function visaoConfiabilidade(r) {
  const ind = r.indicadores;
  const mes = r.graficos.porMes;
  return {
    cartoes: [
      [ind.falhas, { icone: 'alerta', contexto: `${r.totalAtivos} ${r.totalAtivos === 1 ? 'ativo' : 'ativos'} com ocorrência` }],
      [ind.indisponibilidade, { icone: 'parada', contexto: 'Soma por TAG, sem contar sobreposição duas vezes' }],
      [ind.reparo, { icone: 'chave', contexto: 'Medido à parte da indisponibilidade' }],
      [ind.mtbf, { icone: 'pulso', contexto: 'Aguarda definição técnica e horas de operação' }],
    ],
    graficos: [
      graficoLinhas({
        titulo: 'Falhas registradas por mês', categorias: mesesDe(mes), parcialUltimo: temParcial(mes),
        series: [{ nome: 'Falhas', cor: COR.a, valores: mes.map((m) => m.falhas) }],
        descricao: r.frases.mes + (temParcial(mes) ? ' Trecho tracejado = mês parcial.' : ''),
      }),
      graficoBarrasH({
        titulo: 'Horas nos ativos com mais falhas', itens: r.graficos.topo.map((g) => ({ rotulo: g.tag, valores: [g.indisponibilidade, g.reparo] })),
        series: [{ nome: 'Indisponibilidade', cor: COR.a }, { nome: 'Reparo', cor: COR.b }], formato: (v) => `${nf(v)} h`, descricao: r.frases.ativos,
      }),
    ],
    tabela: {
      titulo: 'Ativos com mais ocorrências', vazio: 'Nenhuma falha no período filtrado.',
      colunas: [{ titulo: 'TAG', campo: 'tag' }, { titulo: 'Equipamento', campo: 'equipamento' }, { titulo: 'Falhas', campo: 'falhas', num: true },
        { titulo: 'Abertas', campo: 'abertas', num: true }, { titulo: 'Indisponibilidade (h)', campo: 'indisp', num: true }, { titulo: 'Reparo (h)', campo: 'rep', num: true }],
      linhas: r.ranking.map((g) => ({ ...g, indisp: nf(g.indisponibilidade), rep: nf(g.reparo) })),
      nota: r.totalAtivos > r.ranking.length ? `Mostrando ${r.ranking.length} de ${r.totalAtivos} ativos com falha.` : '',
    },
    acoes: r.acoes, avisos: r.avisos, limitacoes: r.limitacoes,
  };
}

export function visaoCustos(r) {
  const ind = r.indicadores;
  const mes = r.graficos.porMes;
  const cat = r.graficos.porCategoria;
  const pct = (v) => (v === null ? 'Sem orçamento' : `${nf(v)}%`);
  const acima = ind.desvio.valor !== null && ind.desvio.valor > 0;
  return {
    cartoes: [
      [ind.realizado, { icone: 'carteira', contexto: `${r.lancamentos} lançamentos no período` }],
      [ind.orcado, { icone: 'alvo', contexto: r.mesParcial ? 'Inclui o orçamento completo do mês parcial' : 'Competências do período' }],
      [ind.desvio, { icone: 'tendencia', tom: acima ? 'alerta' : '', contexto: ind.desvio.valor === null ? 'Sem orçamento comparável' : acima ? 'Acima do orçado' : 'Dentro do orçado' }],
      [ind.consumo, { icone: 'medidor', tom: (ind.consumo.valor ?? 0) > 100 ? 'alerta' : '', medidor: ind.consumo.valor ?? undefined, contexto: 'Realizado ÷ orçado' }],
    ],
    graficos: [
      graficoLinhas({
        titulo: 'Realizado e orçado por mês', categorias: mesesDe(mes), parcialUltimo: temParcial(mes), formato: brl,
        series: [{ nome: 'Realizado', cor: COR.a, valores: mes.map((m) => m.realizado) }, { nome: 'Orçado', cor: COR.b, valores: mes.map((m) => m.orcado) }],
        descricao: r.frases.mes + (temParcial(mes) ? ' Trecho tracejado = mês parcial.' : ''),
      }),
      graficoBarrasH({
        titulo: 'Realizado e orçado por categoria', itens: cat.map((c) => ({ rotulo: c.rotulo, valores: [c.realizado, c.orcado] })),
        series: [{ nome: 'Realizado', cor: COR.a }, { nome: 'Orçado', cor: COR.b }], formato: brl, descricao: r.frases.categoria,
      }),
    ],
    tabela: {
      titulo: 'Por setor do lançamento', vazio: 'Nenhum lançamento ou orçamento no período filtrado.',
      colunas: [{ titulo: 'Setor', campo: 'rotulo' }, { titulo: 'Realizado', campo: 'real', num: true }, { titulo: 'Orçado', campo: 'orc', num: true },
        { titulo: 'Desvio', campo: 'desv', num: true }, { titulo: 'Consumo', campo: 'cons', num: true }],
      linhas: r.porSetor.map((s) => ({ ...s, real: brl(s.realizado), orc: brl(s.orcado), desv: brl(s.desvio), cons: pct(s.consumo) })),
      nota: 'Desvio = realizado − orçado. Positivo significa acima do orçamento.',
    },
    acoes: r.acoes, avisos: r.avisos, limitacoes: r.limitacoes,
  };
}

