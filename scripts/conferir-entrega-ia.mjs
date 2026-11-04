// Confere a entrega de um agente antes da integração: lista os arquivos alterados em relação à main e aplica o perfil
// do ramo (o que aquele tipo de agente pode alterar), além de arquivos protegidos, .env/backup, dependência nova e
// possíveis segredos. Não altera nada.
// Uso: node scripts/conferir-entrega-ia.mjs [base]   (base padrão: origin/main; rode na pasta do agente)
import { execFileSync } from 'node:child_process';

// Mesma lista do AGENTS.md (seção "Ferramentas de IA usadas pelo mantenedor").
export const PROTEGIDOS = [/^src\/logica\/gestao\.js$/, /^src\/estado\.js$/, /^src\/repositorio\.js$/, /^src\/logica\/operacao\.js$/,
  /^src\/integracao\//, /^src\/saida\/biblioteca-v2-.*\.js$/, /^src\/dados\/biblioteca-pcm-v2\.json$/, /^public\/modelos\//, /^supabase\//];
const SEGREDO = /(api[_-]?key|secret|senha|password|token|service_role)\s*[:=]\s*['"][^'"]{8,}/i;

/**
 * Perfis por prefixo de ramo (docs/CONTRIBUIR-COM-IA.md, "Pastas e ramos dos agentes"):
 * - ia/maquinas/*    agente banco-maquinas: só propostas-maquinas/
 * - ia/divulgacao/*  agente redes-sociais: só divulgacao/
 * - ia/<ferramenta>/* código (codex, opencode, copilot, claude): tudo, exceto arquivos protegidos
 * - coord/*          coordenador: tudo; protegidos só com pedido explícito (aviso, não bloqueio)
 */
export const PERFIS = [
  { prefixo: 'ia/maquinas/', nome: 'banco de máquinas', permitidos: [/^propostas-maquinas\/[^/]+\.json$/] },
  { prefixo: 'ia/divulgacao/', nome: 'redes sociais', permitidos: [/^divulgacao\//] },
  { prefixo: 'ia/', nome: 'código (agente)', permitidos: null, protegidosBloqueiam: true },
  { prefixo: 'coord/', nome: 'coordenador', permitidos: null, protegidosBloqueiam: false },
];

export const perfilDoRamo = (ramo) => PERFIS.find((p) => ramo.startsWith(p.prefixo)) ?? null;

export function conferir(arquivos, diffPacote, diffTexto, ramo = 'coord/', pacotes = null) {
  const perfil = perfilDoRamo(ramo);
  const protegidos = arquivos.filter((a) => PROTEGIDOS.some((r) => r.test(a)));
  const foraDoPerfil = perfil?.permitidos ? arquivos.filter((a) => !perfil.permitidos.some((r) => r.test(a))) : [];
  const env = arquivos.filter((a) => /(^|\/)\.env/.test(a) || /backup.*\.json$/i.test(a));
  // Metadados de versão não instalam pacotes. A exceção exige os JSONs completos
  // do ancestral/HEAD, sem confiar em indentação ou no contexto parcial do diff.
  let somenteVersao = false;
  if (pacotes?.antes && pacotes?.depois && !Array.isArray(pacotes.antes) && !Array.isArray(pacotes.depois)) {
    const { version: anterior, ...restoAntes } = pacotes.antes;
    const { version: nova, ...restoDepois } = pacotes.depois;
    somenteVersao = typeof anterior === 'string' && typeof nova === 'string' && anterior !== nova &&
      JSON.stringify(restoAntes) === JSON.stringify(restoDepois);
  }
  const versaoDoCoordenador = perfil?.prefixo === 'coord/' && somenteVersao;
  const dependencias = Boolean(diffPacote.trim()) && !versaoDoCoordenador;
  const segredos = diffTexto.split('\n').filter((l) => l.startsWith('+') && SEGREDO.test(l)).length;
  const protegidosBloqueiam = perfil ? perfil.protegidosBloqueiam !== false : true;
  const ok = !!perfil && !foraDoPerfil.length && !(protegidosBloqueiam && protegidos.length) && !env.length && !dependencias && !segredos;
  return { perfil, protegidos, foraDoPerfil, env, dependencias, segredos, protegidosBloqueiam, ok };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/conferir-entrega-ia.mjs')) {
  const base = process.argv[2] ?? 'origin/main';
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const ramo = git('branch', '--show-current');
  const arquivos = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
  let pacotes = null;
  if (arquivos.includes('package.json')) {
    try {
      const ancestral = git('merge-base', base, 'HEAD');
      pacotes = { antes: JSON.parse(git('show', `${ancestral}:package.json`)), depois: JSON.parse(git('show', 'HEAD:package.json')) };
    } catch { /* Sem os JSONs completos, nenhuma exceção de versão é concedida. */ }
  }
  const r = conferir(arquivos, git('diff', `${base}...HEAD`, '--', 'package.json'), git('diff', `${base}...HEAD`), ramo, pacotes);
  console.log(`Ramo ${ramo} · perfil: ${r.perfil?.nome ?? 'nenhum'} · ${arquivos.length} arquivo(s) alterado(s) em relação a ${base}.`);
  for (const a of arquivos) console.log(`  ${r.foraDoPerfil.includes(a) ? '!! FORA DO PERFIL ' : r.protegidos.includes(a) ? '!! PROTEGIDO ' : '   '}${a}`);
  if (!r.perfil) console.log('Bloqueio: o ramo deve começar com ia/maquinas/, ia/divulgacao/, ia/<ferramenta>/ ou coord/.');
  if (r.foraDoPerfil.length) console.log(`Bloqueio: ${r.foraDoPerfil.length} arquivo(s) fora da área deste agente.`);
  if (r.protegidos.length) console.log(r.protegidosBloqueiam ? `Bloqueio: ${r.protegidos.length} arquivo(s) protegido(s); só o coordenador altera, com pedido explícito.`
    : `Atenção: ${r.protegidos.length} arquivo(s) protegido(s); confirme que a tarefa pediu e explique no PR.`);
  if (r.env.length) console.log('Bloqueio: arquivo de ambiente ou backup na entrega. Retire antes de continuar.');
  if (r.dependencias) console.log('Bloqueio: package.json alterado além da versão raiz permitida ao coordenador. Dependências exigem autorização.');
  if (r.segredos) console.log(`Bloqueio: ${r.segredos} linha(s) parecem conter senha ou chave.`);
  console.log(r.ok ? 'Conferência automática sem bloqueios. Próximo passo: npm run verificar e a integração.' : 'Conferência com bloqueios: corrija antes de integrar.');
  process.exitCode = r.ok ? 0 : 1;
}
