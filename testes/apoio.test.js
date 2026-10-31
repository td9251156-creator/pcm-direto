import { describe, it, expect } from 'vitest';
import { ARTIGOS, GLOSSARIO, TRILHAS } from '../src/dados/apoio.js';

describe('Central de apoio', () => {
  it('cada artigo tem id único, trilha conhecida e todos os campos preenchidos', () => {
    const trilhas = new Set(TRILHAS.map(([id]) => id));
    const ids = ARTIGOS.map(([id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const artigo of ARTIGOS) {
      expect(artigo).toHaveLength(7);
      expect(trilhas.has(artigo[1])).toBe(true);
      for (const campo of artigo) expect(String(campo).trim()).not.toBe('');
      expect(artigo[6]).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });

  it('toda trilha tem pelo menos um artigo', () => {
    for (const [id] of TRILHAS) expect(ARTIGOS.some((a) => a[1] === id)).toBe(true);
  });

  it.each([
    ['ordens-servico', ['PCMD-K02', 'equipamento', 'solicitação', 'prioridade', 'responsável', 'encerramento']],
    ['estoque-compras', ['PCMD-K04', 'PCMD-K05', 'saldo inicial', 'movimentação', 'pedido', 'recebimento']],
    ['plano-acao-5w2h', ['PCMD-K07', 'o que', 'por quê', 'onde', 'quando', 'quem', 'como', 'quanto', 'avanço']],
  ])('orienta o modelo em %s na trilha de modelos', (id, orientacoes) => {
    const artigo = ARTIGOS.find(([artigoId]) => artigoId === id);
    expect(artigo).toBeDefined();
    expect(artigo[1]).toBe('modelos');
    for (const indice of [2, 3, 5]) expect(artigo[indice].trim()).not.toBe('');
    const conteudo = artigo.slice(2, 6).join(' ');
    for (const orientacao of orientacoes) expect(conteudo).toContain(orientacao);
    expect(artigo[5]).toContain('Mais → Modelos para sua rotina');
    expect(artigo[5]).toContain('arquivo');
    expect(artigo[6]).toBe('27/10/2026');
    expect(conteudo).not.toMatch(/\b(NR|NBR|ISO)[ -]?\d/i);
  });

  it('nenhum texto promete conformidade, aprovação ou ganho', () => {
    const textos = [...ARTIGOS.flat(), ...GLOSSARIO.flat()].join(' ').toLowerCase();
    for (const proibido of ['garante', 'garantido', 'certificado', 'em conformidade com', 'aprovação em auditoria']) {
      expect(textos).not.toContain(proibido);
    }
  });

  it('não cita número de norma sem fonte', () => {
    const textos = [...ARTIGOS.flat(), ...GLOSSARIO.flat()].join(' ');
    expect(textos).not.toMatch(/\b(NR|NBR|ISO)[ -]?\d/);
  });
});
