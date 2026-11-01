// Registro de ciência na execução (decisão D5, 01/11/2026). É uma declaração de que a pessoa tomou ciência das
// informações de uma execução, com nome, data e hora e o conteúdo exato confirmado. Não comprova identidade, não é
// aprovação técnica e não tem validade jurídica garantida; pode servir como evidência, conforme as circunstâncias.

export const TEXTO_CIENCIA = 'Declaro que tomei ciência das informações desta execução.';
export const MAX_CIENCIAS = 20;

/** Conteúdo confirmado: a execução como estava no momento da ciência. */
export const conteudoDaExecucao = (h) => `${h.data} · ${h.tag} · ${h.descricao} · ${h.observacao || 'sem observação'}`.slice(0, 2000);

const texto = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const dataHora = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v) && !Number.isNaN(Date.parse(v));

/** Uma ciência: { id, nome, em (ISO UTC), conteudo }. */
export function cienciaValida(c) {
  return c !== null && typeof c === 'object' && typeof c.id === 'string' && /^[A-Za-z0-9_-]+$/.test(c.id) &&
    texto(c.nome, 120) && dataHora(c.em) && texto(c.conteudo, 2000);
}

export const cienciasValidas = (lista) => lista === undefined || (Array.isArray(lista) && lista.length <= MAX_CIENCIAS &&
  lista.every(cienciaValida) && new Set(lista.map((c) => c.id)).size === lista.length);

/** Acrescenta uma ciência sem alterar as anteriores. Recusa nome vazio e execução cancelada. */
export function acrescentarCiencia(execucao, nome, id, agora = new Date()) {
  const limpo = String(nome ?? '').trim();
  if (!limpo || limpo.length > 120) return { ok: false, motivo: 'Informe o nome de quem toma ciência (até 120 caracteres).' };
  if (execucao.cancelada) return { ok: false, motivo: 'Execução cancelada: não recebe registro de ciência.' };
  if ((execucao.ciencias ?? []).length >= MAX_CIENCIAS) return { ok: false, motivo: `Limite de ${MAX_CIENCIAS} registros de ciência por execução.` };
  const ciencia = { id, nome: limpo, em: agora.toISOString(), conteudo: conteudoDaExecucao(execucao) };
  return { ok: true, execucao: { ...execucao, ciencias: [...(execucao.ciencias ?? []), ciencia] } };
}
