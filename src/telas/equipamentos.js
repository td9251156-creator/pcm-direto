// Tela 2: Equipamentos — cadastro manual, colar do Excel, importar CSV ou .xlsx e lista com validação ao vivo.
import { estado, salvar, adicionar, remover, limpar, atualizarTag } from '../estado.js';
import { validarEquipamento, validarLista } from '../logica/validacao.js';
import { lerTabela, lerXlsx, novoId, paraCsv } from '../logica/entrada.js';
import { normalizarSetor, proximoNumero, gerarTag } from '../logica/tag.js';
import { esc, baixar, avisar } from '../ui.js';

const tipos = () => estado.biblioteca.tipos; // tipos da biblioteca em uso
const nomeTipo = (id) => tipos().find((t) => t.id === id)?.nome ?? id;

const CAMPOS_TEXTO = [
  ['descricao', 'Descrição', 'Ex.: Motor do exaustor 1'],
  ['fabricante', 'Fabricante', ''],
  ['modelo', 'Modelo', ''],
];

function opcoesTipo(atual) {
  const conhecido = tipos().some((t) => t.id === atual);
  return (conhecido ? '' : `<option value="${esc(atual)}" selected>${atual ? esc(atual) + ' (não reconhecido)' : 'Escolha o tipo'}</option>`) +
    tipos().map((t) => `<option value="${t.id}" ${t.id === atual ? 'selected' : ''}>${esc(t.nome)}</option>`).join('');
}

/** Lista de problemas com botão para aplicar a sugestão. */
function htmlProblemas(problemas) {
  if (!problemas.length) return '<p class="ok">✔ Sem pendências.</p>';
  return '<ul class="erro">' + problemas.map((p) => {
    const rotulo = p.campo === 'tipo' ? nomeTipo(p.sugestao) : p.sugestao;
    const botao = p.sugestao !== null && p.sugestao !== undefined
      ? ` <button type="button" class="secundario sugestao" data-campo="${p.campo}" data-valor="${esc(p.sugestao)}">Usar «${esc(rotulo)}»</button>`
      : '';
    return `<li>${esc(p.mensagem)}${botao}</li>`;
  }).join('') + '</ul>';
}

function htmlEquipamento(eq, aberto) {
  const id = eq.id;
  return `
    <details class="cartao equip" data-id="${id}" ${aberto ? 'open' : ''}>
      <summary>
        <strong class="tag-eq">${esc(eq.tag)}</strong>
        <span class="desc-eq">${esc(eq.descricao) || '(sem descrição)'}</span>
        <span class="situacao-eq"></span>
      </summary>
      <div class="grade tres">
        <div><label for="${id}-setor">Setor</label>
          <input id="${id}-setor" data-campo="setor" value="${esc(eq.setor)}" maxlength="6" autocomplete="off"></div>
        <div><label for="${id}-tipo">Tipo</label>
          <select id="${id}-tipo" data-campo="tipo">${opcoesTipo(eq.tipo)}</select></div>
        <div><label for="${id}-numero">Número</label>
          <input id="${id}-numero" data-campo="numero" type="number" min="1" max="999" value="${esc(eq.numero)}"></div>
        ${CAMPOS_TEXTO.map(([c, rotulo]) => `
          <div><label for="${id}-${c}">${rotulo}</label>
            <input id="${id}-${c}" data-campo="${c}" value="${esc(eq[c])}" autocomplete="off"></div>`).join('')}
      </div>
      <div class="problemas" aria-live="polite"></div>
      <div class="acoes"><button type="button" class="secundario remover">Remover ${esc(eq.tag)}</button></div>
    </details>`;
}

export function telaEquipamentos(main, ir) {
  const vazia = !estado.equipamentos.length;
  const abertos = new Set(); // equipamentos que o usuário abriu
  main.innerHTML = `
    <section class="cartao">
      <h2>Equipamentos</h2>
      <p id="contagem"></p>
      ${estado.exemplo ? '<p><strong>Esta é a lista de exemplo, com dados fictícios.</strong> Edite à vontade ou comece em branco.</p>' : ''}
      <div class="acoes">
        <button type="button" id="ir-revisao">Próximo: revisar o plano</button>
        <button type="button" class="secundario" id="limpar">Começar lista em branco</button>
      </div>
    </section>

    <details class="cartao" ${vazia ? 'open' : ''}>
      <summary><h3>Cadastrar um equipamento</h3></summary>
      <form id="form-novo" novalidate>
        <div class="grade tres">
          <div><label for="novo-setor">Setor (2 a 4 letras)</label>
            <input id="novo-setor" name="setor" maxlength="6" placeholder="Ex.: UTL" autocomplete="off"></div>
          <div><label for="novo-tipo">Tipo</label>
            <select id="novo-tipo" name="tipo">${opcoesTipo('')}</select></div>
          ${CAMPOS_TEXTO.map(([c, rotulo, dica]) => `
            <div><label for="novo-${c}">${rotulo}</label>
              <input id="novo-${c}" name="${c}" placeholder="${esc(dica)}" autocomplete="off"></div>`).join('')}
        </div>
        <p>TAG gerada: <strong id="novo-tag">—</strong></p>
        <div id="novo-problemas" aria-live="polite"></div>
        <div class="acoes"><button type="submit">Adicionar equipamento</button></div>
      </form>
    </details>

    <details class="cartao" ${vazia ? 'open' : ''}>
      <summary><h3>Colar do Excel ou importar arquivo</h3></summary>
      <p>Colunas nesta ordem: <strong>setor, tipo, descrição, fabricante, modelo</strong>. A linha de cabeçalho é opcional.
      O tipo pode ser o nome (Motor elétrico) ou a sigla (MOT).</p>
      <label for="colar">Cole aqui as linhas copiadas do Excel</label>
      <textarea id="colar" placeholder="UTL&#9;Compressor de ar&#9;Compressor 1&#9;Fabricante A&#9;CP-30"></textarea>
      <div class="acoes">
        <button type="button" id="adicionar-colado">Adicionar linhas coladas</button>
      </div>
      <div class="grade duas" style="margin-top:1rem">
        <div><label for="csv">Importar planilha Excel (.xlsx) ou CSV</label>
          <input id="csv" type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div>
      </div>
      <div class="acoes">
        <button type="button" class="secundario" id="modelo-csv">Baixar modelo CSV</button>
        <button type="button" class="secundario" id="exportar-csv">Baixar lista atual em CSV</button>
      </div>
    </details>

    <section>
      <h3>Lista de equipamentos</h3>
      <p class="origem">Toque em um equipamento para ver e corrigir os dados.</p>
      <div id="resumo-validacao" aria-live="polite"></div>
      <div id="lista"></div>
    </section>
  `;

  const lista = main.querySelector('#lista');

  // Desenha a lista inteira (usado ao adicionar, remover ou aplicar sugestão)
  function desenharLista() {
    const problemas = validarLista(estado.equipamentos, tipos());
    // Abre os que têm pendência e os que o usuário já tinha aberto
    lista.innerHTML = estado.equipamentos.map((e) => htmlEquipamento(e, problemas[e.id] || abertos.has(e.id))).join('') ||
      '<p>Nenhum equipamento ainda. Cadastre acima, cole do Excel ou importe uma planilha.</p>';
    atualizarValidacao();
  }

  // Atualiza só mensagens, TAGs e contagem, sem redesenhar os campos (não perde o cursor)
  function atualizarValidacao() {
    const problemas = validarLista(estado.equipamentos, tipos());
    for (const fs of lista.querySelectorAll('.equip')) {
      const eq = estado.equipamentos.find((e) => e.id === fs.dataset.id);
      fs.querySelector('.tag-eq').textContent = eq.tag;
      fs.querySelector('.desc-eq').textContent = eq.descricao || '(sem descrição)';
      fs.querySelector('.situacao-eq').innerHTML = problemas[eq.id]
        ? `<span class="erro">⚠ ${problemas[eq.id].length} pendência${problemas[eq.id].length === 1 ? '' : 's'}</span>`
        : '<span class="ok">✔</span>';
      fs.querySelector('.problemas').innerHTML = htmlProblemas(problemas[eq.id] ?? []);
      fs.classList.toggle('linha-erro', !!problemas[eq.id]);
    }
    const comErro = Object.keys(problemas).length;
    const n = estado.equipamentos.length;
    main.querySelector('#contagem').textContent = `${n} equipamento${n === 1 ? '' : 's'} na lista.`;
    main.querySelector('#resumo-validacao').innerHTML = comErro
      ? `<p class="erro"><strong>${comErro} equipamento${comErro === 1 ? '' : 's'} com pendência.</strong> Veja as sugestões em cada um.</p>`
      : (n ? '<p class="ok"><strong>✔ Lista sem pendências.</strong></p>' : '');
  }

  // Alteração em um campo da lista
  function alterarCampo(eq, campo, valor) {
    if (campo === 'numero') eq.numero = valor === '' ? '' : Number(valor);
    else eq[campo] = valor;
    // Mudou setor ou tipo: busca o próximo número livre para não repetir TAG
    if ((campo === 'setor' || campo === 'tipo') && estado.equipamentos.some((o) => o.id !== eq.id && o.setor === eq.setor && o.tipo === eq.tipo && Number(o.numero) === Number(eq.numero))) {
      eq.numero = proximoNumero(estado.equipamentos, eq.setor, eq.tipo, eq.id);
      const campoNumero = lista.querySelector(`#${CSS.escape(eq.id)}-numero`);
      if (campoNumero) campoNumero.value = eq.numero;
    }
    atualizarTag(eq);
    estado.exemplo = false;
    salvar();
  }

  // Guarda quais equipamentos estão abertos, para continuarem abertos ao redesenhar
  lista.addEventListener('toggle', (e) => {
    if (!e.target.classList?.contains('equip')) return;
    if (e.target.open) abertos.add(e.target.dataset.id);
    else abertos.delete(e.target.dataset.id);
  }, true);

  lista.addEventListener('input', (e) => {
    const fs = e.target.closest('.equip');
    if (!fs || !e.target.dataset.campo) return;
    const eq = estado.equipamentos.find((x) => x.id === fs.dataset.id);
    alterarCampo(eq, e.target.dataset.campo, e.target.value);
    atualizarValidacao();
  });

  lista.addEventListener('click', (e) => {
    const fs = e.target.closest('.equip');
    if (!fs) return;
    const eq = estado.equipamentos.find((x) => x.id === fs.dataset.id);
    if (e.target.classList.contains('sugestao')) {
      alterarCampo(eq, e.target.dataset.campo, e.target.dataset.valor);
      abertos.add(eq.id);
      desenharLista();
      lista.querySelector(`#${CSS.escape(eq.id)}-${e.target.dataset.campo}`)?.focus();
      avisar('Correção aplicada.');
    } else if (e.target.classList.contains('remover')) {
      if (!confirm(`Remover ${eq.tag}?`)) return;
      remover(eq.id);
      desenharLista();
      avisar(`${eq.tag} removido.`);
    }
  });

  // ----- Cadastro manual com validação ao vivo -----
  const form = main.querySelector('#form-novo');
  function rascunhoNovo() {
    const d = Object.fromEntries(new FormData(form));
    const eq = { ...d, id: 'novo' };
    eq.numero = proximoNumero(estado.equipamentos, eq.setor, eq.tipo);
    eq.tag = gerarTag(eq.setor || '???', tipos().find((t) => t.id === eq.tipo)?.sigla ?? '???', eq.numero);
    return eq;
  }
  function validarNovo(mostrarTudo) {
    const eq = rascunhoNovo();
    main.querySelector('#novo-tag').textContent = eq.tag;
    let problemas = validarEquipamento(eq, tipos(), [...estado.equipamentos, eq]);
    // Enquanto digita, não reclama de campo que ainda não foi preenchido
    if (!mostrarTudo) problemas = problemas.filter((p) => String(eq[p.campo] ?? '').trim());
    main.querySelector('#novo-problemas').innerHTML = problemas.length ? htmlProblemas(problemas) : '';
    return { eq, problemas };
  }
  form.addEventListener('input', () => validarNovo(false));
  form.addEventListener('click', (e) => {
    if (!e.target.classList.contains('sugestao')) return;
    form.elements[e.target.dataset.campo].value = e.target.dataset.valor;
    validarNovo(false);
    form.elements[e.target.dataset.campo].focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { eq, problemas } = validarNovo(true);
    if (problemas.length) {
      form.elements[problemas[0].campo]?.focus();
      avisar('Corrija os campos indicados antes de adicionar.');
      return;
    }
    adicionar([{ ...eq, id: novoId() }]);
    form.reset();
    form.elements.setor.value = eq.setor; // facilita cadastrar vários do mesmo setor
    validarNovo(false);
    desenharLista();
    avisar(`${eq.tag} adicionado.`);
    form.elements.tipo.focus();
  });
  form.elements.setor.addEventListener('blur', () => {
    const s = normalizarSetor(form.elements.setor.value);
    if (s.length >= 2) form.elements.setor.value = s;
    validarNovo(false);
  });

  // ----- Colar do Excel -----
  main.querySelector('#adicionar-colado').addEventListener('click', () => {
    const campo = main.querySelector('#colar');
    const novos = lerTabela(campo.value, tipos());
    if (!novos.length) { avisar('Nada para adicionar. Cole as linhas copiadas do Excel.'); return; }
    adicionar(novos);
    campo.value = '';
    desenharLista();
    avisar(`${novos.length} equipamento(s) adicionados. Confira as pendências na lista.`);
  });

  // ----- Importar planilha .xlsx ou CSV -----
  main.querySelector('#csv').addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const bytes = await arquivo.arrayBuffer();
    e.target.value = '';
    let novos;
    if (/\.xlsx$/i.test(arquivo.name)) {
      avisar('Lendo a planilha…');
      try {
        const ExcelJS = (await import('exceljs')).default; // carrega só quando precisa
        novos = await lerXlsx(bytes, tipos(), ExcelJS);
      } catch {
        avisar('Não foi possível ler a planilha. Confira se é um arquivo .xlsx (Excel 2007 ou mais novo).');
        return;
      }
    } else {
      let texto = new TextDecoder('utf-8').decode(bytes);
      // CSV salvo pelo Excel em português costuma vir em Windows-1252 (acentos quebram em UTF-8)
      if (texto.includes('\uFFFD')) texto = new TextDecoder('windows-1252').decode(bytes);
      novos = lerTabela(texto, tipos());
    }
    if (!novos.length) { avisar('O arquivo não tem linhas de equipamento.'); return; }
    adicionar(novos);
    desenharLista();
    avisar(`${novos.length} equipamento(s) importados de ${arquivo.name}. Confira as pendências na lista.`);
  });

  main.querySelector('#modelo-csv').addEventListener('click', () => {
    const exemplo = [{ setor: 'UTL', tipo: 'Compressor de ar', descricao: 'Compressor 1', fabricante: 'Fabricante A', modelo: 'CP-30' }];
    baixar('\uFEFF' + paraCsv(exemplo), 'modelo-equipamentos.csv', 'text/csv;charset=utf-8');
  });
  main.querySelector('#exportar-csv').addEventListener('click', () => {
    const linhas = estado.equipamentos.map((e) => ({ ...e, tipo: nomeTipo(e.tipo) }));
    baixar('\uFEFF' + paraCsv(linhas), 'equipamentos.csv', 'text/csv;charset=utf-8');
  });

  main.querySelector('#limpar').addEventListener('click', () => {
    if (estado.equipamentos.length && !confirm('Apagar a lista atual e começar em branco?')) return;
    limpar();
    telaEquipamentos(main, ir);
    avisar('Lista em branco.');
  });
  main.querySelector('#ir-revisao').addEventListener('click', () => ir('revisao'));

  desenharLista();
}
