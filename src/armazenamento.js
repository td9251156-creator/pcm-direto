// Guarda o par biblioteca/rascunho com registro de recuperação contra gravação interrompida.
const CHAVES = ['pcm-direto:biblioteca:v1', 'pcm-direto:rascunho:v1'];
const TRANSACAO = 'pcm-direto:transacao:v1';
let anteriores = null;

export function recuperarTransacao() {
  try {
    const texto = localStorage.getItem(TRANSACAO);
    if (texto === null) { anteriores = null; return true; }
    const dados = JSON.parse(texto);
    if (!Array.isArray(dados) || dados.length !== 2 || !dados.every((e, i) =>
      e && e.chave === CHAVES[i] && (e.valor === null || typeof e.valor === 'string'))) return false;
    anteriores = dados;
    for (const e of dados) {
      if (e.valor === null) localStorage.removeItem(e.chave);
      else localStorage.setItem(e.chave, e.valor);
    }
    localStorage.removeItem(TRANSACAO);
    anteriores = null;
    return true;
  } catch { return false; }
}

export function lerDadoLocal(chave) {
  const anterior = anteriores?.find((e) => e.chave === chave);
  return anterior ? anterior.valor : localStorage.getItem(chave);
}

export function guardarBackupLocal(biblioteca, rascunho) {
  if (!recuperarTransacao()) return false;
  let iniciado = false;
  try {
    const dados = CHAVES.map((chave) => ({ chave, valor: localStorage.getItem(chave) }));
    localStorage.setItem(TRANSACAO, JSON.stringify(dados));
    iniciado = true;
    localStorage.setItem(CHAVES[0], JSON.stringify(biblioteca));
    localStorage.setItem(CHAVES[1], JSON.stringify(rascunho));
    localStorage.removeItem(TRANSACAO);
    return true;
  } catch {
    if (iniciado) recuperarTransacao();
    return false;
  }
}
