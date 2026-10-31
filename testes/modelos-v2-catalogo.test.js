import { it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifesto from '../src/dados/biblioteca-pcm-v2.json';
import { MODELOS_V2, GRUPOS_V2 } from '../src/dados/modelos-v2.js';
import { MODELOS_DOCUMENTAIS } from '../src/dados/modelos-anteriores.js';

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

it('retira exemplos e prévias antigos; mantém só os arquivos do preenchimento automático', () => {
  expect(existsSync('public/modelos/previas')).toBe(false);
  expect(existsSync('public/modelos/refeitos/previas')).toBe(false);
  const raiz = readdirSync('public/modelos').filter((n) => /\.(xlsx|docx)$/.test(n));
  expect(raiz.some((n) => /Exemplo/.test(n))).toBe(false);
  expect(raiz.sort()).toEqual(MODELOS_DOCUMENTAIS.map(([, , , a, ext]) => `${a}.${ext}`).sort());
  expect(readdirSync('public/modelos/refeitos').filter((n) => /\.(xlsx|docx)$/.test(n))).toHaveLength(5);
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
