// Cronograma anual com carga balanceada.
// Ideia: cada tarefa repete em intervalos fixos (ex.: trimestral = a cada 13 semanas).
// O que podemos escolher é a semana da primeira execução. Para cada tarefa, testamos
// todas as semanas de início possíveis e ficamos com a que deixa o pico de horas mais baixo.

export const SEMANAS = 52;

/** Semanas (0 a 51) em que a tarefa ocorre, dado quantas vezes por ano e a semana de início. */
export function semanasDaTarefa(vezes, inicio) {
  // Mais de uma vez por semana (ex.: diária): ocorre em todas as semanas
  if (vezes >= SEMANAS) return Array.from({ length: SEMANAS }, (_, i) => i);
  const semanas = [];
  for (let k = 0; k < vezes; k++) semanas.push(inicio + Math.round((k * SEMANAS) / vezes));
  return semanas;
}

/** Quantas semanas de início são possíveis (Semanal = 1, Mensal = 4, Anual = 52). */
export function opcoesDeInicio(vezes) {
  return Math.max(1, Math.floor(SEMANAS / vezes));
}

/** Horas da tarefa em cada semana em que ela aparece (diária = 5 execuções na semana). */
export function horasPorSemana(linha) {
  return linha.duracaoHoras * Math.max(1, linha.vezesAno / SEMANAS);
}

/**
 * Monta o cronograma a partir das linhas do plano (só as tarefas ativas).
 * Retorna { itens, carga }:
 *  - itens: cada linha do plano com "semanas" (1 a 52) em que deve ser executada;
 *  - carga: horas previstas em cada semana (posição 0 = semana 1).
 */
export function montarCronograma(linhasPlano) {
  const carga = new Array(SEMANAS).fill(0);

  // Tarefas mais frequentes primeiro (têm menos opções); depois as mais longas.
  const ordem = linhasPlano
    .filter((l) => l.ativa && l.vezesAno > 0)
    .slice()
    .sort((a, b) =>
      b.vezesAno - a.vezesAno ||
      b.duracaoHoras - a.duracaoHoras ||
      String(a.tag).localeCompare(String(b.tag)) ||
      String(a.tarefaId).localeCompare(String(b.tarefaId)));

  const itens = [];
  for (const linha of ordem) {
    let melhor = null;
    for (let inicio = 0; inicio < opcoesDeInicio(linha.vezesAno); inicio++) {
      const semanas = semanasDaTarefa(linha.vezesAno, inicio);
      // Pico: a semana mais carregada entre as que a tarefa ocuparia
      const h = horasPorSemana(linha);
      const pico = Math.max(...semanas.map((s) => carga[s] + h));
      // Desempate: soma das horas já previstas nessas semanas
      const soma = semanas.reduce((t, s) => t + carga[s], 0);
      if (!melhor || pico < melhor.pico || (pico === melhor.pico && soma < melhor.soma)) {
        melhor = { semanas, pico, soma };
      }
    }
    for (const s of melhor.semanas) carga[s] += horasPorSemana(linha);
    itens.push({ ...linha, semanas: melhor.semanas.map((s) => s + 1) });
  }

  return { itens, carga };
}

/** Números para o resumo: total de horas no ano, média semanal, pico e a semana do pico. */
export function resumoCarga(carga) {
  const total = carga.reduce((t, h) => t + h, 0);
  const pico = Math.max(...carga);
  return {
    total,
    media: total / carga.length,
    pico,
    semanaPico: carga.indexOf(pico) + 1,
  };
}
