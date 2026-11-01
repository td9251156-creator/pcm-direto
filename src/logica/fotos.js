// Fotos na falha (decisão D5 do mantenedor, 01/11/2026). A foto é refeita no próprio aparelho: lado maior de até
// 1.280 px, JPEG de 150–300 KB (teto 500 KB). Refazer a imagem descarta os metadados do arquivo original
// (inclusive a localização do GPS). Nada é enviado para fora do aparelho.

export const LIMITES_FOTO = { porFalha: 3, ladoMax: 1280, alvoBytes: 300_000, maxBytes: 500_000, avisoAtivoBytes: 20_000_000 };
const PREFIXO = 'data:image/jpeg;base64,';

/** Tamanho aproximado, em bytes, da imagem guardada como data URL base64. */
export const bytesDaFoto = (dados) => Math.floor(((dados?.length ?? 0) - PREFIXO.length) * 3 / 4);

/** Uma foto guardada: { id, dados: data URL JPEG, largura, altura }. */
export function fotoValida(f) {
  return f !== null && typeof f === 'object' && typeof f.id === 'string' && /^[A-Za-z0-9_-]+$/.test(f.id) &&
    typeof f.dados === 'string' && f.dados.startsWith(PREFIXO) && /^[A-Za-z0-9+/]+=*$/.test(f.dados.slice(PREFIXO.length)) &&
    bytesDaFoto(f.dados) > 0 && bytesDaFoto(f.dados) <= LIMITES_FOTO.maxBytes &&
    [f.largura, f.altura].every((n) => Number.isInteger(n) && n > 0 && n <= LIMITES_FOTO.ladoMax);
}

export const fotosValidas = (fotos) => fotos === undefined || (Array.isArray(fotos) && fotos.length <= LIMITES_FOTO.porFalha &&
  fotos.every(fotoValida) && new Set(fotos.map((f) => f.id)).size === fotos.length);

/** Bytes de fotos por ativo e no total (para o aviso de 20 MB e o tamanho do backup). */
export function espacoDasFotos(falhas) {
  const porAtivo = new Map(); let total = 0;
  for (const f of falhas) for (const foto of f.fotos ?? []) {
    const b = bytesDaFoto(foto.dados); total += b; porAtivo.set(f.equipamentoId, (porAtivo.get(f.equipamentoId) ?? 0) + b);
  }
  return { total, porAtivo };
}

/** Reduz uma imagem escolhida no aparelho (navegador). Devolve { dados, largura, altura } ou lança erro em português. */
export async function prepararFoto(arquivo) {
  if (!arquivo?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  let imagem;
  try { imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); } catch { throw new Error('Não foi possível abrir esta imagem.'); }
  const escala = Math.min(1, LIMITES_FOTO.ladoMax / Math.max(imagem.width, imagem.height));
  const largura = Math.max(1, Math.round(imagem.width * escala)); const altura = Math.max(1, Math.round(imagem.height * escala));
  const tela = document.createElement('canvas'); tela.width = largura; tela.height = altura;
  const ctx = tela.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, largura, altura); ctx.drawImage(imagem, 0, 0, largura, altura);
  imagem.close?.();
  let dados = '';
  for (const qualidade of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    dados = tela.toDataURL('image/jpeg', qualidade);
    if (bytesDaFoto(dados) <= LIMITES_FOTO.alvoBytes) break;
  }
  if (bytesDaFoto(dados) > LIMITES_FOTO.maxBytes) throw new Error('A foto ficou grande demais mesmo reduzida. Tente outra imagem.');
  return { dados, largura, altura };
}
