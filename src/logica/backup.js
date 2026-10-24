// Backup completo e versionado; valores permanecem somente no navegador e no arquivo baixado.
import { lerRascunho } from './rascunho.js';
import { validarExecucoes } from './execucao.js';
import { verificarBibliotecaEditada } from './edicao.js';

export function criarBackup(estado, hoje = new Date()) {
  const { equipamentos, ajustes, execucoes, exemplo, inicio, capacidade, biblioteca, gestao, programacao, metadados } = estado;
  return JSON.parse(JSON.stringify({ aplicativo: 'PCM Direto', versao: programacao ? 3 : gestao ? 2 : 1, geradoEm: hoje.toISOString(), biblioteca,
    rascunho: { equipamentos, ajustes, execucoes, exemplo, inicio, capacidade, ...(gestao ? { gestao } : {}),
      ...(programacao ? { programacao, metadados } : {}) } }));
}

export function verificarBackup(arquivo, padrao) {
  if (arquivo?.aplicativo !== 'PCM Direto' || ![1, 2, 3].includes(arquivo?.versao) || (arquivo.versao >= 2 && !arquivo.rascunho?.gestao) ||
    (arquivo.versao === 3 && (!arquivo.rascunho?.programacao || !arquivo.rascunho?.metadados))) return { ok: false, motivo: 'Escolha um backup completo válido do PCM Direto, versão 1, 2 ou 3.' };
  const problemas = verificarBibliotecaEditada(padrao, arquivo.biblioteca);
  if (problemas.length) return { ok: false, motivo: 'Biblioteca do backup: ' + problemas[0] };
  const rascunho = lerRascunho(arquivo.rascunho);
  if (!rascunho || !validarExecucoes(rascunho.execucoes ?? {})) return { ok: false, motivo: 'O backup contém dados incompletos ou inválidos. A lista atual foi mantida.' };
  if (rascunho.programacao) {
    const porId = new Map(rascunho.programacao.ocorrencias.map(o => [o.id, o]));
    if ((rascunho.gestao?.historico ?? []).some(h => {
      if (h.ocorrenciaId === undefined) return false;
      const o = porId.get(h.ocorrenciaId);
      return !o || h.equipamentoId !== o.equipamentoId || h.tarefaId !== o.tarefaId || h.dataPrevista !== o.dataPrevista || h.revisaoId !== o.revisaoId;
    })) return { ok: false, motivo: 'O backup tem uma execução vinculada a uma ocorrência incompatível. Os dados atuais foram mantidos.' };
  }
  return { ok: true, biblioteca: arquivo.biblioteca, rascunho };
}
