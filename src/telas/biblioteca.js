// Tela extra: Biblioteca técnica — editar tipos e tarefas sem mexer no arquivo JSON.
// Cada mudança é conferida e salva neste navegador. Para levar a biblioteca para o
// projeto (ou para outro computador), baixe o arquivo .json.
import { estado, usarBiblioteca, restaurarBiblioteca, BIBLIOTECA_PADRAO } from '../estado.js';
import { PERIODICIDADES, vezesPorAno } from '../logica/plano.js';
import {
  verificarBibliotecaEditada, tarefaPadrao, podeApagarTarefa, podeApagarTipo, novaTarefa, novoTipo,
} from '../logica/edicao.js';
import { esc, baixar, avisar } from '../ui.js';

const ESPECIALIDADES = ['Mecânica', 'Elétrica', 'Lubrificação', 'Preditiva', 'Operação', 'Instrumentação'];
const copia = (obj) => JSON.parse(JSON.stringify(obj));

/** Opções de periodicidade. Tarefa de segurança original: só igual ou mais frequente. */
function opcoesPeriodicidade(tarefa) {
  const original = tarefaPadrao(BIBLIOTECA_PADRAO, tarefa.id);
  const minimo = original?.seguranca ? vezesPorAno(original.periodicidade) : 0;
  return PERIODICIDADES.filter((p) => p.vezes >= minimo)
    .map((p) => `<option ${p.nome === tarefa.periodicidade ? 'selected' : ''}>${p.nome}</option>`).join('');
}

function htmlTarefa(tipo, t) {
  const travada = !!tarefaPadrao(BIBLIOTECA_PADRAO, t.id)?.seguranca; // segurança que vem com o app
  const id = `${tipo.id}-${t.id}`;
  const campo = (c, rotulo, valor, extra = '') =>
    `<div><label for="${id}-${c}">${rotulo}</label><input id="${id}-${c}" data-campo="${c}" value="${esc(valor)}" ${extra}></div>`;
  return `
    <fieldset class="tarefa-edicao" data-tipo="${tipo.id}" data-tarefa="${esc(t.id)}">
      <legend><strong>${esc(t.id)}</strong> ${t.seguranca ? '<span class="selo-seguranca">SEGURANÇA</span>' : ''}</legend>
      <div class="grade">
        ${campo('descricao', 'Tarefa', t.descricao)}
      </div>
      <div class="grade tres">
        <div><label for="${id}-periodicidade">Periodicidade</label>
          <select id="${id}-periodicidade" data-campo="periodicidade">${opcoesPeriodicidade(t)}</select></div>
        ${campo('especialidade', 'Especialidade', t.especialidade, 'list="lista-especialidades"')}
        ${campo('duracao_horas', 'Horas por execução', t.duracao_horas, 'type="number" min="0.05" step="0.05"')}
        ${campo('origem', 'Origem', t.origem)}
        ${campo('versao', 'Versão', t.versao)}
        ${campo('observacao', 'Observação', t.observacao ?? '')}
      </div>
      <div class="acoes">
        <label class="caixa"><input type="checkbox" data-campo="seguranca" ${t.seguranca ? 'checked' : ''} ${travada ? 'disabled' : ''}>
          Tarefa de segurança${travada ? ' (obrigatória)' : ''}</label>
        <button type="button" class="secundario apagar-tarefa" ${podeApagarTarefa(BIBLIOTECA_PADRAO, t.id) ? '' : 'disabled title="Tarefa de segurança da biblioteca"'}>Apagar ${esc(t.id)}</button>
      </div>
    </fieldset>`;
}

function htmlTipo(tipo) {
  const apagar = podeApagarTipo(BIBLIOTECA_PADRAO, tipo.id, estado.equipamentos);
  return `
    <details class="cartao" data-tipo="${tipo.id}">
      <summary><h3>${esc(tipo.nome)} (${esc(tipo.sigla)}) — ${tipo.tarefas.length} tarefas</h3></summary>
      ${tipo.tarefas.map((t) => htmlTarefa(tipo, t)).join('')}
      <div class="acoes">
        <button type="button" class="nova-tarefa" data-tipo="${tipo.id}">Adicionar tarefa</button>
        ${apagar.ok ? `<button type="button" class="secundario apagar-tipo" data-tipo="${tipo.id}">Apagar o tipo ${esc(tipo.nome)}</button>` : ''}
      </div>
    </details>`;
}

export function telaBiblioteca(main) {
  const bib = estado.biblioteca;
  const abertos = new Set([...main.querySelectorAll('details[data-tipo][open]')].map((d) => d.dataset.tipo));
  main.innerHTML = `
    <section class="cartao">
      <h2>Biblioteca técnica</h2>
      <p>Aqui você ajusta as tarefas de cada tipo de equipamento e cria tipos novos, sem mexer em arquivo.
      Cada mudança vale para o plano na hora e fica salva neste aparelho.</p>
      <p class="origem">${estado.bibliotecaEditada ? '<strong>Biblioteca editada neste aparelho.</strong>' : 'Biblioteca original do app.'}
      Tarefas de segurança que vêm com o app só aceitam periodicidade igual ou mais frequente e não podem ser apagadas.</p>
      <div class="acoes">
        <button type="button" id="baixar-json">Baixar biblioteca (.json)</button>
        <button type="button" class="secundario" id="restaurar" ${estado.bibliotecaEditada ? '' : 'disabled'}>Voltar à biblioteca original</button>
      </div>
      <div class="grade duas" style="margin-top:.75rem"><div>
        <label for="importar-json">Importar biblioteca (.json)</label>
        <input type="file" id="importar-json" accept=".json,application/json">
      </div></div>
    </section>

    <details class="cartao">
      <summary><h3>Criar tipo de equipamento</h3></summary>
      <form id="form-tipo" novalidate class="grade tres">
        <div><label for="tipo-nome">Nome</label><input id="tipo-nome" name="nome" placeholder="Ex.: Redutor"></div>
        <div><label for="tipo-sigla">Sigla (3 letras, usada na TAG)</label><input id="tipo-sigla" name="sigla" maxlength="3" placeholder="Ex.: RED"></div>
        <div style="align-self:end"><button type="submit">Criar tipo</button></div>
      </form>
    </details>

    <div id="tipos">${bib.tipos.map(htmlTipo).join('')}</div>
    <datalist id="lista-especialidades">${ESPECIALIDADES.map((e) => `<option value="${e}">`).join('')}</datalist>
  `;
  for (const d of main.querySelectorAll('details[data-tipo]')) if (abertos.has(d.dataset.tipo)) d.open = true;

  /** Aplica uma mudança numa cópia; só usa se passar nas verificações. */
  async function aplicar(mudar, mensagem, redesenhar = false) {
    const nova = copia(estado.biblioteca);
    mudar(nova);
    const problemas = verificarBibliotecaEditada(BIBLIOTECA_PADRAO, nova);
    if (problemas.length) {
      avisar(problemas[0]);
      telaBiblioteca(main); // volta o campo ao valor anterior
      return false;
    }
    (await usarBiblioteca(nova));
    if (redesenhar) telaBiblioteca(main);
    avisar(mensagem);
    return true;
  }

  // Edição de campos das tarefas
  main.querySelector('#tipos').addEventListener('change', async (e) => {
    const fs = e.target.closest('.tarefa-edicao');
    if (!fs || !e.target.dataset.campo) return;
    const campo = e.target.dataset.campo;
    let valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (campo === 'duracao_horas') valor = Number(valor);
    (await aplicar((b) => {
      const t = b.tipos.find((x) => x.id === fs.dataset.tipo).tarefas.find((x) => x.id === fs.dataset.tarefa);
      t[campo] = valor;
    }, `${fs.dataset.tarefa} atualizada.`, campo === 'seguranca'));
  });

  main.querySelector('#tipos').addEventListener('click', async (e) => {
    const alvo = e.target;
    if (alvo.classList.contains('nova-tarefa')) {
      (await aplicar((b) => {
        const tipo = b.tipos.find((x) => x.id === alvo.dataset.tipo);
        tipo.tarefas.push(novaTarefa(b, tipo));
      }, 'Tarefa adicionada. Preencha a descrição e confira a periodicidade.', true));
    } else if (alvo.classList.contains('apagar-tarefa')) {
      const fs = alvo.closest('.tarefa-edicao');
      if (!confirm(`Apagar a tarefa ${fs.dataset.tarefa}?`)) return;
      (await aplicar((b) => {
        const tipo = b.tipos.find((x) => x.id === fs.dataset.tipo);
        tipo.tarefas = tipo.tarefas.filter((x) => x.id !== fs.dataset.tarefa);
      }, `${fs.dataset.tarefa} apagada.`, true));
    } else if (alvo.classList.contains('apagar-tipo')) {
      if (!confirm('Apagar este tipo e todas as suas tarefas?')) return;
      (await aplicar((b) => { b.tipos = b.tipos.filter((x) => x.id !== alvo.dataset.tipo); }, 'Tipo apagado.', true));
    }
  });

  main.querySelector('#form-tipo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target));
    const r = novoTipo(estado.biblioteca, dados.nome, dados.sigla);
    if (!r.ok) { avisar(r.motivo); return; }
    (await aplicar((b) => { b.tipos.push(r.tipo); }, `Tipo ${r.tipo.nome} criado. Adicione as tarefas.`, true));
    main.querySelector(`details[data-tipo="${r.tipo.id}"]`)?.setAttribute('open', '');
  });

  main.querySelector('#baixar-json').addEventListener('click', () => {
    baixar(JSON.stringify(estado.biblioteca, null, 2) + '\n', 'biblioteca.json', 'application/json');
    avisar('Arquivo baixado. Para usar no projeto, substitua src/dados/biblioteca.json por ele.');
  });

  main.querySelector('#restaurar').addEventListener('click', async () => {
    if (!confirm('Descartar as edições e voltar à biblioteca original do app?')) return;
    const tiposUsados = new Set(estado.equipamentos.map((e) => e.tipo));
    const faltando = [...tiposUsados].filter((t) => !BIBLIOTECA_PADRAO.tipos.some((x) => x.id === t));
    if (faltando.length && !confirm('Alguns equipamentos usam tipos criados por você e ficarão com pendência. Continuar?')) return;
    (await restaurarBiblioteca());
    telaBiblioteca(main);
    avisar('Biblioteca original restaurada.');
  });

  main.querySelector('#importar-json').addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    e.target.value = '';
    let nova;
    try { nova = JSON.parse(await arquivo.text()); } catch { avisar('O arquivo não é um JSON válido.'); return; }
    const problemas = verificarBibliotecaEditada(BIBLIOTECA_PADRAO, nova);
    if (problemas.length) {
      avisar(`Biblioteca não importada: ${problemas[0]}${problemas.length > 1 ? ` (e mais ${problemas.length - 1})` : ''}`);
      return;
    }
    (await usarBiblioteca(nova));
    telaBiblioteca(main);
    avisar(`Biblioteca importada de ${arquivo.name}.`);
  });
}
