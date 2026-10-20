import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import padrao from '../src/dados/biblioteca.json';
import { criarBackup, verificarBackup } from '../src/logica/backup.js';

const eq = { id: 'eq1', setor: 'UTL', tipo: 'motor_eletrico', numero: 1, tag: 'UTL-MOT-001', descricao: 'Motor fictício' };
const modelo = () => ({ equipamentos: [eq], ajustes: {}, execucoes: { 'eq1|MOT-01': { data: '2026-10-20', observacao: 'Registro fictício' } }, capacidade: { Elétrica: 8 }, inicio: '2027-01-04', exemplo: false, biblioteca: structuredClone(padrao) });
let dados;
beforeEach(() => {
  vi.resetModules();
  dados = new Map();
  vi.stubGlobal('localStorage', { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k) });
});
afterEach(() => vi.unstubAllGlobals());

describe('backup completo', () => {
  it('inclui todos os dados e não compartilha referências com a sessão', () => {
    const estado = modelo();
    const backup = criarBackup(estado);
    expect(verificarBackup(backup, padrao).ok).toBe(true);
    expect(backup.rascunho.equipamentos).toEqual(estado.equipamentos);
    expect(backup.rascunho.execucoes).toEqual(estado.execucoes);
    backup.biblioteca.tipos[0].nome = 'Outro nome';
    expect(estado.biblioteca.tipos[0].nome).toBe(padrao.tipos[0].nome);
  });

  it('recusa versão desconhecida, lista inválida e retirada de tarefa de segurança', () => {
    const b = criarBackup(modelo());
    expect(verificarBackup({ ...b, versao: 2 }, padrao).ok).toBe(false);
    expect(verificarBackup({ ...b, rascunho: { equipamentos: [null] } }, padrao).ok).toBe(false);
    b.biblioteca.tipos[0].tarefas = [];
    expect(verificarBackup(b, padrao).ok).toBe(false);
  });

  it('restaura biblioteca, lista e marcações juntas e mantém após reabrir', async () => {
    const app = await import('../src/estado.js');
    app.carregar();
    const b = criarBackup(modelo());
    expect(app.restaurarBackup(b).ok).toBe(true);
    app.carregar();
    expect(app.estado.equipamentos).toEqual([eq]);
    expect(app.estado.execucoes).toEqual(b.rascunho.execucoes);
    expect(app.estado.capacidade).toEqual({ Elétrica: 8 });
  });

  it('mantém o par antigo quando a gravação do rascunho falha após gravar a biblioteca', async () => {
    const app = await import('../src/estado.js');
    app.carregar();
    app.usarBiblioteca(structuredClone(padrao));
    const antes = new Map(dados);
    const gravar = localStorage.setItem;
    let falhou = false;
    localStorage.setItem = (k, v) => {
      if (k === 'pcm-direto:rascunho:v1' && !falhou) { falhou = true; throw new Error('Sem espaço'); }
      return gravar(k, v);
    };
    expect(app.restaurarBackup(criarBackup(modelo())).ok).toBe(false);
    expect(dados).toEqual(antes);
  });

  it('recupera sessão interrompida usando o par anterior, mesmo se a escrita continuar bloqueada', async () => {
    const app = await import('../src/estado.js');
    app.carregar();
    app.usarBiblioteca(structuredClone(padrao));
    const listaAnterior = structuredClone(app.estado.equipamentos);
    const gravar = localStorage.setItem;
    let escritas = 0;
    localStorage.setItem = (k, v) => { if (++escritas > 2) throw new Error('Bloqueado'); return gravar(k, v); };
    expect(app.restaurarBackup(criarBackup(modelo())).ok).toBe(false);
    app.carregar();
    expect(app.estado.equipamentos).toEqual(listaAnterior);
    expect(dados.has('pcm-direto:transacao:v1')).toBe(true);
    localStorage.setItem = gravar;
    app.carregar();
    expect(dados.has('pcm-direto:transacao:v1')).toBe(false);
    expect(app.estado.equipamentos).toEqual(listaAnterior);
  });
});
