import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { conferirAlteracoes, conferirRevisao } from '../scripts/agentes-ia.mjs';

const helper = resolve('scripts/agentes-ia.mjs');
const raw = (nome, modo = '100644', estado = 'M') => `:100644 ${modo} abc123 abc456 ${estado}\0${nome}\0`;

describe('limites da implementação automática', () => {
  it('aceita uma correção pequena e recusa arquivos administrativos e técnicos', () => {
    expect(conferirAlteracoes(raw('src/telas/inicio.js'), '2\t1\tsrc/telas/inicio.js')).toBe(true);
    for (const nome of ['.github/workflows/publicar.yml', 'package.json', 'src/dados/biblioteca.js', 'AGENTS.md', 'src/../scripts/a.js']) {
      expect(() => conferirAlteracoes(raw(nome), `1\t0\t${nome}`)).toThrow(/fora do escopo/);
    }
  });

  it('recusa links, executáveis, remoções, binários e mudanças grandes', () => {
    for (const modo of ['120000', '100755', '160000']) {
      expect(() => conferirAlteracoes(raw('src/a.js', modo), '1\t0\tsrc/a.js')).toThrow();
    }
    expect(() => conferirAlteracoes(raw('src/a.js', '100644', 'D'), '0\t1\tsrc/a.js')).toThrow();
    expect(() => conferirAlteracoes(raw('src/a.js'), '-\t-\tsrc/a.js')).toThrow(/binário/);
    expect(() => conferirAlteracoes(raw('src/a.js'), '400\t101\tsrc/a.js')).toThrow(/linhas/);
    const nomes = Array.from({ length: 13 }, (_, i) => `src/a${i}.js`);
    expect(() => conferirAlteracoes(nomes.map(n => raw(n)).join(''), nomes.map(n => `1\t0\t${n}`).join('\n'))).toThrow(/12 arquivos/);
  });

  it('exige aprovação explícita sem achados', () => {
    expect(() => conferirRevisao('{"aprovado":true,"achados":[]}')).not.toThrow();
    for (const valor of [{}, { aprovado: 'true', achados: [] }, { aprovado: false, achados: [] }, { aprovado: true, achados: ['Erro'] }]) {
      expect(() => conferirRevisao(JSON.stringify(valor))).toThrow();
    }
  });

  it('empacota, reaplica e valida o mesmo patch contra a base imutável', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'pcm-agente-'));
    const patch = join(tmpdir(), `pcm-${Date.now()}-${Math.random()}.patch`);
    const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8' }).trim();
    try {
      git('init', '-q');
      git('config', 'user.name', 'Teste fictício');
      git('config', 'user.email', 'teste@example.invalid');
      mkdirSync(join(raiz, 'src'));
      writeFileSync(join(raiz, 'src/a.js'), 'export const valor = 1;\n');
      git('add', '.');
      git('commit', '-qm', 'Base fictícia');
      const base = git('rev-parse', 'HEAD');
      const rodar = (comando, sha = base) => execFileSync(process.execPath, [helper, comando, patch], {
        cwd: raiz, env: { ...process.env, PCM_BASE_SHA: sha }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      writeFileSync(join(raiz, 'src/a.js'), 'export const valor = 2;\n');
      expect(rodar('empacotar')).toBe('true');
      git('reset', '--hard', base);
      rodar('aplicar');
      expect(readFileSync(join(raiz, 'src/a.js'), 'utf8')).toContain('valor = 2');
      expect(() => rodar('aplicar', '0'.repeat(40))).toThrow();
      git('reset', '--hard', base);
      symlinkSync('/tmp/ficticio', join(raiz, 'src/link.js'));
      expect(() => rodar('empacotar')).toThrow();
    } finally {
      rmSync(raiz, { recursive: true, force: true });
      rmSync(patch, { force: true });
    }
  });
});
