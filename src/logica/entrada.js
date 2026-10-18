// Leitura de dados colados do Excel ou importados de CSV.
// Colunas esperadas, nesta ordem: setor, tipo, descricao, fabricante, modelo
import { chave } from './texto.js';
import { normalizarSetor } from './tag.js';
import { resolverTipo } from './validacao.js';

export const COLUNAS = ['setor', 'tipo', 'descricao', 'fabricante', 'modelo'];

/** Descobre o separador olhando a primeira linha: tabulação (Excel), ponto e vírgula ou vírgula. */
export function detectarSeparador(linha) {
  if (linha.includes('\t')) return '\t';
  if (linha.includes(';')) return ';';
  return ',';
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
 * Converte o texto (colado ou CSV) em uma lista de equipamentos.
 * Pula linhas vazias e a linha de cabeçalho, se houver.
 * O tipo é reconhecido pelo nome ou sigla; se não for reconhecido, fica como veio
 * para a validação apontar o erro e sugerir a correção.
 */
export function lerTabela(texto, tipos) {
  const linhas = String(texto ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return [];
  const sep = detectarSeparador(linhas[0]);

  const primeira = quebrarLinha(linhas[0], sep).map(chave);
  const temCabecalho = primeira.includes('setor') && primeira.includes('tipo');

  return linhas.slice(temCabecalho ? 1 : 0).map((linha) => {
    const c = quebrarLinha(linha, sep);
    const setorBruto = c[0] ?? '';
    const setor = normalizarSetor(setorBruto);
    return {
      id: novoId(),
      // Se a correção do setor for só de forma (minúsculas/acentos), aplica direto
      setor: setor.length >= 2 ? setor : setorBruto,
      tipo: resolverTipo(c[1], tipos) ?? (c[1] ?? ''),
      numero: null,
      descricao: c[2] ?? '',
      fabricante: c[3] ?? '',
      modelo: c[4] ?? '',
    };
  });
}

/** Gera CSV (separado por ponto e vírgula, padrão do Excel em português) a partir da lista. */
export function paraCsv(equipamentos) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [COLUNAS.join(';')];
  for (const e of equipamentos) linhas.push(COLUNAS.map((c) => esc(e[c])).join(';'));
  return linhas.join('\r\n');
}
