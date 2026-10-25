// Uma transação contém a base inteira. A sequência impede sobrescrever outra aba.
export const FORMATO_BASE = 3;
export function abrirRepositorio({ indexedDB = globalThis.indexedDB, nome = 'pcm-direto:base:v3' } = {}) {
  if (!indexedDB) return Promise.reject(new Error('O armazenamento local não está disponível neste navegador.'));
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(nome, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains('base')) pedido.result.createObjectStore('base');
    };
    pedido.onerror = () => reject(pedido.error ?? new Error('Não foi possível abrir os dados locais.'));
    pedido.onblocked = () => reject(new Error('Feche as outras abas do PCM Direto para atualizar os dados.'));
    pedido.onsuccess = () => {
      const db = pedido.result;
      let fechada = false;
      db.onversionchange = () => { fechada = true; db.close(); };
      const verificar = () => { if (fechada) throw new Error('Outra versão atualizou os dados. Reabra o aplicativo.'); };
      resolve({
        async ler() {
          verificar();
          return new Promise((ok, falha) => {
            const tx = db.transaction('base', 'readonly');
            const req = tx.objectStore('base').get('principal');
            tx.oncomplete = () => ok(req.result ?? null);
            tx.onabort = () => falha(tx.error ?? new Error('A leitura foi interrompida.'));
            tx.onerror = () => {};
          });
        },
        async gravar(dados, sequenciaEsperada, { recuperarAnterior = false } = {}) {
          verificar();
          return new Promise((ok, falha) => {
            const tx = db.transaction('base', 'readwrite'); const store = tx.objectStore('base');
            let motivo; let novaSequencia;
            const req = store.get('principal');
            req.onsuccess = () => {
              const anterior = req.result;
              if (anterior && anterior.formato !== FORMATO_BASE) {
                motivo = new Error('Estes dados pertencem a outra versão. Atualize o aplicativo; os originais foram preservados.'); tx.abort(); return;
              }
              if ((anterior?.sequencia ?? 0) !== sequenciaEsperada) {
                motivo = new Error('Outra aba alterou os dados. Baixe suas alterações e reabra o aplicativo antes de continuar.'); tx.abort(); return;
              }
              try {
                if (anterior && recuperarAnterior) store.put(anterior, `recuperacao:${anterior.sequencia}`);
                novaSequencia = sequenciaEsperada + 1;
                store.put({ formato: FORMATO_BASE, sequencia: novaSequencia, dados: structuredClone(dados) }, 'principal');
              } catch (erro) {
                motivo = erro;
                // Um erro síncrono no callback também precisa abortar toda a transação.
                try { tx.abort(); } catch { /* Já abortada; onabort informa a falha. */ }
              }
            };
            tx.oncomplete = () => ok(novaSequencia);
            tx.onabort = () => falha(motivo ?? tx.error ?? new Error('A gravação foi interrompida. Os dados anteriores foram mantidos.'));
            tx.onerror = () => {};
          });
        },
        fechar() { fechada = true; db.close(); },
      });
    };
  });
}
