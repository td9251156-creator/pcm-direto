export const LIMITE_PDF = 5000000;
export async function conferirPdf(bytes, PDFDocument) {
  if (!bytes.length || bytes.length > LIMITE_PDF) throw new Error('Use um PDF de até 5 MB.');
  const inicio = new TextDecoder().decode(bytes.subarray(0, 8));
  const fim = new TextDecoder().decode(bytes.subarray(-1024)).trimEnd();
  if (!/^%PDF-(1\.[0-7]|2\.0)/.test(inicio) || !fim.endsWith('%%EOF')) throw new Error('O arquivo não é um PDF completo.');
  let paginas;
  try {
    const documento = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true });
    paginas = documento.getPageCount();
  }
  catch { throw new Error('O PDF não pôde ser aberto. Use um arquivo válido, sem senha.'); }
  if (!paginas || paginas > 200) throw new Error('Use um PDF com 1 a 200 páginas.');
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
}
