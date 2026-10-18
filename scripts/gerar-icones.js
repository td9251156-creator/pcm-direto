// Gera os ícones do app (SVG e PNG) sem nenhuma dependência: um calendário com um "check".
// Uso: npm run icones
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { MARCA, rgb } from '../src/marca.js';

const AZUL = rgb(MARCA.primaria);
const BRANCO = [255, 255, 255];
const LARANJA = rgb(MARCA.destaqueClaro);
const PASTA = 'public/icones';

// Desenho em coordenadas de 0 a 1 (mesmo desenho no SVG e no PNG)
const CAL = { x0: 0.22, y0: 0.26, x1: 0.78, y1: 0.78, borda: 0.045, topo: 0.12, raio: 0.05 };
const CHECK = [[0.34, 0.55], [0.46, 0.66], [0.67, 0.43]];
const LARGURA_CHECK = 0.07;

function svg() {
  const pts = CHECK.map(([x, y]) => `${x * 512},${y * 512}`).join(' ');
  const w = (CAL.x1 - CAL.x0) * 512;
  const h = (CAL.y1 - CAL.y0) * 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="rgb(${AZUL})"/>
  <rect x="${CAL.x0 * 512}" y="${CAL.y0 * 512}" width="${w}" height="${h}" rx="${CAL.raio * 512}" fill="none" stroke="#fff" stroke-width="${CAL.borda * 512}"/>
  <rect x="${CAL.x0 * 512}" y="${CAL.y0 * 512}" width="${w}" height="${CAL.topo * 512}" fill="#fff"/>
  <polyline points="${pts}" fill="none" stroke="rgb(${LARANJA})" stroke-width="${LARGURA_CHECK * 512}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

// Distância de um ponto a um segmento (para desenhar o "check" com espessura)
function distSegmento(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Cor de um ponto do desenho
function cor(x, y) {
  if (distSegmento(x, y, CHECK[0], CHECK[1]) < LARGURA_CHECK / 2 || distSegmento(x, y, CHECK[1], CHECK[2]) < LARGURA_CHECK / 2) return LARANJA;
  const b = CAL.borda / 2;
  const dentroExterno = x >= CAL.x0 - b && x <= CAL.x1 + b && y >= CAL.y0 - b && y <= CAL.y1 + b;
  const dentroInterno = x > CAL.x0 + b && x < CAL.x1 - b && y > CAL.y0 + CAL.topo && y < CAL.y1 - b;
  if (dentroExterno && !dentroInterno) return BRANCO;
  return AZUL;
}

// Tabela de CRC usada pelo formato PNG
const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo), dados]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([tam, td, crc]);
}

function png(tamanho) {
  const AMOSTRAS = 4; // suavização das bordas
  const linhas = [];
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 3); // byte 0 = filtro
    for (let x = 0; x < tamanho; x++) {
      const soma = [0, 0, 0];
      for (let sy = 0; sy < AMOSTRAS; sy++) for (let sx = 0; sx < AMOSTRAS; sx++) {
        const c = cor((x + (sx + 0.5) / AMOSTRAS) / tamanho, (y + (sy + 0.5) / AMOSTRAS) / tamanho);
        soma[0] += c[0]; soma[1] += c[1]; soma[2] += c[2];
      }
      for (let i = 0; i < 3; i++) linha[1 + x * 3 + i] = Math.round(soma[i] / (AMOSTRAS * AMOSTRAS));
    }
    linhas.push(linha);
  }
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(tamanho, 0); cab.writeUInt32BE(tamanho, 4);
  cab[8] = 8; cab[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cab),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(PASTA, { recursive: true });
writeFileSync(`${PASTA}/icone.svg`, svg());
for (const t of [192, 512]) writeFileSync(`${PASTA}/icone-${t}.png`, png(t));
console.log('Ícones gerados em', PASTA);
