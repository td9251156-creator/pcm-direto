// Atualizações aguardam o fechamento das abas; nunca recarregam formulários em uso.
export async function registrarAtualizacao(serviceWorker = navigator.serviceWorker) {
  const registro = await serviceWorker.register('./sw.js', { updateViaCache: 'none' });
  function avisarAtualizacao() {
    if (!serviceWorker.controller || document.getElementById('aviso-atualizacao')) return;
    const aviso = document.createElement('aside');
    aviso.id = 'aviso-atualizacao'; aviso.className = 'cartao aviso'; aviso.setAttribute('role', 'status');
    const titulo = document.createElement('strong'); titulo.textContent = 'Uma atualização está pronta.';
    const texto = document.createElement('p');
    texto.textContent = 'Termine seu trabalho, feche todas as abas do PCM Direto e abra novamente para atualizar. Sua tela não será recarregada automaticamente.';
    const backup = document.createElement('a'); backup.href = '#dados'; backup.textContent = 'Guardar um backup antes de fechar';
    aviso.append(titulo, texto, backup);
    document.getElementById('conteudo')?.before(aviso);
  }
  function acompanhar(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && registro.waiting) avisarAtualizacao();
    });
  }
  if (registro.waiting) avisarAtualizacao();
  acompanhar(registro.installing);
  registro.addEventListener('updatefound', () => acompanhar(registro.installing));
  return registro;
}
