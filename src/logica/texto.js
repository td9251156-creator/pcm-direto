// Funções pequenas de texto usadas em vários lugares.

/** Remove acentos: "Elétrico" -> "Eletrico" */
export function semAcento(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Deixa o texto comparável: sem acento, minúsculo, sem espaços extras, espaços viram "_" */
export function chave(texto) {
  return semAcento(texto).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Distância entre duas palavras (quantas letras mudar). Usada para sugerir correções. */
export function distancia(a, b) {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j];
      linha[j] = Math.min(
        linha[j] + 1,
        linha[j - 1] + 1,
        anterior + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      anterior = guardado;
    }
  }
  return linha[b.length];
}
