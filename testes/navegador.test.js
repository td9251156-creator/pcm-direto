import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iniciarServidor, aguardarOffline, executarComRecursos } from '../scripts/navegador.mjs';

afterEach(() => vi.useRealTimers());

describe('conferência de navegador com prazos e recursos próprios', () => {
  it('recusa uma porta ocupada em vez de testar a resposta de outro servidor', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'pcm-navegador-'));
    await mkdir(join(raiz, 'dist'));
    await writeFile(join(raiz, 'dist', 'index.html'), '<html><title>Teste fictício</title></html>');
    const ocupado = createServer((_, res) => res.end('Este servidor não pertence ao roteiro.'));
    await new Promise((resolve) => ocupado.listen(0, '127.0.0.1', resolve));
    const porta = ocupado.address().port;
    try {
      await expect(iniciarServidor({ raiz, porta })).rejects.toThrow(/already in use/);
      expect(await (await fetch(`http://127.0.0.1:${porta}/`)).text()).toBe('Este servidor não pertence ao roteiro.');
    } finally {
      await new Promise((resolve, reject) => ocupado.close((erro) => erro ? reject(erro) : resolve()));
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('falha no prazo se o serviço offline nunca ficar pronto', async () => {
    vi.useFakeTimers();
    const page = { waitForFunction: vi.fn(() => new Promise(() => {})) };
    const resultado = expect(aguardarOffline(page, 50)).rejects.toThrow(/serviço offline não ficou pronto/);
    await vi.advanceTimersByTimeAsync(50);
    await resultado;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fecha navegador e servidor quando o roteiro falha', async () => {
    const servidor = { close: vi.fn(async () => {}) };
    const navegador = { close: vi.fn(async () => {}) };
    await expect(executarComRecursos({
      criarServidor: async () => servidor,
      criarNavegador: async () => navegador,
      executar: async () => { throw new Error('Falha fictícia de navegação'); },
    })).rejects.toThrow('Falha fictícia de navegação');
    expect(navegador.close).toHaveBeenCalledOnce();
    expect(servidor.close).toHaveBeenCalledOnce();
  });

  it('fecha o servidor quando o navegador não consegue iniciar', async () => {
    const servidor = { close: vi.fn(async () => {}) };
    await expect(executarComRecursos({
      criarServidor: async () => servidor,
      criarNavegador: async () => { throw new Error('Navegador indisponível'); },
      executar: vi.fn(),
    })).rejects.toThrow('Navegador indisponível');
    expect(servidor.close).toHaveBeenCalledOnce();
  });

  it('encerra os recursos ao exceder o prazo total, mesmo com roteiro que não termina', async () => {
    vi.useFakeTimers();
    const servidor = { close: vi.fn(async () => {}) };
    const navegador = { close: vi.fn(async () => {}) };
    const resultado = expect(executarComRecursos({
      criarServidor: async () => servidor,
      criarNavegador: async () => navegador,
      executar: () => new Promise(() => {}),
      limiteTotal: 50,
    })).rejects.toThrow(/prazo total/);
    await vi.advanceTimersByTimeAsync(50);
    await resultado;
    expect(navegador.close).toHaveBeenCalledOnce();
    expect(servidor.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('tenta fechar o servidor mesmo se o navegador falhar ao encerrar', async () => {
    const servidor = { close: vi.fn(async () => {}) };
    const navegador = { close: vi.fn(async () => { throw new Error('Falha fictícia ao fechar'); }) };
    await expect(executarComRecursos({
      criarServidor: async () => servidor,
      criarNavegador: async () => navegador,
      executar: async () => true,
    })).rejects.toThrow(/encerrar os recursos/);
    expect(servidor.close).toHaveBeenCalledOnce();
  });

  it('limita o prazo de fechamento e ainda tenta encerrar o outro recurso', async () => {
    vi.useFakeTimers();
    const servidor = { close: vi.fn(async () => {}) };
    const navegador = { close: vi.fn(() => new Promise(() => {})) };
    const resultado = expect(executarComRecursos({
      criarServidor: async () => servidor,
      criarNavegador: async () => navegador,
      executar: async () => true,
      limiteFechamento: 50,
    })).rejects.toThrow(/encerrar os recursos/);
    await vi.advanceTimersByTimeAsync(50);
    await resultado;
    expect(servidor.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fecha um navegador que termina de iniciar somente após o prazo total', async () => {
    vi.useFakeTimers();
    let resolverNavegador;
    const servidor = { close: vi.fn(async () => {}) };
    const navegador = { close: vi.fn(async () => {}) };
    const executar = vi.fn();
    const resultado = expect(executarComRecursos({
      criarServidor: async () => servidor,
      criarNavegador: () => new Promise((resolve) => { resolverNavegador = resolve; }),
      executar,
      limiteTotal: 50,
    })).rejects.toThrow(/prazo total/);
    await vi.advanceTimersByTimeAsync(50);
    await resultado;
    resolverNavegador(navegador);
    await vi.advanceTimersByTimeAsync(0);
    expect(navegador.close).toHaveBeenCalledOnce();
    expect(servidor.close).toHaveBeenCalledOnce();
    expect(executar).not.toHaveBeenCalled();
  });
});
