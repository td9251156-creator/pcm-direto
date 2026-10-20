import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import padrao from '../src/dados/biblioteca.json';
import { lerRascunho, dataValida } from '../src/logica/rascunho.js';

const CHAVE = 'pcm-direto:rascunho:v1';
const BIB = 'pcm-direto:biblioteca:v1';
const equipamento = { id: 'eq1', setor: 'UTL', tipo: 'motor_eletrico', descricao: 'Motor fictício', numero: 1, tag: 'UTL-MOT-001' };
let dados;
beforeEach(() => {
  vi.resetModules();
  dados = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('rascunhos e biblioteca salvos', () => {
  it('mantém biblioteca editada, capacidade, início e ajustes após gravar e reabrir', async () => {
    const app = await import('../src/estado.js');
    app.carregar();
    const bib = structuredClone(padrao);
    bib.tipos[0].tarefas[0].descricao = 'Descrição fictícia revisada';
    app.usarBiblioteca(bib);
    app.estado.equipamentos = [equipamento];
    app.estado.exemplo = false;
    app.estado.inicio = '2027-01-04';
    app.estado.capacidade = { Elétrica: 8 };
    app.estado.ajustes = { 'eq1|MOT-01': { periodicidade: 'Semanal' } };
    app.estado.execucoes = { 'eq1|MOT-01': { data: '2026-10-20', observacao: 'Conferência fictícia' } };
    expect(app.salvar()).toBe(true);
    app.carregar();
    expect(app.estado.biblioteca).toEqual(bib);
    expect(app.estado.bibliotecaEditada).toBe(true);
    expect(app.estado.inicio).toBe('2027-01-04');
    expect(app.estado.capacidade).toEqual({ Elétrica: 8 });
    expect(app.estado.ajustes['eq1|MOT-01'].periodicidade).toBe('Semanal');
    expect(app.estado.execucoes['eq1|MOT-01'].observacao).toBe('Conferência fictícia');
    expect(app.estado.equipamentos).toEqual([equipamento]);
  });

  it('não duplica cópias de recuperação a cada gravação da mesma sessão', async () => {
    dados.set(CHAVE, '{');
    const app = await import('../src/estado.js');
    app.carregar();
    app.salvar();
    app.salvar();
    expect([...dados.keys()].filter((k) => k.startsWith('pcm-direto:recuperacao:'))).toHaveLength(1);
  });

  it('mantém travas de segurança mesmo com ajuste proibido no rascunho antigo', async () => {
    dados.set(CHAVE, JSON.stringify({ equipamentos: [equipamento], ajustes: { 'eq1|MOT-06': { ativa: false, periodicidade: 'Anual' } } }));
    const app = await import('../src/estado.js');
    app.carregar();
    const tarefa = app.dadosAtuais().plano.find((t) => t.tarefaId === 'MOT-06');
    expect(tarefa.ativa).toBe(true);
    expect(tarefa.periodicidade).toBe('Semestral');
  });
  it('avisa falhas de escrita e só limpa a falha da biblioteca após gravá-la', async () => {
    const app = await import('../src/estado.js');
    app.carregar();
    const gravar = localStorage.setItem;
    localStorage.setItem = (k, v) => { if (k === BIB) throw new Error('Sem espaço'); return gravar(k, v); };
    expect(app.usarBiblioteca(structuredClone(padrao))).toBe(false);
    expect(app.armazenamento.biblioteca).toBe(false);
    expect(app.salvar()).toBe(true);
    expect(app.armazenamento.biblioteca).toBe(false);
    localStorage.setItem = gravar;
    expect(app.usarBiblioteca(structuredClone(padrao))).toBe(true);
    expect(app.armazenamento.biblioteca).toBe(true);
  });

  it('informa bloqueio de leitura sem interromper o app', async () => {
    localStorage.getItem = () => { throw new Error('Bloqueado'); };
    const app = await import('../src/estado.js');
    app.carregar();
    expect(app.armazenamento.leitura).toBe(false);
    expect(app.estado.equipamentos.length).toBeGreaterThan(0);
  });
  it('abre rascunho antigo, sem campos novos, mantendo equipamentos e ajustes', async () => {
    const ajustes = { 'eq1|MOT-01': { ativa: false } };
    dados.set(CHAVE, JSON.stringify({ equipamentos: [equipamento], ajustes }));
    const app = await import('../src/estado.js');
    app.carregar();
    expect(app.estado.equipamentos).toEqual([equipamento]);
    expect(app.estado.ajustes).toEqual(ajustes);
    expect(app.estado.capacidade).toEqual({});
    expect(app.recuperacao).toEqual([]);
    expect(app.salvar()).toBe(true);
    expect(JSON.parse(dados.get(CHAVE)).equipamentos).toEqual([equipamento]);
  });

  it('mantém uma lista vazia intencional, sem trocar pelo exemplo', async () => {
    dados.set(CHAVE, JSON.stringify({ equipamentos: [] }));
    const app = await import('../src/estado.js');
    app.carregar();
    expect(app.estado.equipamentos).toEqual([]);
    expect(app.estado.exemplo).toBe(false);
  });

  it.each(['{', 'null', '{"equipamentos":[null]}', '{"equipamentos":{}}'])('preserva rascunho inválido e guarda original antes de salvar: %s', async (original) => {
    dados.set(CHAVE, original);
    const app = await import('../src/estado.js');
    app.carregar();
    expect(dados.get(CHAVE)).toBe(original);
    expect(app.estado.equipamentos).toEqual([]);
    expect(app.recuperacao).toEqual([{ chave: CHAVE, original }]);
    expect(app.salvar()).toBe(true);
    const arquivo = [...dados].find(([k]) => k.startsWith('pcm-direto:recuperacao:v1:'));
    expect(JSON.parse(arquivo[1])).toEqual({ chave: CHAVE, original });
  });

  it('recusa biblioteca salva que retire tarefa de segurança, mantendo o original', async () => {
    const bib = structuredClone(padrao);
    bib.tipos[0].tarefas = [];
    const original = JSON.stringify(bib);
    dados.set(BIB, original);
    const app = await import('../src/estado.js');
    app.carregar();
    expect(app.estado.biblioteca).toEqual(padrao);
    expect(dados.get(BIB)).toBe(original);
    app.restaurarBiblioteca();
    expect([...dados.values()].some((v) => v.includes('"original"'))).toBe(true);
  });

  it('não substitui original quando não consegue guardar a cópia de recuperação', async () => {
    dados.set(CHAVE, '{');
    const app = await import('../src/estado.js');
    app.carregar();
    localStorage.setItem = () => { throw new Error('Sem espaço'); };
    expect(app.salvar()).toBe(false);
    expect(dados.get(CHAVE)).toBe('{');
  });

  it('recusa ids repetidos ou inseguros e ajustes ou capacidades malformados', () => {
    for (const r of [
      { equipamentos: [equipamento, equipamento] },
      { equipamentos: [{ ...equipamento, id: 'id"inválido' }] },
      { equipamentos: [equipamento], ajustes: [] },
      { equipamentos: [equipamento], capacidade: { Mecânica: '8' } },
      { equipamentos: [equipamento], inicio: '2026-02-31' },
    ]) expect(lerRascunho(r)).toBeNull();
  });

  it('rejeita datas inexistentes e preserva datas válidas', () => {
    expect(dataValida('2028-02-29')).toBe(true);
    expect(dataValida('2027-02-29')).toBe(false);
    expect(dataValida('2026-13-01')).toBe(false);
  });
});
