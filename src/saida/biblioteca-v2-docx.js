// Preenche só os metadados dos manuais Word da Biblioteca PCM v2 (018 e 019), numa cópia integral do original.
// Os campos do Word são controles ligados a uma parte de dados (customXml): atualiza a parte de dados, que o Word
// usa ao abrir, e o texto exibido em cada controle, que outros editores mostram. O corpo do manual não é alterado:
// é orientação para a equipe escrever, e o app não inventa texto técnico, aprovação ou evidência.
import JSZip from 'jszip';
import contrato from '../dados/biblioteca-pcm-v2.json';

// Caracteres de controle são proibidos em XML 1.0 e invalidariam o documento: são retirados.
const semControle = (s) => [...String(s)].filter((c) => c >= ' ' || c === '\t' || c === '\n' || c === '\r').join('');
const escXml = (s) => semControle(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CAMPOS = ['revisao', 'data', 'organizacao', 'elaborado', 'aprovado', 'situacao'];

/** Valores dos metadados a partir do retrato da emissão (prepararEmissao). "A definir" quando o app não sabe. */
export function metadadosWord(emissao) {
  const { estado: e, meta: m } = emissao;
  const definir = (v) => (String(v ?? '').trim() ? String(v).trim() : 'A definir');
  return {
    revisao: m.revisao, data: m.dataCorte.split('-').reverse().join('/'), organizacao: definir(e.gestao.organizacao.nome),
    elaborado: definir(m.elaborador), aprovado: definir(m.aprovador), situacao: m.aprovador ? 'Aprovado' : 'Em elaboração',
  };
}

/** Troca o texto de um controle mantendo a formatação do primeiro trecho; os demais trechos ficam vazios. */
function preencherControle(sdt, valor) {
  let primeiro = true;
  return sdt.replace(/(<w:sdtContent>)([\s\S]*?)(<\/w:sdtContent>)/, (_, a, conteudo, b) => a + conteudo.replace(/(<w:t)(?:\s[^>]*)?>([^<]*)(<\/w:t>)/g, (_t, abre, _texto, fecha) => {
    const texto = primeiro ? escXml(valor) : '';
    primeiro = false;
    return `${abre} xml:space="preserve">${texto}${fecha}`;
  }) + b);
}

export async function preencherManualWord(bytes, codigo, valores) {
  const modelo = contrato.modelos.find((m) => m.codigo === codigo && m.formato === 'docx');
  if (!modelo) throw new Error('Modelo Word desconhecido.');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('');
  if (hash !== modelo.sha256) throw new Error(`Modelo ${codigo} diferente do esperado por esta versão do app. Recarregue o aplicativo; seus dados não foram alterados.`);
  const zip = await JSZip.loadAsync(bytes);

  // Parte de dados ligada aos controles (namespace urn:pcm-direto:documento:1).
  let dados = null;
  for (const nome of Object.keys(zip.files).filter((n) => /^customXml\/item\d+\.xml$/.test(n))) {
    const xml = await zip.file(nome).async('string');
    if (xml.includes('urn:pcm-direto:documento:1')) { dados = nome; // Função no replace: um "$" no nome (ex.: "Ana $&") não pode virar padrão de substituição.
      zip.file(nome, CAMPOS.reduce((x, c) => x.replace(new RegExp(`(<pcm:${c}>)[^<]*(</pcm:${c}>)`), (_, a, b) => a + escXml(valores[c]) + b), xml)); }
  }
  if (!dados) throw new Error('O modelo não tem a parte de metadados esperada.');

  const partes = [...new Set(modelo.camposDocumento.map((c) => c.parte))];
  let preenchidos = 0;
  for (const parte of partes) {
    const xml = await zip.file(parte).async('string');
    zip.file(parte, xml.replace(/<w:sdt>[\s\S]*?<\/w:sdt>/g, (sdt) => {
      const tag = /<w:tag w:val="([^"]*)"/.exec(sdt)?.[1];
      if (!CAMPOS.includes(tag)) return sdt;
      preenchidos++;
      return preencherControle(sdt, valores[tag]);
    }));
  }
  const esperados = modelo.camposDocumento.filter((c) => CAMPOS.includes(c.campo)).length;
  if (preenchidos !== esperados) throw new Error('Os campos de metadados do modelo não conferem com o esperado.');
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
