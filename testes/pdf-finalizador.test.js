import { describe, expect, it, vi } from 'vitest';
import { criarFinalizador } from '../supabase/functions/catalogo-finalizar-pdf/handler.js';

const id = '10000000-0000-0000-0000-000000000001';
const autor = '20000000-0000-0000-0000-000000000002';
const bytes = new TextEncoder().encode('%PDF-1.7\n%%EOF');
const hash = async () => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
const requisicao = async (extra = {}, autenticada = true) => new Request('https://exemplo.invalid/pdf', {
  method: 'POST', headers: autenticada ? { Authorization: 'Bearer token-ficticio' } : {},
  body: JSON.stringify({ id, sha256: await hash(), ...extra }),
});
function preparar({ outroAutor = false, falhaVinculo = false, sessaoInvalida = false } = {}) {
  const download = vi.fn(async () => ({ data: new Blob([bytes]), error: null }));
  const rpc = vi.fn(async () => ({ data: { caminho: 'caminho-do-servidor.pdf' }, error: falhaVinculo ? {} : null }));
  const consulta = { eq: () => consulta, single: async () => ({ data: {
    autor_id: outroAutor ? 'outra-conta' : autor, situacao: 'rascunho', pdf_reserva: 'caminho-do-servidor.pdf', conteudo_versao: 7,
  } }) };
  const usuario = { auth: { getUser: vi.fn(async () => ({ data: { user: sessaoInvalida ? null : { id: autor } } })) },
    from: () => ({ select: () => consulta }), storage: { from: () => ({ download }) } };
  const createClient = vi.fn((_url, chave) => chave === 'chave-administrativa-ficticia' ? { rpc } : usuario);
  const PDFDocument = { load: vi.fn(async () => ({ getPageCount: () => 1 })) };
  const ambiente = nome => ({ SUPABASE_URL: 'https://exemplo.invalid', SUPABASE_ANON_KEY: 'chave-publica-ficticia', SUPABASE_SERVICE_ROLE_KEY: 'chave-administrativa-ficticia' })[nome];
  return { executar: criarFinalizador({ createClient, PDFDocument, ambiente }), download, rpc, createClient, PDFDocument };
}

describe('Finalização autenticada do PDF no servidor', () => {
  it('recusa ausência de token, sessão inválida, autor diferente e caminho fornecido pelo cliente', async () => {
    const p = preparar();
    expect((await p.executar(await requisicao({}, false))).status).toBe(401);
    expect(p.createClient).not.toHaveBeenCalled();
    expect((await p.executar(await requisicao({ caminho: 'arquivo-alheio.pdf' }))).status).toBe(400);
    expect(p.download).not.toHaveBeenCalled();
    const q = preparar({ outroAutor: true });
    expect((await q.executar(await requisicao())).status).toBe(403);
    expect(q.download).not.toHaveBeenCalled();
    const r = preparar({ sessaoInvalida: true });
    expect((await r.executar(await requisicao())).status).toBe(401);
    expect(r.download).not.toHaveBeenCalled();
  });
  it('deriva caminho do modelo e só vincula com cliente administrativo separado e versão lida', async () => {
    const p = preparar();
    expect((await p.executar(await requisicao())).status).toBe(200);
    expect(p.download).toHaveBeenCalledWith('caminho-do-servidor.pdf');
    expect(p.rpc).toHaveBeenCalledWith('catalogo_vincular_pdf', { p_id: id, p_autor: autor, p_versao: 7, p_sha256: await hash(), p_tamanho: bytes.length });
    expect(p.createClient.mock.calls[1][2].global).toBeUndefined();
    expect(p.PDFDocument.load).toHaveBeenCalledOnce();
  });
  it('não vincula arquivo diferente, inválido ou modelo alterado durante a validação', async () => {
    const p = preparar();
    expect((await p.executar(await requisicao({ sha256: 'a'.repeat(64) }))).status).toBe(409);
    expect(p.rpc).not.toHaveBeenCalled();
    p.PDFDocument.load.mockRejectedValue(new Error('detalhe interno'));
    const resposta = await p.executar(await requisicao());
    expect(resposta.status).toBe(400);
    expect(await resposta.text()).not.toContain('detalhe interno');
    expect(p.rpc).not.toHaveBeenCalled();
    const q = preparar({ falhaVinculo: true });
    expect((await q.executar(await requisicao())).status).toBe(409);
  });
  it('limita o corpo e responde ao preflight sem consultar dados', async () => {
    const p = preparar();
    expect((await p.executar(new Request('https://exemplo.invalid', { method: 'OPTIONS' }))).status).toBe(200);
    expect((await p.executar(new Request('https://exemplo.invalid', { method: 'POST', headers: { Authorization: 'Bearer ficticio' }, body: 'x'.repeat(4097) }))).status).toBe(413);
    expect(p.createClient).not.toHaveBeenCalled();
  });
});
