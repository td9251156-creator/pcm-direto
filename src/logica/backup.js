// Backup completo e versionado; valores permanecem somente no navegador e no arquivo baixado.
import { lerRascunho } from './rascunho.js';
import { validarExecucoes } from './execucao.js';
import { verificarBibliotecaEditada } from './edicao.js';

export function criarBackup(estado, hoje = new Date()) {
  const { equipamentos, ajustes, execucoes, exemplo, inicio, capacidade, biblioteca } = estado;
  return JSON.parse(JSON.stringify({ aplicativo: 'PCM Direto', versao: 1, geradoEm: hoje.toISOString(), biblioteca,
    rascunho: { equipamentos, ajustes, execucoes, exemplo, inicio, capacidade } }));
}

export function verificarBackup(arquivo, padrao) {
  if (arquivo?.aplicativo !== 'PCM Direto' || arquivo?.versao !== 1) return { ok: false, motivo: 'Escolha um backup completo do PCM Direto, versão 1.' };
  const problemas = verificarBibliotecaEditada(padrao, arquivo.biblioteca);
  if (problemas.length) return { ok: false, motivo: 'Biblioteca do backup: ' + problemas[0] };
  const rascunho = lerRascunho(arquivo.rascunho);
  if (!rascunho || !validarExecucoes(rascunho.execucoes ?? {})) return { ok: false, motivo: 'O backup contém dados incompletos ou inválidos. A lista atual foi mantida.' };
  return { ok: true, biblioteca: arquivo.biblioteca, rascunho };
}
