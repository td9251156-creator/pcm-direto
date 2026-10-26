// Manual final da marca, versão 02 / outubro de 2026.
// Cores da interface, em um só lugar. Usadas também na planilha e no Word.
// Ao trocar a cor primária, troque também:
//   - --primaria e --destaque no topo de src/estilo.css
//   - theme-color no index.html e theme_color no public/manifest.webmanifest
// Depois rode "npm test" (um teste confere se tudo bate).
export const MARCA = {
  primaria: '0B2A5B', // barra do topo, cabeçalhos de tabela, botões
  destaque: 'B85600', // contorno de foco do teclado (sobre fundo branco)
  profundo: '071C3D',
  sinal: 'E2701F',
  tinta: '0E1726',
  textoSuave: '4A5668',
  linha: 'DDE3EA',
  superficie: 'F4F6F9',
  entrada: 'E6EEF8',
  automatico: 'ECEFF3',
  avisoFundo: 'FFF4C2', // fundo do aviso permanente
  avisoBorda: '8A6D00',
  avisoTexto: '5C4600',
  seguranca: '7A0019', // selo de tarefa de segurança (não muda com a marca)
};

/** Versão clara de uma cor (mistura com branco). fracao = 0.85 deixa 85% branco. */
export function clarear(hex, fracao = 0.85) {
  return [0, 2, 4]
    .map((i) => parseInt(hex.slice(i, i + 2), 16))
    .map((v) => Math.round(v + (255 - v) * fracao).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** "0B3D63" -> [11, 61, 99] */
export function rgb(hex) {
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
