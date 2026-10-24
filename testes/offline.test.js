import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { versaoDoCache } from '../vite.config.js';

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
  const codigo = readFileSync('src/sw.js', 'utf8').replace('[/*ARQUIVOS*/]', JSON.stringify(['./index.html', './assets/app.js']));
  runInNewContext(codigo, { self, caches, fetch, URL, encodeURIComponent });
  return { scope, prefixo, eventos, cache, caches, fetch, self };
}

describe('cache do aplicativo', () => {
  it('instala a página e os arquivos necessários antes de assumir o controle', async () => {
    const w = worker();
    let pronto;
    w.eventos.install({ waitUntil: (p) => { pronto = p; } });
    await pronto;
    expect(w.cache.addAll.mock.calls[0][0]).toEqual(['./', './index.html', './assets/app.js']);
  });

  it('usa arquivo guardado sem pedir a rede e busca arquivos ausentes', async () => {
    const w = worker();
    const req = { method: 'GET', url: w.scope + 'assets/app.js' };
    let resposta;
    w.eventos.fetch({ request: req, respondWith: (p) => { resposta = p; } });
    expect(await resposta).toBe('página offline');
    expect(w.cache.match).toHaveBeenCalledWith(req, { ignoreSearch: true, ignoreVary: true });
    expect(w.fetch).not.toHaveBeenCalled();
    w.cache.match.mockResolvedValue(undefined);
    w.eventos.fetch({ request: req, respondWith: (p) => { resposta = p; } });
    await resposta;
    expect(w.fetch).toHaveBeenCalledWith(req);
  });

  it('mantém HTML da versão ativa mesmo quando a rede oferece outra versão', async () => {
    const w = worker();
    let resposta;
    w.eventos.fetch({
      request: { method: 'GET', url: w.scope, mode: 'navigate' },
      respondWith: (p) => { resposta = p; }, waitUntil: () => {},
    });
    expect(await resposta).toBe('página offline');
    expect(w.fetch).not.toHaveBeenCalled();
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it('não força uma atualização a tomar as abas abertas', async () => {
    const w = worker();let pronto;
    w.eventos.install({ waitUntil: p => { pronto=p; } });await pronto;
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
  });
  it('consulta propostas pelo próprio endereço sem substituir a página principal', async () => {
    const w=worker();let resposta;const req={method:'GET',url:w.scope+'propostas/index.html',mode:'navigate'};
    w.eventos.fetch({request:req,respondWith:p=>{resposta=p;},waitUntil:()=>{}});await resposta;
    expect(w.cache.match).toHaveBeenCalledWith(req,{ignoreSearch:true,ignoreVary:true});
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it('muda de versão quando manifesto, ícone ou worker muda sem trocar o nome', () => {
    const base = [['manifest.webmanifest', 'primeiro'], ['icone.png', 'imagem'], ['sw.js', 'worker']];
    const anterior = versaoDoCache(base);
    for (let i = 0; i < base.length; i++) {
      const alterado = base.map(([nome, conteudo], j) => [nome, j === i ? conteudo + 'novo' : conteudo]);
      expect(versaoDoCache(alterado)).not.toBe(anterior);
    }
    expect(versaoDoCache([...base].reverse())).toBe(anterior);
  });
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
