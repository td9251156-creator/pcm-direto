import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { conferir, PROTEGIDOS } from '../scripts/conferir-entrega-ia.mjs';

it('aponta arquivos protegidos, ambiente/backup, dependência nova e possível senha', () => {
  expect(conferir(['src/telas/falhas.js', 'testes/x.test.js'], '', '+const a = 1;').ok).toBe(true);
  const r = conferir(['src/estado.js', 'public/modelos/biblioteca-v2/PCM-MAN-001_X_R00.xlsx', '.env.local', 'pcm-backup.json'],
    '+    "lodash": "4.17.21",', "+const api_key = 'abcdefgh12345'");
  expect(r.protegidos).toEqual(['src/estado.js', 'public/modelos/biblioteca-v2/PCM-MAN-001_X_R00.xlsx']);
  expect(r.env).toEqual(['.env.local', 'pcm-backup.json']);
  expect(r.dependencias).toBe(true);
  expect(r.segredos).toBe(1);
  expect(r.ok).toBe(false);
});

it('a lista de protegidos do conferidor é a mesma do AGENTS.md', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');
  for (const caminho of ['src/logica/gestao.js', 'src/estado.js', 'src/repositorio.js', 'src/logica/operacao.js', 'src/integracao/',
    'src/saida/biblioteca-v2-*.js', 'src/dados/biblioteca-pcm-v2.json', 'public/modelos/**', 'supabase/**']) {
    expect(agents, caminho).toContain(caminho);
  }
  expect(PROTEGIDOS).toHaveLength(9);
});

it('OpenCode não compartilha sessões e não envia, integra nem instala sozinho', () => {
  const c = JSON.parse(readFileSync('opencode.json', 'utf8'));
  expect(c.share).toBe('disabled');
  for (const cmd of ['git push*', 'git merge*', 'gh pr merge*', 'npm install*']) expect(c.permission.bash[cmd], cmd).toBe('deny');
  expect(c.permission.bash['*']).toBe('ask');
});
