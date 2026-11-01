// Retrato de uma emissão de documentos da revisão ativa (Biblioteca PCM v2).
import { ocorrenciasVigentes } from './programacao.js';

/** Retrato fechado no início da emissão; nenhum await lê o estado vivo depois disso. */
export function prepararEmissao(estado, metadados) {
  if (!estado.programacao.revisoes.length) throw new Error('Ative uma revisão antes de emitir os documentos.');
  const e = structuredClone(estado); const r = e.programacao.revisoes.at(-1);
  const corte = metadados.dataCorte;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(corte) || !metadados.elaborador.trim()) throw new Error('Informe a data de corte e o elaborador.');
  if (metadados.aprovado && !metadados.aprovador.trim()) throw new Error('Uma aprovação exige o nome do aprovador.');
  return {
    estado: e, revisao: r,
    meta: { ...metadados, aprovador: metadados.aprovado ? metadados.aprovador.trim() : '', revisao: String(r.numero).padStart(2, '0'), situacao: metadados.aprovado ? 'Aprovado' : 'Em elaboração' },
    ocorrencias: ocorrenciasVigentes(e.programacao), historico: e.gestao.historico.filter(h => h.data <= corte), falhas: e.gestao.falhas.filter(f => f.data <= corte),
  };
}
