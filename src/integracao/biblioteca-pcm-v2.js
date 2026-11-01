// Leitura e prévia apenas: não grava dados, não calcula indicadores e não altera o catálogo antigo.
import contrato from '../dados/biblioteca-pcm-v2.json';
import JSZip from 'jszip';

const numeros = new Set(['horas_estimadas', 'horas_restantes', 'valor_realizado']);
const datas = new Set(['data_abertura', 'data_prevista', 'data_conclusao', 'data_lancamento']);
const horarios = new Set(['inicio_falha', 'fim_falha', 'inicio_reparo', 'fim_reparo']);
const vazio = valor => valor === '' || valor === null || valor === undefined;
// Colunas acrescentadas aos modelos 004 (observacao) e 008 (peca, responsavel) em 01/11/2026.
const CAMPOS_NOVOS_OPCIONAIS = ['observacao', 'peca', 'responsavel'];
const dataValida = texto => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?$/.exec(texto);
  if (!m) return false;
  const d = new Date(0); d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); d.setUTCHours(+(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0), 0);
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() + 1 === +m[2] && d.getUTCDate() === +m[3] &&
    d.getUTCHours() === +(m[4] ?? 0) && d.getUTCMinutes() === +(m[5] ?? 0) && d.getUTCSeconds() === +(m[6] ?? 0);
};

export function modeloBibliotecaV2(codigo) {
  const modelo = contrato.modelos.find(m => m.codigo === codigo);
  if (!modelo) throw new Error('Código desconhecido na biblioteca PCM v2.');
  return modelo;
}

/** ExcelJS é recebido do importador existente; resultado é uma prévia sem persistência. */
export async function lerBibliotecaV2(buffer, codigo, ExcelJS) {
  const modelo = modeloBibliotecaV2(codigo);
  if (modelo.formato !== 'xlsx') throw new Error('Documento Word não é uma base de dados dos dashboards.');
  const wb = await abrirWorkbookBibliotecaV2(buffer, ExcelJS);
  return prepararPreviaBibliotecaV2(wb, codigo);
}

/** Cópia exclusivamente em memória para leitura. Nunca exportar esta cópia sem desenhos. */
export async function abrirWorkbookBibliotecaV2(buffer, ExcelJS) {
  const zip = await JSZip.loadAsync(buffer);
  zip.remove('xl/drawings');
  for (const file of Object.values(zip.files).filter(f => !f.dir && /^xl\/worksheets\/.*\.xml(?:\.rels)?$/.test(f.name))) {
    let xml = await file.async('string');
    xml = xml.replace(/<(?:\w+:)?(?:drawing|legacyDrawing|legacyDrawingHF)\b[^>]*\/\s*>/g, '');
    if (file.name.endsWith('.rels')) {
      // Somente relações de tabelas são necessárias nesta cópia de leitura. Comentários
      // e VML dos modelos também usam partes que o ExcelJS não consegue reconciliar.
      xml = xml.replace(/<(?:\w+:)?Relationship\b[^>]*\/\s*>/g, tag => /\bType=["'][^"']*\/table["']/.test(tag) ? tag : '');
      xml = xml.replace(/\bTarget=(["'])\/xl\/tables\//g, 'Target=$1../tables/');
    } else xml = xml.replace(/<(?:\w+:)?hyperlinks\b[^>]*>[\s\S]*?<\/(?:\w+:)?hyperlinks\s*>/g, '');
    zip.file(file.name, xml);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await zip.generateAsync({type: 'arraybuffer'}));
  return wb;
}

/** Recebe workbook já aberto, permitindo composição pelo aplicativo sem reler o arquivo. */
export function prepararPreviaBibliotecaV2(wb, codigo) {
  const modelo = modeloBibliotecaV2(codigo);
  const bases = {}, linhas = {}, erros = [], avisos = [];
  // estrutura = true impede qualquer importação do arquivo; os demais erros recusam só a linha.
  const erro = (base, linha, campo, mensagem, estrutura = false) => erros.push({base, linha, campo, mensagem, ...(estrutura ? {estrutura} : {})});
  function valorCelula(cell, campo, base, linha) {
    let valor = cell.value;
    if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
      if ('formula' in valor || 'sharedFormula' in valor) {
        // Descrição derivada nunca identifica registros; não depender do cache de fórmulas.
        if (campo === 'equipamento') return null;
        erro(base, linha, campo, 'Fórmula em campo de entrada: confirme o valor de origem.'); return null;
      }
      if (valor.richText) valor = valor.richText.map(t => t.text).join('');
      else if ('text' in valor) valor = valor.text;
      else { erro(base, linha, campo, 'Conteúdo não suportado.'); return null; }
    }
    if (vazio(valor)) return null;
    if (numeros.has(campo)) {
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
        erro(base, linha, campo, 'Informe um número não negativo; vazio é diferente de zero.'); return null;
      }
      return valor;
    }
    if (datas.has(campo) || horarios.has(campo)) {
      if (typeof valor === 'number' && Number.isFinite(valor)) {
        const epoch = wb.properties.date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
        valor = new Date(epoch + Math.round(valor * 86400000));
      }
      if (valor instanceof Date && Number.isFinite(valor.getTime())) valor = valor.toISOString().slice(0, horarios.has(campo) ? 19 : 10);
      if (typeof valor !== 'string' || !dataValida(valor) || (horarios.has(campo) && valor.length !== 19) || (datas.has(campo) && valor.length !== 10)) {
        erro(base, linha, campo, 'Data inválida; use data real do Excel ou formato ISO.'); return null;
      }
      return valor;
    }
    if (typeof valor !== 'string') {
      erro(base, linha, campo, 'Referência deve ser texto para preservar zeros e códigos.'); return null;
    }
    return valor.trim();
  }
  for (const [base, fonte] of Object.entries(contrato.fontes).filter(([, f]) => f.codigo === codigo)) {
    const aba = modelo.abas.find(a => a.tabelas.some(t => t.nome === fonte.tabela));
    const esquema = aba.tabelas.find(t => t.nome === fonte.tabela);
    const sheet = wb.getWorksheet(aba.nome);
    const table = sheet?.getTable(fonte.tabela);
    bases[base] = []; linhas[base] = [];
    if (!table) { erro(base, null, null, 'Tabela esperada não encontrada: ' + fonte.tabela, true); continue; }
    const ref = table.table.tableRef ?? table.table.ref;
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(ref ?? '');
    if (!match) { erro(base, null, null, 'Intervalo da tabela inválido.', true); continue; }
    const header = sheet.getCell(match[1] + match[2]);
    const start = header.col, rowHeader = +match[2], end = +match[4];
    const fields = table.table.columns.map(c => c.name);
    // Planilhas do modelo anterior (sem as colunas acrescentadas em 01/11/2026) continuam aceitas; elas ficam vazias.
    const faltam = esquema.campos.filter(f => !fields.includes(f));
    if (new Set(fields).size !== fields.length || fields.some(f => !esquema.campos.includes(f)) || faltam.some(f => !CAMPOS_NOVOS_OPCIONAIS.includes(f))) {
      erro(base, rowHeader, null, 'Campos incompatíveis com a biblioteca v2.', true); continue;
    }
    const chaves = new Set();
    for (let row = rowHeader + 1; row <= end; row++) {
      const entrada = fields.map((f, i) => ({f, cell: sheet.getCell(row, start + i)}));
      if (!entrada.some(({f, cell}) => f !== 'equipamento' && !vazio(cell.value))) continue;
      const record = Object.fromEntries(faltam.map(f => [f, null]));
      for (const {f, cell} of entrada) record[f] = valorCelula(cell, f, base, row);
      const key = fonte.chave.map(f => record[f]);
      if (key.some(vazio)) erro(base, row, fonte.chave.join(', '), 'Chave obrigatória ausente.');
      else if (chaves.has(JSON.stringify(key))) erro(base, row, fonte.chave.join(', '), 'Chave duplicada.');
      else chaves.add(JSON.stringify(key));
      bases[base].push(record); linhas[base].push(row);
    }
  }
  if (!Object.keys(bases).length) avisos.push('Este modelo não possui leitor operacional nesta etapa. Grades, formulários e consolidados exigem adaptação específica.');
  for (const o of bases.ordens_servico ?? []) {
    for (const [campo, permitidos] of Object.entries({tipo_manutencao: ['PREVENTIVA', 'CORRETIVA', 'PREDITIVA', 'INSPECAO'], prioridade: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'], status: ['ABERTA', 'PLANEJADA', 'PROGRAMADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA']})) {
      if (campo === 'prioridade' && vazio(o.prioridade) && o.tipo_manutencao === 'PREVENTIVA') continue; // vazia só em preventiva
      if (!permitidos.includes(o[campo])) erro('ordens_servico', null, campo, 'Código fora da lista padronizada.');
    }
    if (!o.tag || !o.status || !o.data_abertura) erro('ordens_servico', null, 'tag/status/data_abertura', 'OS incompleta.');
    if (o.data_conclusao && o.data_abertura && o.data_conclusao < o.data_abertura) erro('ordens_servico', null, 'data_conclusao', 'Conclusão anterior à abertura.');
    if (o.status === 'CONCLUIDA' && !o.data_conclusao) erro('ordens_servico', null, 'data_conclusao', 'OS concluída sem data de conclusão.');
    if (o.horas_restantes === null) avisos.push('OS sem horas restantes: backlog em horas pode ficar incompleto.');
  }
  for (const f of bases.falhas ?? []) {
    if (!f.tag || !f.inicio_falha) erro('falhas', null, 'tag/inicio_falha', 'Falha sem TAG ou início.');
    for (const [ini, fim] of [['inicio_falha', 'fim_falha'], ['inicio_reparo', 'fim_reparo']]) {
      if (f[fim] && (!f[ini] || f[fim] < f[ini])) erro('falhas', null, fim, 'Intervalo inválido.');
    }
    if ((f.inicio_reparo && f.inicio_falha && f.inicio_reparo < f.inicio_falha) || (f.fim_reparo && f.fim_falha && f.fim_reparo > f.fim_falha)) erro('falhas', null, 'inicio_reparo/fim_reparo', 'Reparo fora do intervalo de indisponibilidade.');
  }
  for (const custo of bases.custos_manutencao ?? []) {
    if (!['MATERIAL', 'MAO_OBRA', 'TERCEIROS', 'OUTROS'].includes(custo.categoria_custo)) erro('custos_manutencao', null, 'categoria_custo', 'Código fora da lista padronizada.');
    if (!custo.data_lancamento || !custo.setor || !custo.categoria_custo || custo.valor_realizado === null) erro('custos_manutencao', null, null, 'Lançamento de custo incompleto.');
  }
  avisos.push('Prévia sem gravação: conferir referências cruzadas e conflitos com a base atual antes de importar.');
  return {versao: contrato.versao, codigo, bases, linhas, erros, avisos: [...new Set(avisos)], apto: erros.length === 0 && Object.keys(bases).length > 0};
}

const CATEGORIAS_GRADE = ['MATERIAL', 'MAO_OBRA', 'TERCEIROS', 'OUTROS']; // linhas 8 a 11 da grade

/**
 * Grade "Orçamento anual" do 012: ano em A4, setor em B4, categorias nas linhas 8–11 e meses em B–M.
 * O setor escolhido em B4 é só um filtro do modelo e não prova a quem o orçamento pertence;
 * por isso a grade só é aceita como orçamento geral da fábrica (B4 vazio).
 */
export function lerOrcamentoAnualV2(wb) {
  const sheet = wb.getWorksheet('Orçamento anual');
  if (!sheet) return {linhas: [], erros: [{mensagem: 'Aba Orçamento anual não encontrada.'}], avisos: []};
  const texto = v => (v && typeof v === 'object' && v.richText ? v.richText.map(t => t.text).join('') : v);
  const conferir = [['A7', 'Categoria'], ['B7', 'Jan'], ['M7', 'Dez'], ['A8', 'Material'], ['A11', 'Outros']];
  if (conferir.some(([c, t]) => String(texto(sheet.getCell(c).value) ?? '').trim() !== t)) {
    return {linhas: [], erros: [{mensagem: 'A grade Orçamento anual foi alterada; não é possível ler o orçamento.'}], avisos: []};
  }
  const linhas = [], erros = [];
  for (let i = 0; i < 4; i++) {
    for (let m = 0; m < 12; m++) {
      const cell = sheet.getCell(8 + i, 2 + m);
      let v = cell.value;
      if (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)) { erros.push({mensagem: `Fórmula em ${cell.address}: informe o valor orçado.`}); continue; }
      if (vazio(v)) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) { erros.push({mensagem: `Valor inválido em ${cell.address}: use número não negativo.`}); continue; }
      linhas.push({mes: m + 1, categoria_custo: CATEGORIAS_GRADE[i], valor_orcado: v, celula: cell.address});
    }
  }
  if (!linhas.length && !erros.length) return {linhas: [], erros: [], avisos: []};
  // O modelo aceita ano numérico ou texto; vazio usaria o ano corrente no Excel, o que aqui não se presume.
  const bruto = texto(sheet.getCell('A4').value);
  const ano = typeof bruto === 'string' && /^\s*\d{4}\s*$/.test(bruto) ? Number(bruto) : bruto;
  const setor = texto(sheet.getCell('B4').value);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) erros.push({mensagem: 'Informe o ano do orçamento em A4 (ex.: 2026).'});
  if (!vazio(setor) && String(setor).trim()) {
    erros.push({mensagem: `A grade está com o setor "${String(setor).trim()}" escolhido em B4. O modelo não informa se o orçamento é desse setor; deixe B4 vazio para importar como orçamento geral da fábrica.`});
  }
  return {
    linhas: erros.length ? [] : linhas.map(l => ({competencia: `${ano}-${String(l.mes).padStart(2, '0')}`, setor: null, categoria_custo: l.categoria_custo, valor_orcado: l.valor_orcado, celula: l.celula})),
    erros, avisos: [],
  };
}
