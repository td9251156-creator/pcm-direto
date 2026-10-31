// "Baixar HTML": retrato autônomo dos dashboards. Sem scripts, CDN, API ou fonte externa;
// leva só os resultados calculados (não os registros brutos) e não se atualiza sozinho.
import { esc } from '../ui.js';
import { descreverFiltros } from '../logica/dashboards/filtros.js';
import { periodoEfetivo } from '../logica/dashboards/manutencao.js';
import { VISOES, filtrosIgnorados } from './dashboards-visoes.js';
import { visaoHtml, dataBr } from './dashboards-visao.js';
import css from '../dashboards.css?raw';
import logoSvg from '../../public/icones/logo-horizontal-slogan.svg?raw';

const CSS_DOC = `body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0e1726;background:#fff;line-height:1.5}
.pd-doc{max-width:1100px;margin:0 auto;padding:16px}.pd-doc header img{height:56px;width:auto;display:block}
.pd-doc h1{color:#0b2a5b;margin:12px 0 4px}.pd-doc h2{color:#0b2a5b;margin-top:32px;border-top:3px solid #e2701f;padding-top:12px}
.pd-doc nav a{margin-right:12px}.pd-meta{background:#f4f6f9;border:1px solid #dde3ea;border-radius:6px;padding:12px;font-size:.9rem}
.pd-meta dt{font-weight:700}.pd-meta dd{margin:0 0 6px}.pd-doc details>*:not(summary){display:block}
.pd-doc .pd-topo h1{margin:0}@media print{.pd-doc nav{display:none}details::details-content{content-visibility:visible;display:block}.pd-cartao,.pd-grafico,.pd-painel{box-shadow:none;break-inside:avoid}}`;

export function resumoDaExportacao(fonte, filtro) {
  const { metadados } = fonte;
  const filtros = descreverFiltros(filtro);
  return {
    visoes: Object.values(VISOES).map((v) => v.titulo),
    referencia: metadados.referencia, periodo: periodoEfetivo(filtro, metadados), periodoPadrao: !filtro.inicio && !filtro.fim, demonstracao: metadados.demonstracao,
    filtros: filtros.length ? filtros : ['Nenhum: todos os ativos e o período padrão'],
    origem: metadados.demonstracao ? 'Pacote de demonstração fictício (biblioteca PCM v2)' : 'Dados locais do PCM Direto',
    conteudo: 'Resultados calculados (cartões, gráficos, tabelas, explicações e limitações). Os registros brutos de OS, falhas e custos não são incluídos.',
  };
}

export function nomeDoArquivo(fonte) {
  return fonte.metadados.demonstracao ? 'PCM-Direto_Dashboards_DEMO.html' : 'PCM-Direto_Dashboards.html';
}

export function gerarHtmlDashboards(fonte, filtro, exportadoEm = new Date()) {
  const r = resumoDaExportacao(fonte, filtro);
  const secoes = Object.entries(VISOES).map(([id, v]) => {
    const ignorados = filtrosIgnorados(v, filtro);
    const nota = (filtro.inicio || filtro.fim) && v.notaPeriodo ? `<p class="pd-nota">${esc(v.notaPeriodo)}</p>` : "";
    const notaFiltro = ignorados.length ? `<p class="pd-nota">Filtro(s) sem suporte nesta visão, não aplicado(s): ${esc(ignorados.join(', '))}.</p>` : '';
    return `<section id="${id}"><h2>${esc(v.titulo)}</h2>${nota}${notaFiltro}${visaoHtml(v.calcular(fonte, filtro))}</section>`;
  }).join('');
  const nav = Object.entries(VISOES).map(([id, v]) => `<a href="#${id}">${esc(v.titulo)}</a>`).join('');
  const logo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`;
  const exportado = exportadoEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` +
    `<title>PCM Direto · Dashboards${r.demonstracao ? ' (demonstração)' : ''}</title><style>${css}${CSS_DOC}</style></head><body><div class="pd-doc">` +
    `<header><img src="${logo}" alt="PCM Direto — Manutenção planejada. Direto ao ponto."><h1>Dashboards de manutenção</h1>` +
    `${r.demonstracao ? '<p><span class="pd-selo-demo">DEMONSTRAÇÃO · dados fictícios, não são de uma fábrica real</span></p>' : ''}` +
    `<dl class="pd-meta"><dt>Referência</dt><dd>${esc(dataBr(r.referencia))}</dd><dt>Período</dt><dd>${esc(dataBr(r.periodo.inicio))} a ${esc(dataBr(r.periodo.fim))}${r.periodoPadrao ? ' (padrão)' : ''}</dd>` +
    `<dt>Filtros</dt><dd>${esc(r.filtros.join(' · '))}</dd><dt>Origem dos dados</dt><dd>${esc(r.origem)}</dd><dt>Exportado em</dt><dd>${esc(exportado)}</dd>` +
    `<dt>Atenção</dt><dd>Este arquivo é um retrato: não se atualiza sozinho. ${fonte.metadados.ultimoMesParcial ? 'O último mês está parcial. ' : ''}Indicadores de confiabilidade dependem de definições técnicas pendentes.</dd></dl>` +
    `<nav aria-label="Visões">${nav}</nav></header>${secoes}</div></body></html>`;
}
