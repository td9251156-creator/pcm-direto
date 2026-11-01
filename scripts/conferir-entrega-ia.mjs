// Confere a entrega de uma ferramenta de IA antes da integração: lista os arquivos alterados em relação à main,
// aponta arquivos protegidos (AGENTS.md), dependências novas e possíveis segredos. Não altera nada.
// Uso: node scripts/conferir-entrega-ia.mjs [base]   (base padrão: origin/main)
import { execFileSync } from 'node:child_process';

const base = process.argv[2] ?? 'origin/main';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

// Mesma lista do AGENTS.md (seção "Ferramentas de IA usadas pelo mantenedor").
export const PROTEGIDOS = [/^src\/logica\/gestao\.js$/, /^src\/estado\.js$/, /^src\/repositorio\.js$/, /^src\/logica\/operacao\.js$/,
  /^src\/integracao\//, /^src\/saida\/biblioteca-v2-.*\.js$/, /^src\/dados\/biblioteca-pcm-v2\.json$/, /^public\/modelos\//, /^supabase\//];
const SEGREDO = /(api[_-]?key|secret|senha|password|token|service_role)\s*[:=]\s*['"][^'"]{8,}/i;

export function conferir(arquivos, diffPacote, diffTexto) {
  const protegidos = arquivos.filter((a) => PROTEGIDOS.some((r) => r.test(a)));
  const env = arquivos.filter((a) => /(^|\/)\.env/.test(a) || /backup.*\.json$/i.test(a));
  const dependencias = /^\+\s*"[^"]+":\s*"[^"]+"/m.test(diffPacote);
  const segredos = diffTexto.split('\n').filter((l) => l.startsWith('+') && SEGREDO.test(l)).length;
  return { protegidos, env, dependencias, segredos, ok: !protegidos.length && !env.length && !dependencias && !segredos };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/conferir-entrega-ia.mjs')) {
  const ramo = git('branch', '--show-current');
  const arquivos = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
  const r = conferir(arquivos, git('diff', `${base}...HEAD`, '--', 'package.json'), git('diff', `${base}...HEAD`));
  console.log(`Ramo ${ramo}: ${arquivos.length} arquivo(s) alterado(s) em relação a ${base}.`);
  for (const a of arquivos) console.log(`  ${r.protegidos.includes(a) ? '!! PROTEGIDO ' : '   '}${a}`);
  if (!/^(ia|coord)\//.test(ramo)) console.log('Aviso: o ramo deveria se chamar ia/<ferramenta>/<tarefa>.');
  if (r.protegidos.length) console.log(`Atenção: ${r.protegidos.length} arquivo(s) protegido(s). Só o coordenador integra, com pedido explícito.`);
  if (r.env.length) console.log('Atenção: arquivo de ambiente ou backup na entrega. Retire antes de continuar.');
  if (r.dependencias) console.log('Atenção: package.json com dependência nova. O projeto não aceita dependência sem autorização.');
  if (r.segredos) console.log(`Atenção: ${r.segredos} linha(s) parecem conter senha ou chave.`);
  console.log(r.ok ? 'Conferência automática sem bloqueios. Rode npm run verificar e peça a revisão.' : 'Conferência com bloqueios: corrija antes de integrar.');
  process.exitCode = r.ok ? 0 : 1;
}
