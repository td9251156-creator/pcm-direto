import '../dashboards.css';
import { esc, baixar, avisar } from '../ui.js';
import { carregarDemonstracao } from '../logica/dashboards/fonte.js';
import { FILTRO_VAZIO, opcoesDeFiltro, descreverFiltros } from '../logica/dashboards/filtros.js';
import { VISOES, filtrosIgnorados } from '../saida/dashboards-visoes.js';
import { visaoHtml, dataBr, valorDoIndicador } from '../saida/dashboards-visao.js';
import { gerarHtmlDashboards, nomeDoArquivo, resumoDaExportacao } from '../saida/dashboards-html.js';

const ROTULOS = { inicio: 'De', fim: 'Até', setor: 'Setor', familia: 'Família', tag: 'TAG' };

let filtrosSessao = { ...FILTRO_VAZIO };

// Dica flutuante sobre gráficos; a dica nativa (title) fica só no arquivo exportado.
function ligarDicas(conteudo, signal) {
  let dica = null, cursor = null;
  const esconder = () => { dica?.remove(); dica = null; if (cursor) cursor.style.opacity = 0; };
  conteudo.addEventListener('pointerover', (e) => {
    const alvo = e.target.closest('[data-dica]');
    const plot = alvo?.closest('.pd-plot');
    if (!alvo || !plot) { esconder(); return; }
    esconder();
    dica = document.createElement('div');
    dica.className = 'pd-dica';
    dica.textContent = alvo.dataset.dica;
    plot.append(dica);
    const caixa = plot.getBoundingClientRect(), a = alvo.getBoundingClientRect();
    dica.style.left = `${Math.min(caixa.width - dica.offsetWidth / 2, Math.max(dica.offsetWidth / 2, a.left - caixa.left + a.width / 2))}px`;
    dica.style.top = `${a.top - caixa.top + (alvo.matches('rect') ? 8 : 0)}px`;
    cursor = plot.querySelector('.pd-cursor');
    if (cursor && alvo.dataset.x) { cursor.setAttribute('x1', alvo.dataset.x); cursor.setAttribute('x2', alvo.dataset.x); cursor.style.opacity = 1; }
  }, { signal });
  conteudo.addEventListener('pointerleave', esconder, { signal });
}

export function telaDashboards(main) {
  const parametros = new URLSearchParams(location.hash.split('?')[1] || '');
  const id = VISOES[parametros.get('visao')] ? parametros.get('visao') : 'manutencao';
  const visao = VISOES[id];
  const ctrl = new AbortController();
  let vivo = true;
  let dialogo = null;
  main.innerHTML = `<header class="cabecalho-tela"><p class="sobretitulo">Dashboards</p><h2>${esc(visao.titulo)}</h2></header><p role="status">Carregando dados…</p>`;

  carregarDemonstracao().then((fonte) => {
    if (!vivo) return;
    const opcoes = opcoesDeFiltro(fonte.bases);
    const lista = { setor: visao.setores ? visao.setores(fonte) : opcoes.setores, familia: opcoes.familias, tag: opcoes.tags };
    const campo = (nome) => {
      if (nome === 'inicio' || nome === 'fim') return `<div><label for="pd-${nome}">${ROTULOS[nome]}</label><input type="date" id="pd-${nome}" data-filtro="${nome}" value="${esc(filtrosSessao[nome] ?? '')}"></div>`;
      // Um valor escolhido em outra visão continua visível, para a tela não esconder um filtro aplicado.
      const valores = filtrosSessao[nome] && !lista[nome].includes(filtrosSessao[nome]) ? [filtrosSessao[nome], ...lista[nome]] : lista[nome];
      return `<div><label for="pd-${nome}">${ROTULOS[nome]}</label><select id="pd-${nome}" data-filtro="${nome}"><option value="">Todos</option>${valores.map((o) => `<option${filtrosSessao[nome] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    };
    const m = fonte.metadados;
    main.innerHTML = `<div class="pd-tela"><header class="pd-topo"><div><p class="sobretitulo">Dashboards</p><h2>${esc(visao.titulo)}</h2>` +
      `<p class="pd-meta-linha">${m.demonstracao ? '<span class="pd-selo-demo">DEMONSTRAÇÃO · dados fictícios, não são da sua fábrica</span>' : ''}` +
      `<span>Referência ${esc(dataBr(m.referencia))}</span><span>Período padrão ${esc(dataBr(m.periodo.inicio))} a ${esc(dataBr(m.periodo.fim))}</span></p></div></header>` +
      `<ul class="pd-abas">${Object.entries(VISOES).map(([k, v]) => `<li><a href="#dashboards?visao=${k}"${k === id ? ' aria-current="page"' : ''}>${esc(v.titulo)}</a></li>`).join('')}</ul>` +
      `<form class="pd-filtros" aria-label="Filtros">${visao.filtros.map(campo).join('')}` +
      '<div class="pd-filtros-acoes"><button type="button" class="secundario" id="pd-limpar">Limpar filtros</button><button type="button" id="pd-baixar">Baixar HTML</button></div></form>' +
      '<p class="pd-ativos" id="pd-ativos"></p><p class="oculto-leitor" id="pd-anuncio" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></p><div id="pd-conteudo"></div></div>';
    const conteudo = main.querySelector('#pd-conteudo');
    const anuncio = main.querySelector('#pd-anuncio');
    const filtroAtual = () => ({ ...FILTRO_VAZIO, ...filtrosSessao });
    let primeira = true;
    const desenhar = () => {
      const filtro = filtroAtual();
      // Mostra apenas filtros que esta visão suporta, para não sugerir um recorte que não existe.
      const ignorados = filtrosIgnorados(visao, filtro);
      const ativos = descreverFiltros(Object.fromEntries(Object.entries(filtro).filter(([k]) => !ignorados.includes(k))));
      const notas = [];
      if (ignorados.length) notas.push(`Sem suporte aqui (não aplicado): ${ignorados.join(', ')}.`);
      if ((filtro.inicio || filtro.fim) && visao.notaPeriodo) notas.push(visao.notaPeriodo);
      main.querySelector('#pd-ativos').textContent = (ativos.length ? `Filtros ativos: ${ativos.join(' · ')}.` : 'Sem filtros ativos: todos os ativos e o período padrão.') + (notas.length ? ` ${notas.join(' ')}` : '');
      if (filtro.inicio && filtro.fim && filtro.inicio > filtro.fim) {
        conteudo.innerHTML = '<p class="cartao erro" role="alert">A data “De” é posterior à data “Até”. Ajuste o período.</p>';
        return;
      }
      try {
        const v = visao.calcular(fonte, filtro);
        conteudo.innerHTML = visaoHtml(v);
        conteudo.querySelectorAll('.pd-alvo title').forEach((t) => t.remove());
        conteudo.querySelectorAll('.pd-hbarra[title]').forEach((b) => b.removeAttribute('title'));
        const principal = Array.isArray(v.cartoes[0]) ? v.cartoes[0][0] : v.cartoes[0];
        if (!primeira) anuncio.textContent = `Atualizado: ${principal.titulo} ${valorDoIndicador(principal)}.`;
        primeira = false;
      } catch {
        conteudo.innerHTML = '<p class="cartao erro" role="alert">Não foi possível calcular esta visão com os dados atuais. Nenhum dado foi alterado.</p>';
      }
    };
    ligarDicas(conteudo, ctrl.signal);
    main.querySelector('.pd-filtros').addEventListener('change', (e) => {
      const nome = e.target.dataset.filtro;
      if (!nome) return;
      filtrosSessao = { ...filtrosSessao, [nome]: e.target.value || null };
      desenhar();
    }, { signal: ctrl.signal });
    main.querySelector('#pd-limpar').addEventListener('click', () => {
      filtrosSessao = { ...FILTRO_VAZIO };
      main.querySelectorAll('[data-filtro]').forEach((el) => { el.value = ''; });
      desenhar();
    }, { signal: ctrl.signal });
    main.querySelector('#pd-baixar').addEventListener('click', (e) => {
      const r = resumoDaExportacao(fonte, filtroAtual());
      dialogo?.remove();
      dialogo = document.createElement('dialog');
      dialogo.dataset.dialogoApp = 'dashboards';
      dialogo.setAttribute('aria-labelledby', 'pd-titulo-baixar');
      dialogo.innerHTML = `<h2 id="pd-titulo-baixar">Baixar HTML dos dashboards</h2><p>O arquivo será um retrato de hoje e não se atualiza sozinho. Funciona offline.</p><ul>` +
        `<li>Visões: ${esc(r.visoes.join(', '))}</li><li>Referência: ${esc(dataBr(r.referencia))}; período ${esc(dataBr(r.periodo.inicio))} a ${esc(dataBr(r.periodo.fim))}${r.periodoPadrao ? ' (padrão)' : ''}</li>` +
        `<li>Filtros: ${esc(r.filtros.join(' · '))}</li><li>Origem: ${esc(r.origem)}${r.demonstracao ? ' (marcado como demonstração)' : ''}</li><li>${esc(r.conteudo)}</li></ul>` +
        '<div class="chips"><button type="button" class="secundario" id="pd-cancelar">Voltar</button><button type="button" id="pd-confirmar">Baixar arquivo</button></div>';
      document.body.append(dialogo);
      dialogo.querySelector('#pd-cancelar').addEventListener('click', () => dialogo.close());
      dialogo.querySelector('#pd-confirmar').addEventListener('click', () => {
        baixar(gerarHtmlDashboards(fonte, filtroAtual()), nomeDoArquivo(fonte), 'text/html');
        dialogo.close();
        avisar('Arquivo dos dashboards baixado.');
      });
      dialogo.addEventListener('close', () => { dialogo?.remove(); dialogo = null; e.target.focus(); }, { once: true });
      dialogo.showModal();
      dialogo.querySelector('#pd-cancelar').focus();
    }, { signal: ctrl.signal });
    desenhar();
  }).catch(() => {
    if (vivo) main.innerHTML = '<p class="cartao erro" role="alert">Não foi possível abrir os dados da demonstração. Nenhum dado foi alterado.</p>';
  });

  return () => { vivo = false; ctrl.abort(); dialogo?.remove(); };
}
