// Recursos da conferência de navegador: prazos explícitos e encerramento mesmo em falhas.
import { preview } from 'vite';

export async function comPrazo(operacao, limite, mensagem) {
  let temporizador;
  try {
    return await Promise.race([
      operacao,
      new Promise((_, rejeitar) => { temporizador = setTimeout(() => rejeitar(new Error(mensagem)), limite); }),
    ]);
  } finally {
    clearTimeout(temporizador);
  }
}

export function iniciarServidor({ raiz, porta = 4175 }) {
  // A API só resolve depois de criar o próprio servidor; não aceita resposta de outro processo.
  return preview({ root: raiz, preview: { host: '127.0.0.1', port: porta, strictPort: true } });
}

export async function aguardarOffline(page, limite = 20000) {
  try {
    await comPrazo(
      page.waitForFunction(() => navigator.serviceWorker?.controller?.state === 'activated', null, { timeout: limite }),
      limite,
      'O serviço offline não ficou pronto dentro do prazo.',
    );
  } catch (causa) {
    throw new Error('O serviço offline não ficou pronto dentro do prazo.', { cause: causa });
  }
}

export async function executarComRecursos({ criarServidor, criarNavegador, executar, limiteTotal = 180000, limiteFechamento = 10000 }) {
  let servidor;
  let navegador;
  let encerrando = false;
  const fechar = (recurso) => comPrazo(recurso.close(), limiteFechamento, 'Um recurso do teste não encerrou dentro do prazo.');
  const operacao = (async () => {
    servidor = await criarServidor();
    if (encerrando) { await fechar(servidor); return; }
    navegador = await criarNavegador();
    if (encerrando) { await fechar(navegador); return; }
    return executar({ servidor, navegador });
  })();

  let resultado;
  let falha;
  const falhas = [];
  try {
    resultado = await comPrazo(operacao, limiteTotal, 'A conferência de navegador excedeu o prazo total.');
  } catch (erro) {
    falha = erro;
  } finally {
    encerrando = true;
    // Tenta fechar ambos, mesmo se um deles falhar. Fecha primeiro as conexões do navegador.
    for (const recurso of [navegador, servidor]) {
      if (!recurso) continue;
      try { await fechar(recurso); } catch (erro) { falhas.push(erro); }
    }
  }
  if (falhas.length) throw new AggregateError(falha ? [falha, ...falhas] : falhas, 'Falha ao encerrar os recursos da conferência.');
  if (falha) throw falha;
  return resultado;
}
