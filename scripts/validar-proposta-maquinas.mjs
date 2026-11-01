// Confere uma proposta de novas máquinas (tipos) ou novas tarefas para a biblioteca técnica, sem alterá-la.
// Usa as mesmas regras do app (validarBiblioteca) e acrescenta as regras de fonte e de segurança do BIBLIOTECA.md.
// Uso: node scripts/validar-proposta-maquinas.mjs propostas-maquinas/<arquivo>.json [--previa]
//   --previa grava artifacts/biblioteca-com-proposta.json (para o coordenador conferir); nunca altera src/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { validarBiblioteca } from '../src/logica/plano.js';

const GENERICA = 'base genérica a validar com manual do fabricante';
const TIPOS_FONTE = ['manual_fabricante', 'norma', 'base_generica'];
// Número de norma só com fonte do tipo "norma" que tenha versão e data.
const CITA_NORMA = /\b(NR|NBR|ISO|IEC|ABNT|API|ASME|DIN|EN)\s*-?\s*\d/i;

export function conferirProposta(proposta, biblioteca) {
  const erros = []; const avisos = [];
  const fontes = new Map((proposta?.proposta?.fontes ?? []).map((f) => [f.id, f]));
  if (!proposta?.proposta?.titulo || !proposta?.proposta?.data) erros.push('Preencha proposta.titulo e proposta.data.');
  if (!fontes.size) erros.push('Declare ao menos uma fonte em proposta.fontes.');
  for (const [id, f] of fontes) {
    if (!TIPOS_FONTE.includes(f.tipo)) erros.push(`Fonte ${id}: tipo deve ser ${TIPOS_FONTE.join(', ')}.`);
    if (f.tipo !== 'base_generica' && (!f.titulo || !f.referencia || !f.versao || !f.data)) erros.push(`Fonte ${id}: manual ou norma exige título, referência, versão e data.`);
  }
  const tipos = Array.isArray(proposta?.tipos) ? proposta.tipos : [];
  const tarefasNovas = Array.isArray(proposta?.tarefasNovas) ? proposta.tarefasNovas : [];
  if (!tipos.length && !tarefasNovas.length) erros.push('A proposta não traz tipos nem tarefas novas.');

  const existentes = new Map(biblioteca.tipos.map((t) => [t.id, t]));
  for (const t of tipos) if (existentes.has(t.id)) erros.push(`Tipo ${t.id} já existe: para acrescentar tarefas, use tarefasNovas.`);
  for (const n of tarefasNovas) if (!existentes.has(n.tipo)) erros.push(`tarefasNovas: tipo ${n.tipo} não existe na biblioteca.`);

  const todas = [...tipos.flatMap((t) => (t.tarefas ?? []).map((x) => ({ ...x, _tipo: t }))),
    ...tarefasNovas.map((n) => ({ ...n.tarefa, _tipo: existentes.get(n.tipo) }))];
  for (const x of todas) {
    const nome = `${x._tipo?.id ?? '?'} / ${x.id ?? '?'}`;
    const fonte = fontes.get(x.fonte);
    if (!fonte) { erros.push(`${nome}: indique em "fonte" um id de proposta.fontes.`); continue; }
    if (fonte.tipo === 'base_generica' && x.origem !== GENERICA) erros.push(`${nome}: com base genérica, a origem deve ser "${GENERICA}".`);
    if (fonte.tipo !== 'base_generica' && !String(x.origem ?? '').includes(fonte.versao)) erros.push(`${nome}: a origem deve citar a fonte ${fonte.id} com a versão (${fonte.versao}).`);
    if (x._tipo?.sigla && !new RegExp(`^${x._tipo.sigla}-\\d{2}$`).test(x.id ?? '')) erros.push(`${nome}: o id deve seguir ${x._tipo.sigla}-NN.`);
    const texto = `${x.descricao ?? ''} ${x.observacao ?? ''} ${x.origem ?? ''}`;
    if (CITA_NORMA.test(texto) && !(fonte.tipo === 'norma' && fonte.versao && fonte.data)) erros.push(`${nome}: cita norma sem fonte do tipo "norma" com versão e data.`);
    if (x.seguranca === true && fonte.tipo === 'base_generica') avisos.push(`${nome}: tarefa de segurança com base genérica — o mantenedor precisa confirmar antes de integrar.`);
    if (x.seguranca === true && !String(x.observacao ?? '').trim()) erros.push(`${nome}: tarefa de segurança precisa explicar na observação o risco que ela controla.`);
  }
  // Descrições repetidas (mesmo tipo) costumam ser tarefa duplicada.
  const vistas = new Set();
  const chave = (x) => `${x._tipo?.id}|${String(x.descricao ?? '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')}`;
  for (const x of [...todas, ...biblioteca.tipos.flatMap((t) => t.tarefas.map((y) => ({ ...y, _tipo: t })))]) {
    if (vistas.has(chave(x))) avisos.push(`${x._tipo?.id} / ${x.id}: descrição igual a outra tarefa do mesmo tipo.`);
    vistas.add(chave(x));
  }

  // Biblioteca resultante, sem o campo auxiliar "fonte", conferida pelas regras do próprio app.
  const limpa = (x) => { const { fonte, _tipo, ...resto } = x; void fonte; void _tipo; return resto; };
  const resultado = structuredClone(biblioteca);
  for (const n of tarefasNovas) resultado.tipos.find((t) => t.id === n.tipo)?.tarefas.push(limpa(n.tarefa ?? {}));
  for (const t of tipos) resultado.tipos.push({ id: t.id, nome: t.nome, sigla: t.sigla, tarefas: (t.tarefas ?? []).map(limpa) });
  erros.push(...validarBiblioteca(resultado));
  return { ok: erros.length === 0, erros, avisos, resultado, tipos: tipos.length, tarefas: todas.length };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/validar-proposta-maquinas.mjs')) {
  const arquivo = process.argv[2];
  if (!arquivo) { console.log('Uso: node scripts/validar-proposta-maquinas.mjs propostas-maquinas/<arquivo>.json [--previa]'); process.exit(2); }
  const biblioteca = JSON.parse(readFileSync(new URL('../src/dados/biblioteca.json', import.meta.url), 'utf8'));
  let proposta;
  try { proposta = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (e) { console.log(`Arquivo inválido: ${e.message}`); process.exit(1); }
  const r = conferirProposta(proposta, biblioteca);
  console.log(`${arquivo}: ${r.tipos} tipo(s) novo(s), ${r.tarefas} tarefa(s).`);
  for (const e of r.erros) console.log(`  ERRO   ${e}`);
  for (const a of r.avisos) console.log(`  AVISO  ${a}`);
  if (r.ok && process.argv.includes('--previa')) {
    mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
    writeFileSync(new URL('../artifacts/biblioteca-com-proposta.json', import.meta.url), JSON.stringify(r.resultado, null, 2) + '\n');
    console.log('Prévia gravada em artifacts/biblioteca-com-proposta.json (src/ não foi alterado).');
  }
  console.log(r.ok ? 'Proposta aprovada na conferência automática. Falta a revisão do mantenedor.' : 'Proposta com erros: corrija antes de enviar.');
  process.exitCode = r.ok ? 0 : 1;
}
