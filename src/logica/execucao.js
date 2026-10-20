// Marcação da última execução; não muda frequência, segurança ou cronograma planejado.
import { chaveAjuste } from './plano.js';
import { dataValida, objeto } from './rascunho.js';
import { textoData } from './cronograma.js';

export function validarExecucoes(registros) {
  return objeto(registros) && Object.entries(registros).every(([chave, r]) =>
    /^[A-Za-z0-9_-]+\|[A-Za-z0-9_-]+$/.test(chave) && objeto(r) && dataValida(r.data) &&
    typeof r.observacao === 'string' && r.observacao.length <= 2000);
}

export function marcarExecucao(registros, linha, alteracao, hoje = new Date()) {
  if (!linha?.ativa) return { ok: false, motivo: 'Escolha uma tarefa ativa do plano.' };
  const chave = chaveAjuste(linha.equipamentoId, linha.tarefaId);
  if (!alteracao.concluida) {
    const novos = { ...registros };
    delete novos[chave];
    return { ok: true, registros: novos };
  }
  if (!dataValida(alteracao.data) || alteracao.data > textoData(hoje)) return { ok: false, motivo: 'Informe uma data válida de execução, até hoje.' };
  if (typeof alteracao.observacao !== 'string' || alteracao.observacao.length > 2000) return { ok: false, motivo: 'Use uma observação de até 2000 caracteres.' };
  return { ok: true, registros: { ...registros, [chave]: { data: alteracao.data, observacao: alteracao.observacao.trim() } } };
}
