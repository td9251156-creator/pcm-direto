import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker() {
  const scope = 'https://exemplo.test/pcm/';
  const prefixo = 'pcm-direto-' + encodeURIComponent(scope) + '-';
  const eventos = {};
  const cache = { addAll: vi.fn(async () => {}), put: vi.fn(async () => {}), match: vi.fn(async () => 'página offline') };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => [prefixo + 'antigo', 'outro-app', 'pcm-direto-outro-endereco-antigo']),
    delete: vi.fn(async () => true),
  };
  const self = { registration: { scope }, clients: { claim: vi.fn() }, skipWaiting: vi.fn(), addEventListener: (n, f) => { eventos[n] = f; } };
  const fetch = vi.fn(async () => ({ ok: true, clone: () => 'página nova' }));
  runInNewContext(readFileSync('src/sw.js', 'utf8'), { self, caches, fetch, URL, encodeURIComponent });
  return { scope, prefixo, eventos, cache, caches, fetch };
}

describe('cache do aplicativo', () => {
  it('remove apenas versões antigas do mesmo aplicativo e endereço', async () => {
    const w = worker();
    let pronto;
    w.eventos.activate({ waitUntil: (p) => { pronto = p; } });
    await pronto;
    expect(w.caches.delete.mock.calls).toEqual([[w.prefixo + 'antigo']]);
  });

  it('abre sem conexão consultando apenas o próprio cache', async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error('Sem conexão'));
    let resposta;
    w.eventos.fetch({ request: { method: 'GET', url: w.scope, mode: 'navigate' }, respondWith: (p) => { resposta = p; } });
    expect(await resposta).toBe('página offline');
    expect(w.caches.open).toHaveBeenCalledWith(w.prefixo + '/*VERSAO*/');
  });

  it('não substitui a página offline por resposta de erro', async () => {
    const w = worker();
    w.fetch.mockResolvedValue({ ok: false });
    let resposta;
    w.eventos.fetch({ request: { method: 'GET', url: w.scope, mode: 'navigate' }, respondWith: (p) => { resposta = p; } });
    await resposta;
    expect(w.cache.put).not.toHaveBeenCalled();
  });

  it('não intercepta pedidos fora do escopo ou gravações', () => {
    const w = worker();
    const respondWith = vi.fn();
    w.eventos.fetch({ request: { method: 'GET', url: 'https://exemplo.test/outro/' }, respondWith });
    w.eventos.fetch({ request: { method: 'POST', url: w.scope }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
});
