// Corrigir o relato não muda a identificação histórica do mesmo ativo.
export function identificacaoDaFalha(equipamento, anterior) {
  if (anterior && (!equipamento || equipamento.id === anterior.equipamentoId)) {
    return { equipamentoId: anterior.equipamentoId, tag: anterior.tag };
  }
  return { equipamentoId: equipamento.id, tag: equipamento.tag };
}
