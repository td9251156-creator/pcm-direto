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
 * capacidade (opcional): horas disponíveis por semana em cada especialidade, ex.: { Mecânica: 8 }.
 * Retorna { itens, carga, cargaPorEspecialidade, semanasAcima }:
 *  - itens: cada linha do plano com "semanas" (1 a 52) em que deve ser executada;
 *  - carga: horas previstas em cada semana (posição 0 = semana 1);
 *  - cargaPorEspecialidade: o mesmo, separado por especialidade;
 *  - semanasAcima: quantas semanas ficaram acima da capacidade, por especialidade.
 */
export function montarCronograma(linhasPlano, capacidade = {}) {
  const carga = new Array(SEMANAS).fill(0);
  const cargaPorEspecialidade = {};
  // Horas que passariam do limite da especialidade em uma semana
  const excesso = (horas, limite) => (limite > 0 ? Math.max(0, horas - limite) : 0);

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
    const h = horasPorSemana(linha);
    const esp = linha.especialidade;
    const cargaEsp = (cargaPorEspecialidade[esp] ??= new Array(SEMANAS).fill(0));
    const limite = Number(capacidade[esp]) || 0;
    let melhor = null;
    for (let inicio = 0; inicio < opcoesDeInicio(linha.vezesAno); inicio++) {
      const semanas = semanasDaTarefa(linha.vezesAno, inicio);
      // Critérios, nesta ordem: 1) não passar da capacidade da especialidade;
      // 2) pico da especialidade; 3) pico geral; 4) horas já previstas nessas semanas
      const opcao = {
        semanas,
        acima: semanas.reduce((t, s) => t + excesso(cargaEsp[s] + h, limite) - excesso(cargaEsp[s], limite), 0),
        picoEsp: Math.max(...semanas.map((s) => cargaEsp[s] + h)),
        pico: Math.max(...semanas.map((s) => carga[s] + h)),
        soma: semanas.reduce((t, s) => t + carga[s], 0),
      };
      if (!melhor || melhorQue(opcao, melhor)) melhor = opcao;
    }
    for (const s of melhor.semanas) { carga[s] += h; cargaEsp[s] += h; }
    itens.push({ ...linha, semanas: melhor.semanas.map((s) => s + 1) });
  }

  const semanasAcima = {};
  for (const [esp, c] of Object.entries(cargaPorEspecialidade)) {
    const limite = Number(capacidade[esp]) || 0;
    semanasAcima[esp] = limite > 0 ? c.filter((x) => x > limite + 1e-9).length : 0;
  }
  return { itens, carga, cargaPorEspecialidade, semanasAcima };
}

/** Compara duas opções de semana de início (veja os critérios em montarCronograma). */
function melhorQue(a, b) {
  for (const k of ['acima', 'picoEsp', 'pico', 'soma']) {
    if (Math.abs(a[k] - b[k]) > 1e-9) return a[k] < b[k];
  }
  return false;
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

/** Converte "2027-01-04" em data local (sem problema de fuso horário). */
export function lerData(texto) {
  const [a, m, d] = String(texto).split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** "2027-01-04" a partir de uma data local. */
export function textoData(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/** Próxima segunda-feira a partir de hoje (padrão para o início do plano). */
export function proximaSegunda(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d;
}

/** Data em que começa a semana n (1 a 52), dado o início do plano. */
export function dataDaSemana(inicio, n) {
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  d.setDate(d.getDate() + (n - 1) * 7);
  return d;
}

/** "04/01" */
export function diaMes(data) {
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
}
