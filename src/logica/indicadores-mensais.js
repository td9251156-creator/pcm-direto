import { calcularIndicadores } from './indicadores.js';

const horas = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function mesFechado(mes, hoje) {
  return typeof mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && mes >= '1900-01' && mes < hoje.slice(0, 7);
}

/** Totais conferidos não são reconstruídos a partir das durações das falhas. */
export function indicadoresMensais(gestao, equipamentoId, mes, hoje) {
  const fechado = mesFechado(mes, hoje);
  const total = (gestao.indicadoresMensais ?? []).find(r => r.equipamentoId === equipamentoId && r.mes === mes);
  const registros = gestao.falhas.filter(f => f.equipamentoId === equipamentoId);
  const falhas = registros.filter(f => f.data.slice(0, 7) === mes).length;
  const reparos = registros.filter(f => f.dataConclusao?.slice(0, 7) === mes);
  const semDuracao = reparos.filter(f => !horas(f.horasReparo)).length;
  const semConclusao = registros.filter(f => f.data.slice(0, 7) <= mes && !f.dataConclusao).length;
  const horasReparo = semDuracao ? null : reparos.reduce((s, f) => s + f.horasReparo, 0);
  const entradas = { horasPlanejadas: total?.horasPlanejadas, horasParada: total?.horasParada,
    falhas, horasReparo, reparosConcluidos: reparos.length };
  return { fechado, total, falhas, reparosConcluidos: reparos.length, semDuracao, semConclusao, horasReparo,
    ...calcularIndicadores(fechado ? entradas : {}) };
}

export function ativosDosIndicadores(equipamentos, gestao) {
  const ativos = new Map(equipamentos.map(e => [e.id, { id: e.id, tag: e.tag, removido: false }]));
  for (const r of [...gestao.falhas, ...(gestao.indicadoresMensais ?? [])]) {
    if (!ativos.has(r.equipamentoId)) ativos.set(r.equipamentoId, { id: r.equipamentoId, tag: r.tag, removido: true });
  }
  return [...ativos.values()];
}
