// Filtro de visualização: mantém as semanas e os limites do plano completo.
import { SEMANAS, horasPorSemana } from './cronograma.js';

export function filtrarCronograma(cronograma, equipamentos, { setor = '', especialidade = '' } = {}) {
  const porId = new Map(equipamentos.map((e) => [e.id, e]));
  const itens = cronograma.filter((t) => (!setor || porId.get(t.equipamentoId)?.setor === setor) &&
    (!especialidade || t.especialidade === especialidade));
  const carga = new Array(SEMANAS).fill(0);
  for (const t of itens) for (const s of t.semanas) carga[s - 1] += horasPorSemana(t);
  return { itens, carga, equipamentos: new Set(itens.map((t) => t.equipamentoId)).size,
    horasAno: carga.reduce((a, b) => a + b, 0) };
}
