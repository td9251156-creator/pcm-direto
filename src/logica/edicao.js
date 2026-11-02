// Regras para editar a biblioteca técnica dentro do app.
// A principal: tarefas de segurança que vêm com o app não podem ser afrouxadas,
// desmarcadas como segurança nem apagadas (regra 5 do produto).
import { vezesPorAno, validarBiblioteca } from './plano.js';
import { chave } from './texto.js';
import anterior from '../dados/biblioteca-0.2.0.json' with { type: 'json' };

export const ORIGEM_USUARIO = 'definida pelo usuário, confirmar com manual do fabricante';

/** Tarefa original (da biblioteca que vem com o app) com este id, ou null. */
export function tarefaPadrao(padrao, id) {
  for (const tipo of padrao.tipos) {
    const t = tipo.tarefas.find((x) => x.id === id);
    if (t) return t;
  }
  return null;
}

/** Confere se uma tarefa editada respeita a regra de segurança. Retorna { ok, motivo }. */
export function verificarTarefa(padrao, tarefa) {
  const original = tarefaPadrao(padrao, tarefa.id);
  if (!original || !original.seguranca) return { ok: true };
  if (!tarefa.seguranca) return { ok: false, motivo: `${tarefa.id}: tarefa de segurança da biblioteca não pode deixar de ser de segurança.` };
  if (vezesPorAno(tarefa.periodicidade) < vezesPorAno(original.periodicidade)) {
    return { ok: false, motivo: `${tarefa.id}: tarefa de segurança não pode ficar menos frequente que ${original.periodicidade}.` };
  }
  return { ok: true };
}

/** Pode apagar esta tarefa? Tarefa de segurança original, não. */
export function podeApagarTarefa(padrao, id) {
  return !tarefaPadrao(padrao, id)?.seguranca;
}

/** Pode apagar este tipo? Só tipos criados pelo usuário e sem equipamento cadastrado. */
export function podeApagarTipo(padrao, tipoId, equipamentos) {
  if (padrao.tipos.some((t) => t.id === tipoId)) return { ok: false, motivo: 'Tipos que vêm com o app não podem ser apagados.' };
  if (equipamentos.some((e) => e.tipo === tipoId)) return { ok: false, motivo: 'Há equipamentos cadastrados com este tipo.' };
  return { ok: true };
}

/**
 * Confere a biblioteca inteira depois de editada ou importada.
 * Junta a validação de formato com as regras de segurança. Lista vazia = pode usar.
 */
export function verificarBibliotecaEditada(padrao, bib) {
  const problemas = validarBiblioteca(bib);
  // Só percorre tarefas e confere a segurança depois de validar a estrutura do arquivo.
  if (problemas.length) return problemas;
  for (const tipoOriginal of padrao.tipos) {
    const tipo = bib.tipos?.find((t) => t.id === tipoOriginal.id);
    if (!tipo) { problemas.push(`O tipo "${tipoOriginal.nome}" não pode ser retirado.`); continue; }
    for (const original of tipoOriginal.tarefas.filter((t) => t.seguranca)) {
      const tarefa = tipo.tarefas.find((t) => t.id === original.id);
      if (!tarefa) problemas.push(`${original.id}: tarefa de segurança não pode ser retirada.`);
      else {
        const r = verificarTarefa(padrao, tarefa);
        if (!r.ok) problemas.push(r.motivo);
      }
    }
  }
  return problemas;
}

/** Próximo id livre para uma tarefa do tipo: MOT-09, MOT-10... */
export function proximoIdTarefa(bib, tipo) {
  const usados = bib.tipos.flatMap((t) => t.tarefas).map((t) => t.id);
  let n = tipo.tarefas.length + 1;
  while (usados.includes(`${tipo.sigla}-${String(n).padStart(2, '0')}`)) n++;
  return `${tipo.sigla}-${String(n).padStart(2, '0')}`;
}

/** Nova tarefa em branco, já com origem e versão preenchidas. */
export function novaTarefa(bib, tipo) {
  return {
    id: proximoIdTarefa(bib, tipo),
    descricao: 'Nova tarefa: descreva o que fazer',
    periodicidade: 'Mensal',
    especialidade: 'Mecânica',
    duracao_horas: 0.5,
    seguranca: false,
    origem: ORIGEM_USUARIO,
    versao: '1.0',
    observacao: '',
  };
}

/** Cria um tipo de equipamento. Retorna { ok, tipo } ou { ok: false, motivo }. */
export function novoTipo(bib, nome, sigla) {
  const id = chave(nome).replace(/[^a-z0-9_]/g, '');
  const s = String(sigla ?? '').toUpperCase();
  if (!String(nome ?? '').trim() || !id) return { ok: false, motivo: 'Informe o nome do tipo (ex.: Redutor).' };
  if (!/^[A-Z]{3}$/.test(s)) return { ok: false, motivo: 'A sigla deve ter 3 letras (ex.: RED).' };
  if (bib.tipos.some((t) => t.id === id)) return { ok: false, motivo: 'Já existe um tipo com esse nome.' };
  if (bib.tipos.some((t) => t.sigla === s)) return { ok: false, motivo: `A sigla ${s} já está em uso.` };
  return { ok: true, tipo: { id, nome: String(nome).trim(), sigla: s, tarefas: [] } };
}

/** Atualização aditiva da biblioteca 0.2.0: mantém edições e nunca altera revisões salvas.
 * Conflitos ou arquivos inválidos voltam intactos para o fluxo de recuperação existente.
 */
export function atualizarBibliotecaAnterior(bib, padrao) {
  if (bib?.versao !== anterior.versao || padrao.versao !== '0.3.0' ||
      verificarBibliotecaEditada(anterior, bib).length) return bib;
  const nova = JSON.parse(JSON.stringify(bib));
  const ids = new Set(nova.tipos.flatMap(t => t.tarefas.map(x => x.id)));
  for (const tipo of padrao.tipos) {
    const antigo = anterior.tipos.find(t => t.id === tipo.id);
    const atual = nova.tipos.find(t => t.id === tipo.id);
    if (!antigo) {
      if (atual || nova.tipos.some(t => t.sigla === tipo.sigla) || tipo.tarefas.some(t => ids.has(t.id))) return bib;
      nova.tipos.push(JSON.parse(JSON.stringify(tipo)));
      tipo.tarefas.forEach(t => ids.add(t.id));
    } else {
      for (const tarefa of tipo.tarefas.filter(t => !antigo.tarefas.some(x => x.id === t.id))) {
        if (ids.has(tarefa.id)) return bib;
        atual.tarefas.push(JSON.parse(JSON.stringify(tarefa)));
        ids.add(tarefa.id);
      }
    }
  }
  nova.versao = padrao.versao;
  nova.data = padrao.data;
  return verificarBibliotecaEditada(padrao, nova).length ? bib : nova;
}

/** Uma biblioteca anterior válida com conflito continua operável, sem incorporar o lote parcial. */
export function verificarBibliotecaCompativel(padrao, bib) {
  const referencia = bib?.versao === anterior.versao && padrao.versao === '0.3.0' ? anterior : padrao;
  const problemas = verificarBibliotecaEditada(referencia, bib);
  if (problemas.length || referencia === padrao) return problemas;
  // O rótulo antigo não pode liberar uma biblioteca nova reetiquetada.
  for (const tipo of padrao.tipos.filter(t => !anterior.tipos.some(a => a.id === t.id))) {
    const atual = bib.tipos.find(t => t.id === tipo.id);
    if (!atual) continue;
    const identificaTipo = (atual.nome === tipo.nome && atual.sigla === tipo.sigla) ||
      atual.tarefas.some(t => tipo.tarefas.some(x => x.id === t.id));
    if (!identificaTipo) continue;
    for (const tarefa of tipo.tarefas.filter(t => t.seguranca)) {
      const editada = atual.tarefas.find(t => t.id === tarefa.id);
      if (!editada) problemas.push(`${tarefa.id}: tarefa de segurança não pode ser retirada.`);
      else { const r = verificarTarefa(padrao, editada); if (!r.ok) problemas.push(r.motivo); }
    }
  }
  return problemas;
}
