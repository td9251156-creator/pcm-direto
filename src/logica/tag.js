// Geração de TAGs padronizadas: SETOR-SIGLA-NÚMERO, ex.: UTL-CMP-001
import { semAcento } from './texto.js';

export const SETOR_MIN = 2;
export const SETOR_MAX = 4;

/** Converte o setor digitado para o padrão: maiúsculo, sem acento, só letras e números, até 4 caracteres. */
export function normalizarSetor(texto) {
  return semAcento(texto).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, SETOR_MAX);
}

/** Monta a TAG. O número sempre com 3 dígitos. */
export function gerarTag(setor, sigla, numero) {
  return `${setor}-${sigla}-${numero == null ? '???' : String(numero).padStart(3, '0')}`;
}

/** Próximo número livre para o mesmo setor e tipo. */
export function proximoNumero(equipamentos, setor, tipo, ignorarId = null) {
  const usados = new Set(equipamentos
    .filter((e) => e.id !== ignorarId && e.setor === setor && e.tipo === tipo)
    .map((e) => Number(e.numero))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 999));
  const seguinte = usados.size ? Math.max(...usados) + 1 : 1;
  if (seguinte <= 999) return seguinte;
  for (let n = 1; n <= 999; n++) if (!usados.has(n)) return n;
  return null;
}

/**
 * Preenche número (quando vazio) e TAG de todos os equipamentos.
 * siglas: { motor_eletrico: 'MOT', ... }. Tipo desconhecido usa "???" para chamar atenção.
 * Retorna uma nova lista; não altera a original.
 */
export function atribuirTags(equipamentos, siglas) {
  const resultado = [];
  for (const original of equipamentos) {
    const e = { ...original };
    if (!e.numero) e.numero = proximoNumero(resultado, e.setor, e.tipo);
    e.tag = gerarTag(e.setor, siglas[e.tipo] ?? '???', e.numero);
    resultado.push(e);
  }
  return resultado;
}
