// Fórmulas aprovadas pelo mantenedor em 27/10/2026, sem inferir dados do histórico.
const horasValidas = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
const contagemPositiva = valor => Number.isInteger(valor) && valor > 0;
const dividir = (numerador, denominador) => numerador === 0 ? 0 : numerador / denominador;

/** Retorna null quando faltam entradas válidas ou o quociente não está definido. */
export function calcularIndicadores(entradas) {
  const indefinidos = { horasOperadas: null, mtbf: null, mttr: null, disponibilidade: null };
  try {
    if (entradas === null || typeof entradas !== 'object' || Array.isArray(entradas)) return indefinidos;
    const prototipo = Object.getPrototypeOf(entradas);
    if (prototipo !== Object.prototype && prototipo !== null) return indefinidos;

    // Somente valores próprios explícitos; campos ausentes não viram zero.
    const valor = campo => Object.getOwnPropertyDescriptor(entradas, campo)?.value;
    const horasPlanejadas = valor('horasPlanejadas');
    const horasParada = valor('horasParada');
    const falhas = valor('falhas');
    const horasReparo = valor('horasReparo');
    const reparosConcluidos = valor('reparosConcluidos');
    const operacaoValida = horasValidas(horasPlanejadas) && horasValidas(horasParada) && horasParada <= horasPlanejadas;
    const horasOperadas = operacaoValida ? (horasPlanejadas === horasParada ? 0 : horasPlanejadas - horasParada) : null;

    return {
      horasOperadas,
      mtbf: horasOperadas !== null && contagemPositiva(falhas) ? dividir(horasOperadas, falhas) : null,
      mttr: horasValidas(horasReparo) && contagemPositiva(reparosConcluidos) ? dividir(horasReparo, reparosConcluidos) : null,
      disponibilidade: horasOperadas !== null && horasPlanejadas > 0 ? (horasOperadas / horasPlanejadas) * 100 : null,
    };
  } catch {
    return indefinidos;
  }
}
