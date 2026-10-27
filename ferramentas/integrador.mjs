#!/usr/bin/env node
// Integrador do PCM Direto: confere, antes do merge, se os ramos das ferramentas de IA
// ficaram dentro dos seus arquivos, se há conflito ou duplicidade entre eles e se tudo passa.
// Só lê e testa: nunca faz push, merge na main nem publica. Uso: node ferramentas/integrador.mjs ajuda
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(aqui, 'integrador-tarefas.json'), 'utf8'));
const raiz = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 28 }).trimEnd();
const tenta = (...a) => { try { return git(...a); } catch { return null; } };
const V = '\x1b[32m✔\x1b[0m', X = '\x1b[31m✘\x1b[0m', A = '\x1b[33m!\x1b[0m';

const casa = (padrao, caminho) => new RegExp('^' + padrao.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*') + '$').test(caminho);
const emLista = (lista, f) => lista.some(p => casa(p, f));

function achaRamo(padrao) {
  const refs = git('for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes/origin').split('\n');
  const c = refs.filter(r => r !== 'origin/HEAD' && (casa(padrao, r.replace(/^origin\//, '')) || casa(padrao, r)));
  return c.find(r => !r.startsWith('origin/')) ?? c[0] ?? null;
}
function carrega() {
  const base = cfg.base;
  if (!tenta('rev-parse', '--verify', base)) { console.error(`${X} Base ${base} não encontrada. Rode: git fetch origin`); process.exit(2); }
  const r = {};
  for (const id of Object.keys(cfg.tarefas)) {
    const t = cfg.tarefas[id], ramo = achaRamo(t.ramo);
    r[id] = { id, ...t, achado: ramo, arquivos: ramo ? git('diff', '--name-only', `${base}...${ramo}`).split('\n').filter(Boolean) : [] };
  }
  return r;
}
const linhasAdicionadas = (base, ramo) => {
  const out = tenta('diff', '--unified=0', `${base}...${ramo}`) ?? '';
  const mapa = new Map(); let arq = '';
  for (const l of out.split('\n')) {
    if (l.startsWith('+++ b/')) arq = l.slice(6);
    else if (l.startsWith('+') && !l.startsWith('+++')) {
      const t = l.slice(1).trim();
      if (t.length >= 40 && !/^(\/\/|\*|#|<!--)/.test(t)) mapa.set(t, arq);
    }
  }
  return mapa;
};

function conferir(T) {
  let erros = 0, avisos = 0;
  console.log('\n1) Cada ramo dentro dos arquivos permitidos');
  const ativos = Object.values(T).filter(t => t.achado);
  for (const t of Object.values(T)) {
    if (!t.achado) { console.log(`  - ${t.id} ${t.nome}: ramo ainda não existe (ok se a tarefa não começou)`); continue; }
    const fora = t.arquivos.filter(f => !emLista(t.permitidos, f));
    if (!t.arquivos.length) { console.log(`  ${A} ${t.id} (${t.achado}): sem mudanças em relação à ${cfg.base}`); avisos++; continue; }
    if (!fora.length) console.log(`  ${V} ${t.id} (${t.achado}): ${t.arquivos.length} arquivo(s), todos permitidos`);
    else { erros++; console.log(`  ${X} ${t.id} (${t.achado}): fora da lista → ${fora.join(', ')}`);
      console.log('     Peça à ferramenta: "desfaça as mudanças nesses arquivos e mantenha só os permitidos".'); }
  }
  console.log('\n2) Arquivos compartilhados (só o integrador mexe)');
  let achouComp = false;
  for (const t of ativos) { const c = t.arquivos.filter(f => emLista(cfg.arquivosCompartilhados, f) && !emLista(t.permitidos, f));
    if (c.length) { achouComp = true; erros++; console.log(`  ${X} ${t.id} mexeu em ${c.join(', ')}`); } }
  if (!achouComp) console.log(`  ${V} nenhum ramo mexeu em arquivo compartilhado sem permissão`);
  console.log('\n3) Mesmo arquivo em dois ramos (conflito provável)');
  let dup = false;
  for (let i = 0; i < ativos.length; i++) for (let j = i + 1; j < ativos.length; j++) {
    const em = ativos[i].arquivos.filter(f => ativos[j].arquivos.includes(f));
    if (em.length) { dup = true; erros++; console.log(`  ${X} ${ativos[i].id} e ${ativos[j].id} alteram: ${em.join(', ')}`); } }
  if (!dup) console.log(`  ${V} nenhum arquivo aparece em dois ramos`);
  console.log('\n4) Duplicidade de conteúdo e de migrações');
  let dc = false;
  const linhas = ativos.map(t => [t, linhasAdicionadas(cfg.base, t.achado)]);
  for (let i = 0; i < linhas.length; i++) for (let j = i + 1; j < linhas.length; j++) {
    const iguais = [...linhas[i][1].keys()].filter(l => linhas[j][1].has(l));
    if (iguais.length) { dc = true; avisos++; console.log(`  ${A} ${linhas[i][0].id} e ${linhas[j][0].id} acrescentaram ${iguais.length} linha(s) idêntica(s), ex.: "${iguais[0].slice(0, 70)}…" (${linhas[i][1].get(iguais[0])})`); } }
  const migs = ativos.flatMap(t => t.arquivos.filter(f => f.startsWith('supabase/migrations/')).map(f => [t.id, f.split('/').pop()]));
  const existentes = git('ls-tree', '-r', '--name-only', cfg.base, 'supabase/migrations').split('\n').map(f => f.split('/').pop());
  for (const [id, nome] of migs) {
    const pref = nome.split('_')[0];
    const outras = [...migs.filter(([_i, n]) => n !== nome && n.split('_')[0] === pref), ...existentes.filter(n => n.split('_')[0] === pref).map(n => ['main', n])];
    if (outras.length) { dc = true; erros++; console.log(`  ${X} migração ${nome} (${id}) repete o prefixo de ${outras.map(o => o[1]).join(', ')}`); }
    const ult = existentes.map(n => n.split('_')[0]).sort().at(-1);
    if (pref <= ult) { dc = true; erros++; console.log(`  ${X} migração ${nome} (${id}) é mais antiga que a última da main (${ult}); use data posterior`); }
  }
  if (!dc) console.log(`  ${V} sem linhas repetidas entre ramos e sem migrações duplicadas`);
  return { erros, avisos };
}

function simular(T, rodarTestes) {
  const ordem = cfg.ordemDeMerge.filter(id => T[id]?.achado && T[id].arquivos.length);
  if (!ordem.length) { console.log('\nNenhum ramo com mudanças para simular.'); return 0; }
  console.log(`\n5) Simulação do merge em ordem (${ordem.join(' → ')}) numa cópia temporária`);
  const dir = mkdtempSync(join(tmpdir(), 'integracao-')); const rama = `integracao-teste-${Date.now()}`;
  let falhou = 0;
  try {
    git('worktree', 'add', '-q', '-b', rama, dir, cfg.base);
    const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });

    for (const id of ordem) {
      const r = g('-c', 'user.email=integrador@local', '-c', 'user.name=Integrador', 'merge', '--no-ff', '-m', `teste ${id}`, T[id].achado);
      if (r.status === 0) console.log(`  ${V} ${id} entrou sem conflito`);
      else { falhou++; const c = g('diff', '--name-only', '--diff-filter=U').stdout.trim().split('\n');
        console.log(`  ${X} ${id} conflita com os anteriores em: ${c.join(', ')}`); g('merge', '--abort'); }
    }
    if (rodarTestes && !falhou) {
      console.log('\n6) npm ci + npm run verificar no resultado juntado (pode levar alguns minutos)');
      for (const cmd of [['npm', ['ci']], ['npm', ['run', 'verificar']]]) {
        const r = spawnSync(cmd[0], cmd[1], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
        if (r.status !== 0) { falhou++; console.log(`  ${X} ${cmd.join(' ')} falhou: o problema só aparece com os ramos juntos`); break; }
      }
      if (!falhou) console.log(`  ${V} tudo verde com os ramos juntos`);
    } else if (!rodarTestes) console.log('  (testes não executados; use "tudo" para incluir npm run verificar)');
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', dir], { cwd: raiz }); spawnSync('git', ['branch', '-D', rama], { cwd: raiz }); rmSync(dir, { recursive: true, force: true });
  }
  return falhou;
}

const cmd = process.argv[2] ?? 'ajuda';
if (cmd === 'ajuda') {
  console.log(`Integrador do PCM Direto
  node ferramentas/integrador.mjs status    mostra cada tarefa, ramo e arquivos alterados
  node ferramentas/integrador.mjs conferir  confere arquivos permitidos, conflitos e duplicidade
  node ferramentas/integrador.mjs simular   conferir + simula o merge na ordem combinada
  node ferramentas/integrador.mjs tudo      simular + npm ci + npm run verificar juntos
Antes: git fetch origin. Nunca faz push nem merge na main.`);
  process.exit(0);
}
const T = carrega();
if (cmd === 'status') {
  for (const t of Object.values(T)) console.log(`${t.id} ${t.nome}\n   ramo: ${t.achado ?? '(não existe)'}\n   arquivos: ${t.arquivos.join(', ') || '-'}`);
  process.exit(0);
}
const { erros, avisos } = conferir(T);
let f = 0;
if (cmd === 'simular' || cmd === 'tudo') f = simular(T, cmd === 'tudo');
console.log(`\nResultado: ${erros + f} problema(s), ${avisos} aviso(s).`);
console.log(erros + f ? 'NÃO faça o merge ainda. Corrija os itens marcados com ✘ (veja a aba 10 do Excel).' : 'Pode seguir para o checklist da aba 9 e para o merge, na ordem combinada.');
process.exit(erros + f ? 1 : 0);
