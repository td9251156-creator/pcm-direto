// Biblioteca técnica, plano preventivo e bloqueio de afrouxamento de tarefas de segurança.

/** Periodicidades aceitas e quantas vezes por ano cada uma ocorre. Da mais frequente para a menos. */
export const PERIODICIDADES = [
  { nome: 'Semanal', vezes: 52 },
  { nome: 'Quinzenal', vezes: 26 },
  { nome: 'Mensal', vezes: 12 },
  { nome: 'Bimestral', vezes: 6 },
  { nome: 'Trimestral', vezes: 4 },
  { nome: 'Semestral', vezes: 2 },
  { nome: 'Anual', vezes: 1 },
];

/** Quantas vezes por ano. Retorna 0 para periodicidade desconhecida. */
export function vezesPorAno(nome) {
  return PERIODICIDADES.find((p) => p.nome === nome)?.vezes ?? 0;
}

/** Siglas por tipo, usadas na TAG: { motor_eletrico: 'MOT', ... } */
export function siglasDaBiblioteca(biblioteca) {
  return Object.fromEntries(biblioteca.tipos.map((t) => [t.id, t.sigla]));
}

/**
 * Confere se a biblioteca está bem preenchida. Útil depois de editar o JSON à mão.
 * Retorna a lista de problemas encontrados (vazia = tudo certo).
 */
export function validarBiblioteca(biblioteca) {
  const problemas = [];
  const ids = new Set();
  const siglas = new Set();
  for (const tipo of biblioteca.tipos ?? []) {
    if (!tipo.id || !tipo.nome || !tipo.sigla) problemas.push(`Tipo sem id, nome ou sigla: ${JSON.stringify(tipo.id ?? tipo.nome)}`);
    if (!/^[A-Z]{3}$/.test(tipo.sigla ?? '')) problemas.push(`${tipo.id}: a sigla deve ter 3 letras maiúsculas.`);
    if (siglas.has(tipo.sigla)) problemas.push(`${tipo.id}: sigla ${tipo.sigla} repetida.`);
    siglas.add(tipo.sigla);
    for (const t of tipo.tarefas ?? []) {
      const nome = `${tipo.id} / ${t.id ?? '(sem id)'}`;
      if (!t.id) problemas.push(`${nome}: tarefa sem id.`);
      if (ids.has(t.id)) problemas.push(`${nome}: id repetido.`);
      ids.add(t.id);
      if (!t.descricao) problemas.push(`${nome}: falta a descrição.`);
      if (!vezesPorAno(t.periodicidade)) problemas.push(`${nome}: periodicidade "${t.periodicidade}" não aceita. Use: ${PERIODICIDADES.map((p) => p.nome).join(', ')}.`);
      if (!t.especialidade) problemas.push(`${nome}: falta a especialidade.`);
      if (!(t.duracao_horas > 0)) problemas.push(`${nome}: duracao_horas deve ser maior que zero.`);
      if (typeof t.seguranca !== 'boolean') problemas.push(`${nome}: seguranca deve ser true ou false.`);
      if (!t.origem) problemas.push(`${nome}: falta a origem.`);
      if (!t.versao) problemas.push(`${nome}: falta a versão.`);
    }
  }
  return problemas;
}

/**
 * Regra de segurança (regra 5 do produto): tarefa de segurança não pode ficar menos frequente
 * nem ser desativada. Retorna { ok: true } ou { ok: false, motivo }.
 */
export function podeAlterar(tarefa, alteracao) {
  if (alteracao.periodicidade !== undefined) {
    const nova = vezesPorAno(alteracao.periodicidade);
    if (!nova) return { ok: false, motivo: `Periodicidade "${alteracao.periodicidade}" não existe.` };
    if (tarefa.seguranca && nova < vezesPorAno(tarefa.periodicidade)) {
      return {
        ok: false,
        motivo: `Tarefa de segurança: a periodicidade não pode passar de ${tarefa.periodicidade} para ${alteracao.periodicidade}. Só é permitido manter ou aumentar a frequência.`,
      };
    }
  }
  if (alteracao.ativa === false && tarefa.seguranca) {
    return { ok: false, motivo: 'Tarefa de segurança não pode ser retirada do plano.' };
  }
  return { ok: true };
}

/** Chave que liga um ajuste a um equipamento e a uma tarefa. */
export function chaveAjuste(equipamentoId, tarefaId) {
  return `${equipamentoId}|${tarefaId}`;
}

/**
 * Registra um ajuste feito pelo usuário na revisão.
 * Retorna { ok, ajustes, motivo }: se não for permitido, os ajustes voltam sem mudança.
 */
export function aplicarAjuste(ajustes, equipamentoId, tarefa, alteracao) {
  const verificacao = podeAlterar(tarefa, alteracao);
  if (!verificacao.ok) return { ok: false, ajustes, motivo: verificacao.motivo };
  const k = chaveAjuste(equipamentoId, tarefa.id);
  return { ok: true, ajustes: { ...ajustes, [k]: { ...ajustes[k], ...alteracao } } };
}

/**
 * Gera o plano preventivo: uma linha por tarefa de cada equipamento.
 * Ajustes que afrouxariam uma tarefa de segurança são ignorados aqui também,
 * para o caso de o rascunho salvo ter sido alterado por fora.
 */
export function gerarPlano(equipamentos, biblioteca, ajustes = {}) {
  const linhas = [];
  for (const eq of equipamentos) {
    const tipo = biblioteca.tipos.find((t) => t.id === eq.tipo);
    if (!tipo) continue;
    for (const tarefa of tipo.tarefas) {
      const ajuste = ajustes[chaveAjuste(eq.id, tarefa.id)] ?? {};
      const valido = podeAlterar(tarefa, ajuste).ok ? ajuste : {};
      const periodicidade = valido.periodicidade ?? tarefa.periodicidade;
      linhas.push({
        equipamentoId: eq.id,
        tag: eq.tag,
        equipamento: eq.descricao,
        tipo: tipo.nome,
        tarefaId: tarefa.id,
        descricao: tarefa.descricao,
        periodicidade,
        periodicidadeOriginal: tarefa.periodicidade,
        vezesAno: vezesPorAno(periodicidade),
        especialidade: tarefa.especialidade,
        duracaoHoras: tarefa.duracao_horas,
        seguranca: tarefa.seguranca,
        ativa: valido.ativa !== false,
        origem: tarefa.origem,
        versao: tarefa.versao,
        observacao: tarefa.observacao ?? '',
      });
    }
  }
  return linhas;
}
