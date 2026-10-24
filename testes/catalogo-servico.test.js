import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ cliente: null, criar: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (...args) => { mock.criar(...args); return mock.cliente; } }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_1234567890abcdefghijkl');
});
describe('Cliente do catálogo e permissões solicitadas', () => {
  it('retoma PDF validado após resposta perdida sem tentar sobrescrever o objeto', async () => {
    const arquivo = new Blob(['%PDF-1.7\nficticio\n%%EOF'], { type: 'application/pdf' });
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
    mock.cliente = { rpc: vi.fn(async () => ({ data: { validado: true, caminho: 'reservado.pdf', sha256: hash } })), storage: { from: vi.fn() } };
    const { anexarPdfModelo } = await import('../src/servicos/catalogo.js');
    expect((await anexarPdfModelo('modelo-ficticio', arquivo)).caminho).toBe('reservado.pdf');
    expect(mock.cliente.storage.from).not.toHaveBeenCalled();
    mock.cliente.rpc.mockResolvedValue({ data: { validado: true, caminho: 'reservado.pdf', sha256: 'a'.repeat(64) } });
    await expect(anexarPdfModelo('modelo-ficticio', arquivo)).rejects.toThrow('outro PDF');
  });
  it('retoma upload HTTP 409 do SDK, valida no servidor e interrompe se a sessão mudou', async () => {
    const arquivo = new Blob(['%PDF-1.7\nficticio\n%%EOF']);
    const upload = vi.fn(async () => ({ error: { status: 409, statusCode: 'ResourceAlreadyExists' } }));
    mock.cliente = { rpc: vi.fn(async () => ({ data: { caminho: 'reservado.pdf' } })), storage: { from: () => ({ upload }) }, functions: { invoke: vi.fn(async () => ({ data: { pdf: { caminho: 'reservado.pdf' } } })) } };
    const { anexarPdfModelo, conferirArquivoPdf } = await import('../src/servicos/catalogo.js');
    expect((await anexarPdfModelo('modelo-ficticio', arquivo)).caminho).toBe('reservado.pdf');
    expect(upload.mock.calls[0][2].upsert).toBe(false);
    expect(mock.cliente.functions.invoke).toHaveBeenCalledOnce();
    await expect(anexarPdfModelo('modelo-ficticio', arquivo, () => false)).rejects.toThrow('sessão mudou');
    expect(mock.cliente.functions.invoke).toHaveBeenCalledOnce();
    await expect(conferirArquivoPdf(new Blob(['<html>falso</html>']))).rejects.toThrow('formato PDF');
    await expect(conferirArquivoPdf(new Blob([new Uint8Array(5000001)]))).rejects.toThrow('5 MB');
  });
  it('reage fora do callback do Auth e cancela eventos pendentes ao sair da tela', async () => {
    vi.useFakeTimers();
    try {
      let evento;
      const unsubscribe = vi.fn();
      mock.cliente = { auth: { onAuthStateChange: vi.fn(cb => {
        evento = cb; return { data: { subscription: { unsubscribe } } };
      }) } };
      const { observarSessaoCatalogo } = await import('../src/servicos/catalogo.js');
      const reagir = vi.fn();
      const parar = await observarSessaoCatalogo(reagir);
      const sessao = { user: { id: 'colaborador-ficticio' } };
      expect(evento('SIGNED_IN', sessao)).toBeUndefined();
      expect(reagir).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(reagir).toHaveBeenCalledWith(sessao, 'SIGNED_IN');
      evento('SIGNED_OUT', null);
      parar();
      await vi.runAllTimersAsync();
      expect(reagir).toHaveBeenCalledTimes(1);
      expect(unsubscribe).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
  it('consulta somente aprovados por padrão e pagina sem escrever dados locais', async () => {
    const q = {}; for (const m of ['select', 'order', 'eq', 'ilike']) q[m] = vi.fn(() => q);
    q.range = vi.fn(async () => ({ data: [], error: null }));
    mock.cliente = { from: vi.fn(() => q) };
    const { listarCatalogo } = await import('../src/servicos/catalogo.js');
    await listarCatalogo({ pagina: 2, busca: 'Motor' });
    expect(mock.cliente.from).toHaveBeenCalledWith('catalogo_modelos');
    expect(q.eq).toHaveBeenCalledWith('situacao', 'aprovado');
    expect(q.range).toHaveBeenCalledWith(40, 59);
  });
  it('usa a função de moderador real e exige conta para filtrar modelos próprios', async () => {
    mock.cliente = { rpc: vi.fn(async () => ({ data: true, error: null })), from: vi.fn(() => ({ select: () => ({ order: () => ({}) }) })) };
    const { moderadorCatalogo, listarCatalogo } = await import('../src/servicos/catalogo.js');
    expect(await moderadorCatalogo()).toBe(true);
    expect(mock.cliente.rpc).toHaveBeenCalledWith('catalogo_e_moderador');
    await expect(listarCatalogo({ meus: true })).rejects.toThrow('Entre na sua conta');
  });
  it('não recebe autor ou situação no salvamento e usa saída local da sessão', async () => {
    mock.cliente = { rpc: vi.fn(async () => ({ data: 'id-ficticio', error: null })), auth: { signOut: vi.fn(async () => ({ error: null })) } };
    const { salvarModelo, sairCatalogo } = await import('../src/servicos/catalogo.js');
    const { modeloVazio } = await import('../src/logica/catalogo.js');
    const dados = { ...modeloVazio(), titulo: 'Exemplo', descricao: 'Fictício' };
    await salvarModelo(dados);
    expect(mock.cliente.rpc).toHaveBeenCalledWith('catalogo_salvar', { p_dados: dados, p_id: null, p_original_id: null });
    await sairCatalogo();
    expect(mock.cliente.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('não expõe detalhes internos de erro do provedor', async () => {
    mock.cliente = { rpc: vi.fn(async () => ({ error: { code: 'XX000', message: 'detalhe interno' } })) };
    const { moderadorCatalogo } = await import('../src/servicos/catalogo.js');
    await expect(moderadorCatalogo()).rejects.toThrow('Não foi possível');
    await expect(moderadorCatalogo()).rejects.not.toThrow('detalhe interno');
  });
});
