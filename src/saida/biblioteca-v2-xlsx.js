// Preenche cópias integrais dos modelos .xlsx da Biblioteca PCM v2, editando só o XML das células.
// Fórmulas, estilos, imagens, validações, nomes definidos, tabelas e impressão continuam do original;
// ao ampliar um bloco, as linhas posteriores, referências, tabelas e áreas de impressão são deslocadas.
// Não usa a cópia simplificada do leitor (sem desenhos) nem DOM: roda no navegador e nos testes.
import JSZip from 'jszip';
import contrato from '../dados/biblioteca-pcm-v2.json';
import { DIAS_POR_PERIODICIDADE } from '../logica/biblioteca-v2-dados.js';

// Caracteres de controle (ex.: \v colado do Excel) são proibidos em XML 1.0 e invalidariam o arquivo: são retirados.
const semControle = (s) => [...String(s)].filter((c) => c >= ' ' || c === '\t' || c === '\n' || c === '\r').join('');
const escXml = (s) => semControle(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const numCol = (l) => l.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
const letraCol = (n) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const serialData = (iso) => (Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000;

// Referência A1 com aba opcional. Não casa nomes de função (LOG10() nem tabelas estruturadas.
const REF = /(?<![\w.$À-ſ])((?:'(?:[^']|'')+'|[A-Za-z_À-ſ][\w.À-ſ]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![\w(À-ſ])/g;
const foraDeAspas = (texto, fn) => texto.split(/("(?:[^"]|"")*")/).map((p, i) => (i % 2 ? p : fn(p))).join('');
const nomeDaAba = (prefixo) => (prefixo ? prefixo.slice(0, -1).replace(/^'|'$/g, '').replace(/''/g, "'") : null);

/** Desloca linhas/colunas relativas (sem $), como ao copiar uma fórmula. */
export function deslocarFormula(texto, dLinha, dCol = 0) {
  return foraDeAspas(texto, (p) => p.replace(REF, (_, pre = '', c1, l1, r1, n1, c2, l2, r2, n2) => {
    const um = (cAbs, letra, rAbs, n) => `${cAbs}${cAbs ? letra : letraCol(numCol(letra) + dCol)}${rAbs}${rAbs ? n : Number(n) + dLinha}`;
    return pre + um(c1, l1, r1, n1) + (n2 ? `:${um(c2, l2, r2, n2)}` : '');
  }));
}

/** Inserção de k linhas depois da linha R da aba `alvo`: move o que está abaixo e amplia intervalos que terminam em R ou depois. */
export function moverReferencias(texto, alvo, propria, R, k) {
  return foraDeAspas(texto, (p) => p.replace(REF, (todo, pre, c1, l1, r1, n1, c2, l2, r2, n2) => {
    const aba = nomeDaAba(pre);
    if (aba ? aba !== alvo : !propria) return todo;
    const a = Number(n1), b = n2 ? Number(n2) : null;
    if (b === null) return a > R ? `${pre ?? ''}${c1}${l1}${r1}${a + k}` : todo;
    const na = a > R ? a + k : a, nb = b >= R ? b + k : b;
    return `${pre ?? ''}${c1}${l1}${r1}${na}:${c2}${l2}${r2}${nb}`;
  }));
}

const LINHA = /<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g;
const CELULA = /<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g;
const numLinha = (xml) => Number(/\br="(\d+)"/.exec(xml)[1]);

function partesDaAba(xml) {
  const ini = xml.indexOf('<sheetData');
  const abre = xml.indexOf('>', ini) + 1;
  if (xml[abre - 2] === '/') return { antes: xml.slice(0, ini) + '<sheetData>', linhas: [], depois: '</sheetData>' + xml.slice(abre) };
  const fim = xml.indexOf('</sheetData>');
  return { antes: xml.slice(0, abre), linhas: xml.slice(abre, fim).match(LINHA) ?? [], depois: xml.slice(fim) };
}

function renumerar(linhaXml, nova) {
  return linhaXml.replace(/^<row\b([^>]*?)\br="\d+"/, `<row$1r="${nova}"`).replace(/(<c\b[^>]*?\br=")([A-Z]+)\d+"/g, `$1$2${nova}"`);
}

/** Troca fórmulas compartilhadas por fórmulas explícitas, para poder clonar e mover linhas com segurança. */
export function expandirCompartilhadas(xml) {
  const mestres = new Map();
  for (const [, ref, corpo] of xml.matchAll(/<c\b[^>]*?\br="([A-Z]+\d+)"[^>]*?(?<!\/)>([\s\S]*?)<\/c>/g)) {
    const m = /<f\b[^>]*\bt="shared"[^>]*\bsi="(\d+)"[^>]*>([\s\S]*?)<\/f>/.exec(corpo);
    if (m && m[2]) mestres.set(m[1], { ref, texto: m[2] });
  }
  return xml.replace(/<c\b([^>]*?)\br="([A-Z]+)(\d+)"([^>]*?)(?<!\/)>([\s\S]*?)<\/c>/g, (todo, a, col, lin, b, corpo) => {
    const m = /<f\b[^>]*\bt="shared"[^>]*\bsi="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/f>)/.exec(corpo);
    if (!m) return todo;
    const mestre = mestres.get(m[1]);
    if (!mestre) throw new Error('Fórmula compartilhada sem origem no modelo.');
    const [, mc, ml] = /^([A-Z]+)(\d+)$/.exec(mestre.ref);
    const texto = m[2] ? m[2] : deslocarFormula(mestre.texto, Number(lin) - Number(ml), numCol(col) - numCol(mc));
    return `<c${a}r="${col}${lin}"${b}>${corpo.replace(m[0], `<f>${texto}</f>`)}</c>`;
  });
}

/** Pacote aberto: abas por nome, workbook, tabelas por aba e demais partes intactas. */
async function abrirPacote(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const ler = (n) => zip.file(n).async('string');
  const workbook = await ler('xl/workbook.xml');
  const rels = await ler('xl/_rels/workbook.xml.rels');
  const abas = new Map();
  for (const [, nome, rid] of workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g)) {
    // A ordem dos atributos varia conforme a ferramenta que gerou o modelo.
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`));
    const alvo = 'xl/' + /Target="([^"]+)"/.exec(rel)[1].replace(/^\/?xl\//, '');
    const relsAba = zip.file(alvo.replace('worksheets/', 'worksheets/_rels/') + '.rels');
    const tabelas = relsAba ? [...(await relsAba.async('string')).matchAll(/Target="([^"]*tables\/[^"]+)"/g)].map((m) => 'xl/tables/' + m[1].split('/').pop()) : [];
    abas.set(nome.replace(/&amp;/g, '&'), { arquivo: alvo, xml: await ler(alvo), tabelas });
  }
  const tabelas = new Map();
  for (const n of Object.keys(zip.files).filter((f) => /^xl\/tables\/[^/]+\.xml$/.test(f))) tabelas.set(n, await ler(n));
  return { zip, workbook, abas, tabelas };
}

// Abertura de elemento com conteúdo (exclui <f .../> das fórmulas compartilhadas filhas).
const FORMULAS = /(<(f|formula|formula1|formula2)(?:\s[^>]*?)?(?<!\/)>)([\s\S]*?)(<\/\2>)/g;

// `ate`: última coluna da tabela quando a mesma linha tem outros quadros à direita (eles não são copiados nem reestilizados).
function inserirLinhas(pacote, alvo, R, k, ate = null) {
  if (k <= 0) return;
  const naTabela = (c) => !ate || numCol(/\br="([A-Z]+)\d+"/.exec(c)[1]) <= numCol(ate);
  const aba = pacote.abas.get(alvo);
  // 1) Referências primeiro (todas as abas, nomes, tabelas); 2) depois as linhas, clonando a linha modelo já ajustada.
  const mover = (t, propria) => moverReferencias(t, alvo, propria, R, k);
  for (const [nome, outra] of pacote.abas) outra.xml = outra.xml.replace(FORMULAS, (_, a, _t, texto, b) => a + mover(texto, nome === alvo) + b);
  // Mesclagens à direita da tabela (colunas depois de `ate`): as que terminam em R não esticam; as que passam de R
  // acompanham as células de baixo (que descem k linhas), para o quadro não se partir.
  const aDireita = (r) => ate && numCol(/^\$?([A-Z]+)/.exec(r)[1]) > numCol(ate);
  const fixo = (r) => r.replace(/^(\$?[A-Z]+\$?)(\d+)(:\$?[A-Z]+\$?)(\d+)$/, (t, c1, a, c2, b) =>
    `${c1}${Number(a) > R ? Number(a) + k : a}${c2}${Number(b) > R ? Number(b) + k : b}`);
  aba.xml = aba.xml.replace(/(<mergeCell\b[^>]*\bref=")([^"]+)"/g, (_, a, r) => `${a}${aDireita(r) ? fixo(r) : mover(r, true)}"`)
    .replace(/(<(?:dimension|hyperlink)\b[^>]*\bref=")([^"]+)"/g, (_, a, r) => `${a}${mover(r, true)}"`)
    .replace(/(<(?:dataValidation|conditionalFormatting)\b[^>]*\bsqref=")([^"]+)"/g, (_, a, r) => `${a}${mover(r, true)}"`);
  pacote.workbook = pacote.workbook.replace(/(<definedName\b[^>]*>)([^<]*)(<\/definedName>)/g, (_, a, t, b) => a + mover(t, false) + b);
  for (const t of aba.tabelas) pacote.tabelas.set(t, pacote.tabelas.get(t).replace(/(<(?:table|autoFilter)\b[^>]*\bref=")([^"]+)"/g, (_, a, r) => `${a}${mover(r, true)}"`));

  const { antes, linhas, depois } = partesDaAba(aba.xml);
  const modelo = linhas.find((l) => numLinha(l) === R);
  if (!modelo) throw new Error(`Linha modelo ${R} não encontrada em ${alvo}.`);
  // A última linha do bloco costuma ter a borda de fechamento: as linhas do meio usam o estilo da penúltima,
  // e só a nova última linha fica com o estilo de fechamento.
  const estilos = (l) => new Map([...(l?.match(CELULA) ?? [])].map((c) => [/\br="([A-Z]+)\d+"/.exec(c)[1], /^<c\b[^>]*?\bs="(\d+)"/.exec(c)?.[1]]));
  const doMeio = estilos(linhas.find((l) => numLinha(l) === R - 1));
  const comEstiloDoMeio = (l) => (doMeio.size ? l.replace(/<c\b[^>]*?>|<c\b[^>]*?\/>/g, (c) => {
    const s = naTabela(c) && doMeio.get(/\br="([A-Z]+)\d+"/.exec(c)?.[1]);
    return s ? c.replace(/\bs="\d+"/, `s="${s}"`) : c;
  }) : l);
  const daTabela = ate ? modelo.replace(CELULA, (c) => (naTabela(c) ? c : '')).replace(/\sspans="[^"]*"/, '') : modelo;
  const novas = [];
  for (const l of linhas) {
    const n = numLinha(l);
    novas.push(n > R ? renumerar(l, n + k) : n === R ? comEstiloDoMeio(l) : l);
    if (n === R) {
      for (let i = 1; i <= k; i++) {
        const clone = renumerar(daTabela, R + i).replace(/<f>([\s\S]*?)<\/f>/g, (_, t) => `<f>${deslocarFormula(t, i)}</f>`);
        novas.push(i < k ? comEstiloDoMeio(clone) : clone);
      }
    }
  }
  aba.xml = antes + novas.join('') + depois;
}

/** Grava vários valores de uma aba numa passada, mantendo o estilo de cada célula. null apaga o conteúdo. */
function escrever(pacote, nomeAba, valores) {
  const aba = pacote.abas.get(nomeAba);
  const { antes, linhas, depois } = partesDaAba(aba.xml);
  const porLinha = new Map(linhas.map((l) => [numLinha(l), l.replace(/^<row\b([^>]*?)\/>$/, '<row$1></row>')]));
  for (const [ref, entrada] of valores) {
    let valor = entrada;
    const [, col, lin] = /^([A-Z]+)(\d+)$/.exec(ref);
    let linha = porLinha.get(Number(lin)) ?? `<row r="${lin}"></row>`;
    const celulas = linha.match(CELULA) ?? [];
    const atual = celulas.find((c) => c.startsWith(`<c r="${ref}"`) || new RegExp(`^<c\\b[^>]*\\br="${ref}"`).test(c));
    let estilo = atual ? (/^<c\b[^>]*?\bs="(\d+)"/.exec(atual)?.[1] ?? null) : null;
    // { valor, estilos: { atual: novo } } troca o estilo por um equivalente do próprio modelo (ex.: data sem hora).
    if (valor && typeof valor === 'object') { estilo = valor.estilos?.[estilo] ?? estilo; valor = valor.valor; }
    const s = estilo === null ? '' : ` s="${estilo}"`;
    let nova;
    if (valor === null || valor === undefined || valor === '') nova = `<c r="${ref}"${s}/>`;
    else if (typeof valor === 'number') {
      if (!Number.isFinite(valor)) throw new Error('Valor numérico inválido.');
      nova = `<c r="${ref}"${s}><v>${valor}</v></c>`;
    } else nova = `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escXml(valor)}</t></is></c>`;
    if (atual) linha = linha.replace(atual, () => nova);
    else {
      const depoisDe = celulas.find((c) => numCol(/\br="([A-Z]+)\d+"/.exec(c)[1]) > numCol(col));
      linha = depoisDe ? linha.replace(depoisDe, () => nova + depoisDe) : linha.replace('</row>', () => nova + '</row>');
    }
    porLinha.set(Number(lin), linha);
  }
  aba.xml = antes + [...porLinha.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l).join('') + depois;
}

async function fecharPacote(pacote) {
  for (const aba of pacote.abas.values()) {
    // Sem resultados antigos nas fórmulas: Excel e LibreOffice recalculam ao abrir.
    const xml = aba.xml.replace(/<c\b([^>]*?)(?<!\/)>([\s\S]*?)<\/c>/g, (todo, a, corpo) => (/<f[\s>/]/.test(corpo)
      ? `<c${a.replace(/\st="(?:str|n|b|e)"/, '')}>${corpo.replace(/<v\b[^>]*\/>|<v\b[^>]*>[\s\S]*?<\/v>/, '')}</c>` : todo));
    pacote.zip.file(aba.arquivo, xml);
  }
  for (const [n, t] of pacote.tabelas) pacote.zip.file(n, t);
  let wb = pacote.workbook;
  wb = /<calcPr\b/.test(wb) ? wb.replace(/<calcPr\b([^>]*?)\/?>/, (_, a) => `<calcPr${a.replace(/\s(?:fullCalcOnLoad|forceFullCalc)="[^"]*"/g, '')} fullCalcOnLoad="1" forceFullCalc="1"/>`)
    : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
  pacote.zip.file('xl/workbook.xml', wb);
  return pacote.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

async function conferirOriginal(bytes, codigo) {
  const modelo = contrato.modelos.find((m) => m.codigo === codigo);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
  if (hash !== modelo.sha256) throw new Error(`Modelo ${codigo} diferente do esperado por esta versão do app. Recarregue o aplicativo; seus dados não foram alterados.`);
}

/** Preenche uma tabela de linhas 5..`ultima` (modelo), ampliando antes se faltar espaço. `linhas`: [{A: v, B: v, ...}]. */
function preencherTabela(p, aba, ultima, linhas) {
  inserirLinhas(p, aba, ultima, linhas.length - (ultima - 4));
  escrever(p, aba, linhas.flatMap((l, i) => Object.entries(l).map(([col, v]) => [`${col}${5 + i}`, v ?? null])));
}

/**
 * PCM-MAN-001: Leia-me (elaborado/aprovado), Documentos, Revisões de documentos e pessoas (Cadastros).
 * @param dados resultado de dadosPcmMan001 (src/logica/biblioteca-v2-dados.js)
 */
export async function preencherPcmMan001(bytes, dados) {
  await conferirOriginal(bytes, 'PCM-MAN-001');
  const p = await abrirPacote(bytes);
  const data = (iso) => (iso ? serialData(iso) : null);
  preencherTabela(p, 'Documentos', 29, dados.documentos.map((d) => ({ A: d.codigo, B: d.titulo, C: d.tipo, D: d.responsavel, E: d.status,
    F: data(d.validade), G: d.revisao, H: data(d.data), I: d.aprovado, J: d.observacoes })));
  preencherTabela(p, 'Revisões de documentos', 29, dados.revisoes.map((r) => ({ A: r.codigo, B: r.revisao, C: data(r.data), D: r.descricao, E: r.elaborado, F: r.aprovado })));
  preencherTabela(p, 'Cadastros', 29, dados.pessoas.map((x) => ({ A: x.nome, B: x.funcao || null, C: x.especialidade || null, D: x.ativo || null })));
  preencherTabela(p, 'Referências', 29, dados.referencias.map((q) => ({ A: q.referencia, B: q.versao || null, C: data(q.data), D: q.fonte || null, E: q.situacao })));
  const o = dados.organizacao;
  // Nomes definidos do modelo: organizacao (A4), referencial (A6), meta_disponibilidade (A8) e meta_aderencia (D8).
  escrever(p, 'Organização', [['A4', o.nome || null], ['A6', o.referencial || null], ['A8', o.metaDisponibilidade ?? null], ['D8', o.metaAderencia ?? null]]);
  escrever(p, 'Leia-me', [['D13', dados.elaborado || null], ['D14', dados.aprovado || null]]);
  return fecharPacote(p);
}

// Data com hora opcional (AAAA-MM-DD[THH:MM:SS]) → número de série do Excel.
const serialDataHora = (v) => (v ? serialData(v.slice(0, 10)) + (v.length > 10 ? (Date.parse(`1970-01-01T${v.slice(11, 19)}Z`) / 86400000) : 0) : null);

// Padrão dos Cadastros (desde 01/11/2026 em todos os modelos com essas tabelas): famílias em H e setores em J.
function cadastrosLadoALado(p, dados, setoresEmH = false) {
  const maior = Math.max(dados.ativos.length, dados.pessoas.length, dados.familias.length, dados.setores.length);
  inserirLinhas(p, 'Cadastros', 29, maior - 25);
  const cad = [];
  dados.ativos.forEach((a, i) => ['tag', 'descricao', 'familia', 'setor'].forEach((c, j) => cad.push([`${'ABCD'[j]}${5 + i}`, a[c] || null])));
  dados.pessoas.forEach((n, i) => cad.push([`F${5 + i}`, n]));
  dados.familias.forEach((n, i) => cad.push([`${setoresEmH ? 'J' : 'H'}${5 + i}`, n]));
  dados.setores.forEach((n, i) => cad.push([`${setoresEmH ? 'H' : 'J'}${5 + i}`, n]));
  escrever(p, 'Cadastros', cad);
}

// Tabelas de cadastro conhecidas e o campo de dados que preenche cada coluna.
const CADASTROS = { tb_pcm_ativos: 'ativos', tb_pcm_pessoas: 'pessoas', tb_pcm_familias: 'familias', tb_pcm_setores: 'setores' };
const COLUNA_ATIVO = { tag: 'tag', descricao_ativo: 'descricao', familia: 'familia', setor: 'setor' };

/**
 * Qualquer modelo .xlsx da Biblioteca v2: preenche só o Leia-me (elaborado/aprovado) e as tabelas de cadastro
 * (ativos, pessoas, famílias, setores) que o modelo tiver, nas posições do manifesto. Deixa o modelo pronto para as
 * listas ▼, sem inventar registros. @param dados resultado de dadosCadastrosV2 (src/logica/biblioteca-v2-dados.js)
 */
export async function preencherCadastrosV2(bytes, codigo, dados) {
  await conferirOriginal(bytes, codigo);
  const p = await abrirPacote(bytes);
  const modelo = contrato.modelos.find((m) => m.codigo === codigo);
  const tabelas = modelo.abas.flatMap((a) => a.tabelas.filter((t) => CADASTROS[t.nome]).map((t) => ({ ...t, aba: a.nome })));
  for (const aba of new Set(tabelas.map((t) => t.aba))) {
    const daAba = tabelas.filter((t) => t.aba === aba);
    const fim = Number(/(\d+)$/.exec(daAba[0].intervalo)[1]);
    // Só amplia quando todas as tabelas da aba terminam na mesma linha (padrão dos modelos); senão, não cabe com segurança.
    if (daAba.some((t) => Number(/(\d+)$/.exec(t.intervalo)[1]) !== fim)) throw new Error(`Cadastros de ${codigo} com tabelas desalinhadas.`);
    p.abas.get(aba).xml = expandirCompartilhadas(p.abas.get(aba).xml);
    const maior = Math.max(...daAba.map((t) => dados[CADASTROS[t.nome]].length));
    inserirLinhas(p, aba, fim, maior - (fim - daAba[0].linhaDados + 1));
    const valores = [];
    for (const t of daAba) {
      const [, col0] = /^([A-Z]+)/.exec(t.intervalo);
      dados[CADASTROS[t.nome]].forEach((item, i) => t.campos.forEach((campo, j) => {
        const v = typeof item === 'string' ? (j === 0 ? item : null) : item[COLUNA_ATIVO[campo] ?? campo];
        valores.push([`${letraCol(numCol(col0) + j)}${t.linhaDados + i}`, v || null]);
      }));
    }
    escrever(p, aba, valores);
  }
  escrever(p, 'Leia-me', [['D13', dados.elaborado || null], ['D14', dados.aprovado || null]]);
  return fecharPacote(p);
}

/**
 * PCM-MAN-004: Leia-me (elaborado/aprovado), Ordens de Serviço e Cadastros. A ficha "Ordem de serviço" fica para a equipe.
 * @param dados resultado de dadosPcmMan004 (src/logica/biblioteca-v2-dados.js)
 */
export async function preencherPcmMan004(bytes, dados) {
  await conferirOriginal(bytes, 'PCM-MAN-004');
  const p = await abrirPacote(bytes);
  for (const nome of ['Ordens de Serviço', 'Cadastros']) p.abas.get(nome).xml = expandirCompartilhadas(p.abas.get(nome).xml);
  cadastrosLadoALado(p, dados);
  const data = (iso) => (iso ? serialData(iso) : null);
  preencherTabela(p, 'Ordens de Serviço', 29, dados.ordens.map((o) => ({ A: o.numero, B: o.tag, D: o.atividade || null, E: o.tipo || null,
    F: o.prioridade || null, G: o.status || null, H: o.responsavel || null, I: data(o.abertura), J: data(o.prazo), K: data(o.conclusao),
    L: o.estimadas, M: o.restantes, N: o.observacao || null })));
  escrever(p, 'Leia-me', [['D13', dados.elaborado || null], ['D14', dados.aprovado || null]]);
  return fecharPacote(p);
}

/**
 * PCM-MAN-008: Leia-me (elaborado/aprovado), Registro de falhas e Cadastros. Ficha de falha e Pareto ficam para a equipe.
 * @param dados resultado de dadosPcmMan008 (src/logica/biblioteca-v2-dados.js)
 */
export async function preencherPcmMan008(bytes, dados) {
  await conferirOriginal(bytes, 'PCM-MAN-008');
  const p = await abrirPacote(bytes);
  cadastrosLadoALado(p, dados);
  // Falha do app sem hora: usa os estilos dd/mm/aaaa do próprio modelo (145 e 147, mesmas bordas de 81 e 89)
  // para não exibir "00:00".
  const SO_DATA = { 81: '145', 89: '147' };
  const quando = (v) => (v && v.length === 10 ? { valor: serialData(v), estilos: SO_DATA } : serialDataHora(v));
  preencherTabela(p, 'Registro de falhas', 29, dados.falhas.map((f) => ({ A: f.referencia, B: f.tag, D: f.os || null, E: f.descricao || null,
    F: f.causa || null, G: f.acao || null, H: quando(f.inicio), I: quando(f.fim), J: serialDataHora(f.inicioReparo), K: serialDataHora(f.fimReparo),
    L: f.peca || null, M: f.responsavel || null })));
  escrever(p, 'Leia-me', [['D13', dados.elaborado || null], ['D14', dados.aprovado || null]]);
  return fecharPacote(p);
}

/**
 * PCM-MAN-002: Leia-me (elaborado/aprovado), Cadastros, Criticidade (notas), Plano ("Outras atividades") e Cronograma.
 * Classe, matriz e MFMEA são calculadas ou preenchidas na própria planilha.
 * @param dados resultado de dadosPcmMan002 (src/logica/biblioteca-v2-dados.js)
 */
export async function preencherPcmMan002(bytes, dados) {
  await conferirOriginal(bytes, 'PCM-MAN-002');
  const p = await abrirPacote(bytes);
  for (const nome of ['Criticidade', 'Plano', 'Cronograma', 'Cadastros']) p.abas.get(nome).xml = expandirCompartilhadas(p.abas.get(nome).xml);

  // Cadastros: quatro tabelas lado a lado nas linhas 5 a 29 (25 linhas).
  cadastrosLadoALado(p, dados);

  // Criticidade: linhas 8 a 27 (20 ativos); Nº em A, TAG em B, S/Q/P em E a G e frequência em I.
  const criticidade = dados.criticidade ?? [];
  inserirLinhas(p, 'Criticidade', 27, criticidade.length - 20, 'K');
  escrever(p, 'Criticidade', criticidade.flatMap((c, i) => {
    const l = 8 + i;
    return [[`A${l}`, i + 1], [`B${l}`, c.tag], [`E${l}`, c.s ?? null], [`F${l}`, c.q ?? null], [`G${l}`, c.p ?? null], [`I${l}`, c.f ?? null]];
  }));

  // Plano: "Outras atividades" nas linhas 21 a 30; o Cronograma espelha o Plano nas linhas 8 a 33.
  const extra = dados.atividades.length - 10;
  inserirLinhas(p, 'Plano', 30, extra);
  inserirLinhas(p, 'Cronograma', 33, extra);
  // Colunas do Plano: G "A cada (dias)" é fórmula da Periodicidade (H). Periodicidade fora da lista do modelo:
  // grava os dias direto em G e deixa H vazia.
  escrever(p, 'Plano', dados.atividades.flatMap((t, i) => {
    const l = 21 + i; const naLista = t.periodicidade in DIAS_POR_PERIODICIDADE;
    return [[`A${l}`, 16 + i], [`B${l}`, t.tag], [`E${l}`, t.atividade], ...(naLista ? [[`H${l}`, t.periodicidade]] : [[`G${l}`, t.dias]]),
      [`I${l}`, t.responsavel || null], [`J${l}`, t.duracao], [`L${l}`, t.primeira ? serialData(t.primeira) : null]];
  }));
  if (dados.ano) escrever(p, 'Cronograma', [['A4', dados.ano]]);
  escrever(p, 'Leia-me', [['D13', dados.elaborado || null], ['D14', dados.aprovado || null]]);
  return fecharPacote(p);
}

/**
 * PCM-MAN-011: um ativo, 12 meses (linhas 8 a 19), metas no cabeçalho e pessoas nos Cadastros. As fórmulas do modelo
 * calculam MTBF, MTTR, disponibilidade e cumprimento. @param dados resultado de dadosPcmMan011 (biblioteca-v2-dados.js)
 */
export async function preencherPcmMan011(bytes, dados) {
  await conferirOriginal(bytes, 'PCM-MAN-011');
  const p = await abrirPacote(bytes);
  const v = (n) => (Number.isFinite(n) ? n : null);
  escrever(p, 'Indicadores', [['A4', dados.ativo], ['D4', serialData(`${dados.ano}-01-01`)], ['F4', v(dados.metaDisponibilidade)], ['H4', v(dados.metaCumprimento)],
    ...dados.meses.flatMap((m, i) => (m.aberto ? [] : [['B', m.horasProgramadas], ['C', m.horasOperacao], ['D', m.falhas], ['E', m.horasReparo],
      ['F', m.pmPlanejadas], ['G', m.pmFeitas], ['H', m.horasCorretiva], ['I', m.horasPreventiva]].map(([c, x]) => [`${c}${8 + i}`, v(x)])))]);
  preencherTabela(p, 'Cadastros', 29, dados.pessoas.map((n) => ({ A: n })));
  escrever(p, 'Leia-me', [['D13', dados.elaborado || null]]);
  return fecharPacote(p);
}
