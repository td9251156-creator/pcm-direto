// Compartilha somente o endereço público do material; não lê a base ou a sessão do app.
for (const raiz of document.querySelectorAll('[data-compartilhar]')) {
  const campo = raiz.querySelector('input');
  const nativo = raiz.querySelector('[data-compartilhar-aparelho]');
  const copiar = raiz.querySelector('[data-copiar-link]');
  const status = raiz.querySelector('[role="status"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  let url;
  try {
    url = new URL(canonical.href);
    if (url.origin !== 'https://pcmdireto.me' || url.search || url.hash ||
      !/^\/(modelos\/pcm-man-(00[1-9]|01[0-9])|guias\/[a-z0-9-]+)\/$/.test(url.pathname)) continue;
  } catch { continue; }
  campo.value = url.href;
  const dados = { title: document.querySelector('h1').textContent.trim() + ' · PCM Direto', url: url.href };
  let podeCompartilhar = typeof navigator.share === 'function';
  try { if (podeCompartilhar && navigator.canShare) podeCompartilhar = navigator.canShare(dados) === true; }
  catch { podeCompartilhar = false; }
  nativo.hidden = !podeCompartilhar;
  copiar.hidden = false;
  let ocupado = false;
  async function executar(acao, origem) {
    if (ocupado) return;
    ocupado = true; raiz.setAttribute('aria-busy', 'true'); status.textContent = '';
    const botoes = [nativo, copiar].map(b => [b, b.disabled]);
    for (const [b] of botoes) b.disabled = true;
    try { await acao(); }
    finally {
      ocupado = false; raiz.removeAttribute('aria-busy');
      for (const [b, desabilitado] of botoes) b.disabled = desabilitado;
      if (origem.isConnected && document.activeElement === document.body) origem.focus();
    }
  }
  function selecionar() { campo.focus(); campo.select(); }
  nativo.onclick = () => executar(async () => {
    try { await navigator.share(dados); status.textContent = 'Compartilhamento concluído no aparelho.'; }
    catch (erro) {
      if (erro?.name === 'AbortError') status.textContent = 'Compartilhamento cancelado. O link continua disponível.';
      else { status.textContent = 'Não foi possível abrir o compartilhamento. Você pode copiar o link selecionado.'; selecionar(); }
    }
  }, nativo);
  copiar.onclick = () => executar(async () => {
    try { await navigator.clipboard.writeText(url.href); status.textContent = 'Link copiado.'; }
    catch { status.textContent = 'O link está selecionado. Copie pelo teclado ou pelo menu do aparelho.'; selecionar(); }
  }, copiar);
}
