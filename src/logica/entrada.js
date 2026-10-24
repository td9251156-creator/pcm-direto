// Leitura de dados colados do Excel ou importados de CSV.
// Colunas esperadas, nesta ordem: setor, tipo, descricao, fabricante, modelo
import { chave } from './texto.js';
import { normalizarSetor } from './tag.js';
import { resolverTipo } from './validacao.js';

export const COLUNAS = ['setor', 'tipo', 'descricao', 'fabricante', 'modelo'];

/** Descobre o separador olhando a primeira linha: tabulação (Excel), ponto e vírgula ou vírgula. */
export function detectarSeparador(linha) {
  const contagem = { '\t': 0, ';': 0, ',': 0 };
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    if (linha[i] === '"') {
      if (aspas && linha[i + 1] === '"') i++;
      else aspas = !aspas;
    } else if (!aspas && Object.hasOwn(contagem, linha[i])) contagem[linha[i]]++;
  }
  return Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0];
}

/** Quebra uma linha em células, respeitando aspas ("Motor, 5 cv"). */
export function quebrarLinha(linha, sep) {
  const celulas = [];
  let atual = '';
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (entreAspas && linha[i + 1] === '"') { atual += '"'; i++; } // aspas dobradas = aspas
      else entreAspas = !entreAspas;
    } else if (c === sep && !entreAspas) {
      celulas.push(atual.trim());
      atual = '';
    } else {
      atual += c;
    }
  }
  celulas.push(atual.trim());
  return celulas;
}

/** Cria um id único simples para cada equipamento. */
export function novoId() {
  return 'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Converte uma tabela (linhas e colunas) em lista de equipamentos.
 * Se houver uma linha de cabeçalho com "setor" e "tipo" (nas 5 primeiras linhas), as colunas são
 * achadas pelo nome, em qualquer ordem; as linhas acima dela são ignoradas. Sem cabeçalho, vale a
 * ordem padrão: setor, tipo, descrição, fabricante, modelo.
 * O tipo é reconhecido pelo nome ou sigla; se não for reconhecido, fica como veio
 * para a validação apontar o erro e sugerir a correção.
 */
export function lerMatriz(matriz, tipos) {
  const linhas = matriz.map((l) => l.map((c) => String(c ?? '').trim())).filter((l) => l.some((c) => c));
  if (!linhas.length) return [];

  let posicao = Object.fromEntries(COLUNAS.map((c, i) => [c, i]));
  let inicio = 0;
  const iCab = linhas.slice(0, 5).findIndex((l) => {
    const k = l.map(chave);
    return k.includes('setor') && k.includes('tipo');
  });
  if (iCab >= 0) {
    const k = linhas[iCab].map(chave);
    posicao = Object.fromEntries(COLUNAS.map((c) => [c, k.indexOf(c)]));
    inicio = iCab + 1;
  }
  const valor = (l, campo) => (posicao[campo] >= 0 ? l[posicao[campo]] ?? '' : '');

  return linhas.slice(inicio).map((l) => {
    const setorBruto = valor(l, 'setor');
    const setor = normalizarSetor(setorBruto);
    const tipo = valor(l, 'tipo');
    return {
      id: novoId(),
      // Se a correção do setor for só de forma (minúsculas/acentos), aplica direto
      setor: setor.length >= 2 ? setor : setorBruto,
      tipo: resolverTipo(tipo, tipos) ?? tipo,
      numero: null,
      descricao: valor(l, 'descricao'),
      fabricante: valor(l, 'fabricante'),
      modelo: valor(l, 'modelo'),
    };
  });
}

/** Converte o texto colado do Excel ou de um arquivo CSV em lista de equipamentos. */
export function lerTabela(texto, tipos) {
  texto = String(texto ?? '').replace(/^\uFEFF/, '');
  const linhas = [];
  let aspas = false;
  let inicio = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '"') {
      if (aspas && texto[i + 1] === '"') i++;
      else aspas = !aspas;
    } else if (!aspas && /[\r\n]/.test(texto[i])) {
      if (texto.slice(inicio, i).trim()) linhas.push(texto.slice(inicio, i));
      if (texto[i] === '\r' && texto[i + 1] === '\n') i++;
      inicio = i + 1;
    }
  }
  if (aspas) throw new Error('Há um campo com aspas sem fechamento. Confira o arquivo antes de importar.');
  if (texto.slice(inicio).trim()) linhas.push(texto.slice(inicio));
  if (!linhas.length) return [];
  const sep = detectarSeparador(linhas[0]);
  return lerMatriz(linhas.map((l) => quebrarLinha(l, sep)), tipos);
}

/**
 * Lê a primeira aba com equipamentos de um arquivo .xlsx (inclusive a planilha gerada pelo
 * próprio PCM Direto, aba Equipamentos). ExcelJS é passado de fora para carregar só quando preciso.
 */
export async function lerXlsx(buffer, tipos, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const abas = [wb.getWorksheet('Equipamentos'), ...wb.worksheets].filter(Boolean);
  const tabelas = [];
  for (const aba of abas) {
    const matriz = [];
    aba.eachRow({ includeEmpty: false }, (row) => {
      const l = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => { l[col - 1] = cell.text; });
      matriz.push(Array.from(l, (c) => c ?? ''));
    });
    tabelas.push(matriz);
  }
  // Primeiro procura uma tabela identificada; uma capa não deve esconder a aba correta.
  for (const matriz of tabelas) {
    const cabecalho = matriz.filter((l) => l.some((c) => c.trim())).slice(0, 5).some((l) => {
      const nomes = l.map(chave);
      return nomes.includes('setor') && nomes.includes('tipo');
    });
    if (cabecalho) {
      const lista = lerMatriz(matriz, tipos);
      if (lista.length) return lista;
    }
  }
  // Sem cabeçalho, mantém o formato documentado de setor, tipo e descrição.
  for (const matriz of tabelas) {
    if (!matriz.some((l) => /^[a-zA-Z0-9]{2,4}$/.test(l[0]?.trim() ?? '') && l[1]?.trim() && l[2]?.trim())) continue;
    const lista = lerMatriz(matriz, tipos);
    if (lista.length) return lista;
  }
  return [];
}

/** Gera CSV (separado por ponto e vírgula, padrão do Excel em português) a partir da lista. */
export function paraCsv(equipamentos) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [COLUNAS.join(';')];
  for (const e of equipamentos) linhas.push(COLUNAS.map((c) => esc(e[c])).join(';'));
  return linhas.join('\r\n');
}
