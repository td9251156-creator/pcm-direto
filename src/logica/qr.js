// Gerador de QR code sem dependências (decisão D5, opção a): modo byte (UTF-8), correção nível M, versões 1 a 6
// (até 106 bytes). Segue a especificação ISO/IEC 18004; o texto gravado é só o endereço do ativo, sem dados pessoais.

// [total de palavras, palavras de correção por bloco, blocos] para o nível M.
const VERSOES = [null, [26, 10, 1], [44, 16, 1], [70, 26, 1], [100, 18, 2], [134, 24, 2], [172, 16, 4]];
const ALINHAMENTO = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

// Campo de Galois GF(256), polinômio 0x11D.
const EXP = new Array(512); const LOG = new Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mult = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

/** Palavras de correção Reed-Solomon de `dados` (exportado para teste com vetor conhecido). */
export function reedSolomon(dados, n) {
  let gerador = [1];
  for (let i = 0; i < n; i++) {
    const proximo = new Array(gerador.length + 1).fill(0);
    gerador.forEach((c, j) => { proximo[j] ^= c; proximo[j + 1] ^= mult(c, EXP[i]); });
    gerador = proximo;
  }
  const resto = new Array(n).fill(0);
  for (const d of dados) {
    const fator = d ^ resto.shift(); resto.push(0);
    for (let j = 0; j < n; j++) resto[j] ^= mult(gerador[j + 1], fator);
  }
  return resto;
}

function palavras(bytes, versao) {
  const [total, ec, blocos] = VERSOES[versao]; const capacidade = total - ec * blocos;
  const bits = [];
  const por = (valor, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
  por(0b0100, 4); por(bytes.length, 8); for (const b of bytes) por(b, 8);
  por(0, Math.min(4, capacidade * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const dados = []; for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; dados.length < capacidade; pad ^= 0xec ^ 0x11) dados.push(pad);
  const tam = capacidade / blocos; const grupos = [];
  for (let b = 0; b < blocos; b++) { const d = dados.slice(b * tam, (b + 1) * tam); grupos.push([d, reedSolomon(d, ec)]); }
  const saida = [];
  for (let i = 0; i < tam; i++) for (const [d] of grupos) saida.push(d[i]);
  for (let i = 0; i < ec; i++) for (const [, e] of grupos) saida.push(e[i]);
  return saida;
}

const MASCARAS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];

function montar(versao, codigos, mascara) {
  const n = versao * 4 + 17;
  const m = Array.from({ length: n }, () => new Array(n).fill(false));
  const fixo = Array.from({ length: n }, () => new Array(n).fill(false));
  const pos = (x, y, escuro) => { m[y][x] = escuro; fixo[y][x] = true; };
  for (let i = 0; i < n; i++) { pos(6, i, i % 2 === 0); pos(i, 6, i % 2 === 0); }
  const localizador = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy; const d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < n && y >= 0 && y < n) pos(x, y, d !== 2 && d !== 4);
    }
  };
  localizador(3, 3); localizador(n - 4, 3); localizador(3, n - 4);
  const c = ALINHAMENTO[versao];
  for (const ax of c) for (const ay of c) {
    if ((ax === 6 && ay === 6) || (ax === 6 && ay === c.at(-1)) || (ax === c.at(-1) && ay === 6)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pos(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // Informação de formato (nível M = 00), com BCH(15,5) e máscara 0x5412.
  const dado = mascara; let resto = dado;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  const f = ((dado << 10) | resto) ^ 0x5412; const bit = (i) => ((f >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) pos(8, i, bit(i));
  pos(8, 7, bit(6)); pos(8, 8, bit(7)); pos(7, 8, bit(8));
  for (let i = 9; i < 15; i++) pos(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) pos(n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) pos(8, n - 15 + i, bit(i));
  pos(8, n - 8, true);
  // Dados em zigue-zague, de baixo para cima, em pares de colunas a partir da direita.
  let i = 0;
  for (let direita = n - 1; direita >= 1; direita -= 2) {
    if (direita === 6) direita = 5;
    for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
      const x = direita - j; const subindo = ((direita + 1) & 2) === 0; const y = subindo ? n - 1 - v : v;
      if (fixo[y][x]) continue;
      const escuro = i < codigos.length * 8 && ((codigos[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++;
      m[y][x] = escuro !== MASCARAS[mascara](x, y);
    }
  }
  return m;
}

// Penalidade simplificada (sequências, blocos 2×2 e equilíbrio claro/escuro) para escolher a máscara.
function penalidade(m) {
  const n = m.length; let p = 0; let escuros = 0;
  for (let a = 0; a < n; a++) for (const linha of [(k) => m[a][k], (k) => m[k][a]]) {
    let corrida = 1;
    for (let k = 1; k < n; k++) { if (linha(k) === linha(k - 1)) { corrida++; if (corrida === 5) p += 3; else if (corrida > 5) p++; } else corrida = 1; }
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (m[y][x]) escuros++;
    if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  }
  return p + Math.floor(Math.abs((escuros * 20) / (n * n) - 10)) * 10;
}

/** Matriz do QR (true = módulo escuro) para um texto de até 106 bytes em UTF-8. */
export function gerarQr(texto) {
  const bytes = [...new TextEncoder().encode(texto)];
  const versao = VERSOES.findIndex((v) => v && v[0] - v[1] * v[2] - 2 >= bytes.length);
  if (versao < 1) throw new Error('Texto longo demais para o QR do app (até 106 bytes).');
  const codigos = palavras(bytes, versao);
  let melhor = null;
  for (let mascara = 0; mascara < 8; mascara++) {
    const m = montar(versao, codigos, mascara); const p = penalidade(m);
    if (!melhor || p < melhor.p) melhor = { m, p };
  }
  return melhor.m;
}

/** SVG do QR com margem de 4 módulos (exigida pela leitura). */
export function qrSvg(texto, modulo = 6) {
  const m = gerarQr(texto); const n = m.length + 8; const lado = n * modulo;
  const caminho = m.flatMap((linha, y) => linha.map((e, x) => (e ? `M${x + 4} ${y + 4}h1v1h-1z` : ''))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${lado}" height="${lado}" role="img" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${caminho}" fill="#000"/></svg>`;
}
