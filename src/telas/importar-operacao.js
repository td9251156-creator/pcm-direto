// Importar dados da operação (004, 008, 012): prévia conferida, confirmação explícita e gravação única.
import { esc, avisar } from '../ui.js';
import { estado, importarOperacao, referenciaOperacao, emDemonstracao } from '../estado.js';
import { abrirWorkbookBibliotecaV2, prepararPreviaBibliotecaV2, lerOrcamentoAnualV2, modeloBibliotecaV2 } from '../integracao/biblioteca-pcm-v2.js';
import { prepararImportacao, resumoOperacao, ROTULOS_BASE, CODIGOS_IMPORTACAO } from '../logica/operacao.js';

const O_QUE = {
  'PCM-MAN-004': 'Cadastro de ativos (aba Cadastros) e ordens de serviço',
  'PCM-MAN-008': 'Registro de falhas, com início e fim da falha e do reparo',
  'PCM-MAN-012': 'Lançamentos de custo e a grade Orçamento anual (setor vazio)',
};
const LIMITE_LISTA = 50;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function resumoSalvo() {
  const r = resumoOperacao(estado.gestao.operacao);
  return `${plural(r.ativos, 'ativo', 'ativos')} · ${plural(r.ordens_servico, 'OS', 'OS')} · ${plural(r.falhas, 'falha', 'falhas')} · ` +
    `${plural(r.custos_manutencao, 'lançamento', 'lançamentos')} · ${plural(r.orcamento, 'mês×categoria de orçamento', 'meses×categorias de orçamento')}`;
}

function historicoHtml() {
  const lista = [...(estado.gestao.operacao?.importacoes ?? [])].reverse().slice(0, 10);
  if (!lista.length) return '<p>Nenhuma importação feita nesta base.</p>';
  return `<ul>${lista.map((i) => `<li>${esc(new Date(i.data).toLocaleString('pt-BR'))} · ${esc(i.codigo)} · ${esc(i.arquivo || 'arquivo sem nome')}: ` +
    `${i.novos} novo(s), ${i.atualizados} atualizado(s), ${i.iguais} sem mudança, ${i.conflitosMantidos} conflito(s) mantido(s), ${i.rejeitados} recusado(s).</li>`).join('')}</ul>`;
}

function previaHtml(plano) {
  if (plano.bloqueios.length) {
    return `<div class="cartao erro" role="alert"><h3>O arquivo não pode ser importado</h3><ul>${plano.bloqueios.map((b) => `<li>${esc(b)}</li>`).join('')}</ul><p>Nada foi gravado.</p></div>`;
  }
  const porBase = (lista) => Object.entries(lista.reduce((g, x) => ({ ...g, [x.base]: (g[x.base] ?? 0) + 1 }), {}))
    .map(([b, n]) => `${ROTULOS_BASE[b]}: ${n}`).join(' · ') || 'nenhum';
  const conflitos = plano.conflitos.slice(0, LIMITE_LISTA).map((c) => `<li><strong>${esc(ROTULOS_BASE[c.base])} ${esc(c.chave)}</strong>: ` +
    c.campos.map((campo) => `${esc(campo)} ${esc(c.atual[campo] ?? 'vazio')} → ${esc(c.novo[campo] ?? 'vazio')}`).join('; ') + '</li>').join('');
  const rejeitados = plano.rejeitados.slice(0, LIMITE_LISTA).map((r) => `<li><strong>${esc(ROTULOS_BASE[r.base])}${r.chave ? ` ${esc(r.chave)}` : ''}${r.linha ? ` (linha ${r.linha})` : ''}</strong>: ${r.motivos.map(esc).join(' ')}</li>`).join('');
  const mais = (lista) => (lista.length > LIMITE_LISTA ? `<p>…e mais ${lista.length - LIMITE_LISTA}.</p>` : '');
  return `<section class="cartao" aria-labelledby="titulo-previa"><h3 id="titulo-previa">Prévia: ${esc(plano.arquivo)}</h3>
    <ul class="io-resumo">
      <li><strong>${plano.novos.length}</strong> novo(s) para gravar — ${esc(porBase(plano.novos))}</li>
      <li><strong>${plano.iguais.length}</strong> já salvo(s) sem mudança — serão ignorados</li>
      <li><strong>${plano.conflitos.length}</strong> com conteúdo diferente do salvo — ${esc(porBase(plano.conflitos))}</li>
      <li><strong>${plano.rejeitados.length}</strong> recusado(s) — ${esc(porBase(plano.rejeitados))}</li>
    </ul>
    ${plano.conflitos.length ? `<details><summary>Ver conflitos (${plano.conflitos.length})</summary><ul>${conflitos}</ul>${mais(plano.conflitos)}</details>` : ''}
    ${plano.rejeitados.length ? `<details open><summary>Ver recusados e o motivo (${plano.rejeitados.length})</summary><ul>${rejeitados}</ul>${mais(plano.rejeitados)}<p>Corrija no Excel e importe de novo: os já gravados não duplicam.</p></details>` : ''}
    ${plano.avisos.length ? `<details><summary>Avisos (${plano.avisos.length})</summary><ul>${plano.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}
    ${plano.apto ? `${plano.conflitos.length ? `<label class="io-opcao"><input type="checkbox" id="io-substituir"> Substituir os ${plano.conflitos.length} registro(s) com conflito pela versão do arquivo (a versão atual fica guardada no histórico da importação)</label>` : ''}
      <p>Registros salvos que não estão neste arquivo continuam como estão: a importação nunca apaga dados.</p>
      <div class="chips"><button type="button" id="io-confirmar">Confirmar importação</button><button type="button" class="secundario" id="io-descartar">Descartar prévia</button></div>`
    : '<p role="status">Não há registros novos ou alterados para gravar. Nada foi alterado.</p><div class="chips"><button type="button" class="secundario" id="io-descartar">Fechar prévia</button></div>'}
  </section>`;
}

export function telaImportarOperacao(main) {
  let vivo = true;
  let plano = null;
  const desenhar = (previa = '') => {
    main.innerHTML = `<header class="cabecalho-tela"><p class="sobretitulo">Dados e apoio</p><h2>Importar dados da operação</h2>
      <p>Traga OS, falhas, custos e orçamento preenchidos nos modelos da Biblioteca PCM v2. Os dados ficam só neste aparelho e entram nos dashboards e no backup.</p></header>
      ${emDemonstracao() ? '<p class="cartao erro" role="alert">Você está no exemplo isolado. Saia do exemplo para importar dados da fábrica.</p>' : ''}
      <section class="cartao" aria-labelledby="titulo-io-arquivo"><h3 id="titulo-io-arquivo">1. Escolha o modelo e o arquivo</h3>
        <ol class="io-ordem">${CODIGOS_IMPORTACAO.map((c) => `<li><strong>${esc(c)}</strong> — ${esc(modeloBibliotecaV2(c).titulo)}: ${esc(O_QUE[c])}</li>`).join('')}</ol>
        <p>Importe primeiro o 004: falhas e custos precisam de TAG cadastrada (no 004 ou nos equipamentos do plano).</p>
        <form id="io-form" class="grade duas">
          <div><label for="io-modelo">Modelo</label><select id="io-modelo">${CODIGOS_IMPORTACAO.map((c) => `<option value="${c}">${esc(c)} — ${esc(modeloBibliotecaV2(c).titulo)}</option>`).join('')}</select></div>
          <div><label for="io-arquivo">Arquivo .xlsx preenchido</label><input type="file" id="io-arquivo" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"${emDemonstracao() ? ' disabled' : ''}></div>
        </form>
        <p class="origem">Baixe os modelos em branco em <a href="#modelos">Modelos para sua rotina</a>.</p>
      </section>
      <div id="io-previa">${previa}</div>
      <section class="cartao" aria-labelledby="titulo-io-base"><h3 id="titulo-io-base">Nesta base</h3><p id="io-salvo">${esc(resumoSalvo())}</p>
        <div class="chips"><a class="botao secundario" href="#dashboards">Abrir dashboards</a><a class="botao secundario" href="#dados">Baixar backup</a></div>
        <h4>Últimas importações</h4>${historicoHtml()}</section>`;
    main.querySelector('#io-arquivo').addEventListener('change', ler);
    main.querySelector('#io-descartar')?.addEventListener('click', () => { plano = null; desenhar(); main.querySelector('#io-arquivo').focus(); });
    main.querySelector('#io-confirmar')?.addEventListener('click', confirmar);
  };

  async function ler(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const codigo = main.querySelector('#io-modelo').value;
    plano = null;
    main.querySelector('#io-previa').innerHTML = '<p role="status">Lendo e conferindo o arquivo…</p>';
    try {
      const bytes = await arquivo.arrayBuffer();
      const ExcelJS = (await import('exceljs')).default; // carrega só quando precisa
      const wb = await abrirWorkbookBibliotecaV2(bytes, ExcelJS);
      const previa = prepararPreviaBibliotecaV2(wb, codigo);
      const orcamento = codigo === 'PCM-MAN-012' ? lerOrcamentoAnualV2(wb) : null;
      if (!vivo) return;
      plano = prepararImportacao(previa, orcamento, estado.gestao.operacao, estado.equipamentos.map((x) => ({ tag: x.tag, setor: x.setor })),
        { arquivo: arquivo.name, referencia: referenciaOperacao() });
    } catch {
      if (!vivo) return;
      main.querySelector('#io-previa').innerHTML = '<p class="cartao erro" role="alert">Não foi possível ler o arquivo. Confira se é um modelo .xlsx da Biblioteca PCM v2 e se o modelo escolhido é o certo. Nada foi gravado.</p>';
      return;
    }
    const modelo = main.querySelector('#io-modelo').value;
    desenhar(previaHtml(plano));
    main.querySelector('#io-modelo').value = modelo;
    main.querySelector('#titulo-previa')?.setAttribute('tabindex', '-1');
    (main.querySelector('#titulo-previa') ?? main.querySelector('[role="alert"]'))?.focus();
  }

  async function confirmar(e) {
    if (!plano?.apto) return;
    e.target.disabled = true;
    const r = await importarOperacao(plano, { substituirConflitos: Boolean(main.querySelector('#io-substituir')?.checked) });
    if (!vivo) return;
    if (!r.ok) {
      e.target.disabled = false;
      main.querySelector('#io-previa').insertAdjacentHTML('afterbegin', `<p class="cartao erro" role="alert">${esc(r.motivo)}</p>`);
      return;
    }
    plano = null;
    desenhar(`<p class="cartao" role="status">Importação gravada: ${r.registro.novos} novo(s) e ${r.registro.atualizados} atualizado(s). ${r.registro.conflitosMantidos ? `${r.registro.conflitosMantidos} conflito(s) mantido(s) como estavam.` : ''}</p>`);
    avisar('Importação gravada neste aparelho.');
  }

  desenhar();
  return () => { vivo = false; };
}
