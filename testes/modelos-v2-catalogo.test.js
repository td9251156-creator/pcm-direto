import { it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifesto from '../src/dados/biblioteca-pcm-v2.json';
import { MODELOS_V2, GRUPOS_V2, PROCEDIMENTOS_PRONTOS } from '../src/dados/modelos-v2.js';

it('oferece para download exatamente os 19 modelos da Biblioteca PCM v2, conferidos por hash', () => {
  expect(MODELOS_V2).toHaveLength(19);
  expect(MODELOS_V2.filter((m) => m.formato === 'Excel')).toHaveLength(16);
  expect(new Set(MODELOS_V2.map((m) => m.codigo)).size).toBe(19);
  for (const m of MODELOS_V2) {
    const origem = manifesto.modelos.find((x) => x.codigo === m.codigo);
    expect(m.url).toBe(`./modelos/biblioteca-v2/${origem.arquivo}`);
    const bytes = readFileSync(`public/modelos/biblioteca-v2/${origem.arquivo}`);
    expect(createHash('sha256').update(bytes).digest('hex'), m.codigo).toBe(origem.sha256);
    expect(GRUPOS_V2).toContain(m.grupo);
    expect(m.quando.length, m.codigo).toBeGreaterThan(20);
    expect(m.titulo).not.toMatch(/Manutencao|Seguranca|Acao|Orcamento|Licao|Pecas|Estrategia/);
  }
});

it('o site só publica os modelos da Biblioteca v2: nenhum PCMD, refeito, exemplo ou prévia antiga', () => {
  expect(existsSync('public/modelos/previas')).toBe(false);
  expect(existsSync('public/modelos/refeitos')).toBe(false);
  expect(readdirSync('public/modelos').filter((n) => /\.(xlsx|docx)$/i.test(n))).toEqual([]);
  expect(readdirSync('public/modelos/biblioteca-v2').every((n) => n.startsWith('PCM-MAN-'))).toBe(true);
});

it('as telas usam o padrão PCM-MAN, sem código PCMD', () => {
  for (const pasta of ['src/telas', 'src/saida', 'src/dados']) {
    for (const nome of readdirSync(pasta).filter((n) => n.endsWith('.js'))) {
      expect(readFileSync(`${pasta}/${nome}`, 'utf8'), nome).not.toMatch(/PCMD|entrega-modelos/);
    }
  }
});

it('a página Conheça o projeto lista os 19 modelos v2 e nenhum arquivo removido', () => {
  const html = readFileSync('public/conheca.html', 'utf8');
  for (const m of MODELOS_V2) expect(html, m.codigo).toContain(`href="${m.url}"`);
  expect(html).not.toMatch(/modelos\/refeitos\/|-Exemplo\.|\/previas\//);
});

it('nenhuma tela aponta para arquivos antigos removidos', () => {
  for (const pasta of ['src/telas', 'src/saida', 'src/dados']) {
    for (const nome of readdirSync(pasta).filter((n) => n.endsWith('.js'))) {
      const texto = readFileSync(`${pasta}/${nome}`, 'utf8');
      expect(texto, nome).not.toMatch(/-Exemplo\.|modelos\/previas|refeitos\/previas|COMO-USAR/);
    }
  }
});

it('o procedimento pronto de MTBF, MTTR e disponibilidade é publicado íntegro, fora da contagem dos 19 modelos', () => {
  expect(PROCEDIMENTOS_PRONTOS).toHaveLength(1);
  for (const m of PROCEDIMENTOS_PRONTOS) {
    expect(createHash('sha256').update(readFileSync(`public/modelos/biblioteca-v2/${m.arquivo}`)).digest('hex')).toBe(m.sha256);
    expect(m.url).toBe(`./modelos/biblioteca-v2/${m.arquivo}`);
    expect(MODELOS_V2.some((x) => x.arquivo === m.arquivo)).toBe(false);
  }
});