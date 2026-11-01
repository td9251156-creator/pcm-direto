import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import manifesto from '../src/dados/biblioteca-pcm-v2.json';
import { MODELOS_V2 } from '../src/dados/modelos-v2.js';
import { cargaSql } from '../scripts/gerar-carga-biblioteca.mjs';

const tabelas = readFileSync('supabase/migrations/20261101120000_biblioteca_v2.sql', 'utf8');
const arquivos = readFileSync('supabase/migrations/20261101120100_biblioteca_v2_arquivos.sql', 'utf8');

it('a carga do banco está igual ao manifesto do app (rode node scripts/gerar-carga-biblioteca.mjs ao mudar modelos)', () => {
  const carga = readFileSync('supabase/carga/biblioteca_v2.sql', 'utf8').replace(/\r\n/g, '\n'); // checkout no Windows
  expect(carga).toBe(cargaSql(manifesto, MODELOS_V2));
  for (const m of manifesto.modelos) expect(carga, m.codigo).toContain(`'${m.sha256}'`);
  expect(carga).not.toMatch(/publicada|biblioteca_publicar_versao/); // a carga nunca publica
});

it('o banco só libera a versão publicada, grava por funções de moderador e não aceita trocar arquivos', () => {
  expect(tabelas).toMatch(/enable row level security/);
  expect(tabelas).toMatch(/for select to anon using \(situacao = 'publicada'\)/);
  expect(tabelas).not.toMatch(/grant (insert|update|delete)/i);
  for (const f of ['biblioteca_criar_versao', 'biblioteca_registrar_modelo', 'biblioteca_publicar_versao']) {
    expect(tabelas).toMatch(new RegExp(`create function public\\.${f}[\\s\\S]*?security definer set search_path = ''[\\s\\S]*?catalogo_e_moderador`));
  }
  expect(tabelas).toMatch(/biblioteca_uma_publicada/);
  expect(arquivos).toMatch(/for insert to authenticated/);
  expect(arquivos).not.toMatch(/for (update|delete)/);
  expect(`${tabelas}\n${arquivos}`).not.toMatch(/gestao|operacao|falhas|historico/i); // nenhum dado operacional
});
