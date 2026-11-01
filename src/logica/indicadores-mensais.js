import { falhasDoAtivo, indicadores017 } from './indicadores-017.js';

export function mesFechado(mes, hoje) {
  return typeof mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && mes >= '1900-01' && mes < hoje.slice(0, 7);
}

/**
 * Indicadores do ativo no mês fechado pelo procedimento PCM-MAN-017: HP digitada (totais mensais); HI calculada pelas
 * falhas do app e importadas do 008 (a parada digitada no mês não entra no cálculo).
 */
export function indicadoresMensais(gestao, equipamentoId, mes, hoje, tag = '') {
  const fechado = mesFechado(mes, hoje);
  const total = (gestao.indicadoresMensais ?? []).find(r => r.equipamentoId === equipamentoId && r.mes === mes);
  const tagAtivo = tag || total?.tag || gestao.falhas.find(f => f.equipamentoId === equipamentoId)?.tag || '';
  const falhas = falhasDoAtivo(gestao, equipamentoId, tagAtivo);
  const semConclusao = gestao.falhas.filter(f => f.equipamentoId === equipamentoId && f.data.slice(0, 7) <= mes && !f.dataConclusao).length;
  if (!fechado) return { fechado, total, falhas: 0, reparosConcluidos: 0, semConclusao, horasOperadas: null, hi: null, mtbf: null, mttr: null, disponibilidade: null, alertas: [], provisoria: false };
  const r = indicadores017(falhas, mes, total?.horasPlanejadas ?? null, `${hoje}T00:00:00`);
  return { fechado, total, falhas: r.n, reparosConcluidos: r.reparos, semConclusao, horasOperadas: r.ho, hi: r.hi, hp: r.hp,
    mtbf: r.mtbf, mttr: r.mttr, disponibilidade: r.disponibilidade, alertas: r.alertas, provisoria: r.provisoria };
}

export function ativosDosIndicadores(equipamentos, gestao) {
  const ativos = new Map(equipamentos.map(e => [e.id, { id: e.id, tag: e.tag, removido: false }]));
  for (const r of [...gestao.falhas, ...(gestao.indicadoresMensais ?? [])]) {
    if (!ativos.has(r.equipamentoId)) ativos.set(r.equipamentoId, { id: r.equipamentoId, tag: r.tag, removido: true });
  }
  return [...ativos.values()];
}
