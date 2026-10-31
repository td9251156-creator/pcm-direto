// Dados da operação vindos da Biblioteca PCM v2: ativos e OS (004), falhas (008), custos e orçamento (012).
// Funções puras: conferem a prévia contra a base local e devolvem uma cópia nova; nunca alteram o recebido.
//
// Identificação estável: base + chave do contrato (TAG, número da OS, referência da falha ou do lançamento;
// no orçamento, competência + categoria). Política de reimportação:
// - chave nova: entra;  - mesma chave e mesmo conteúdo: ignorada (não duplica);
// - mesma chave e conteúdo diferente: conflito, mantido como está salvo, salvo se o usuário escolher substituir;
//   a versão substituída fica guardada no registro da importação;
// - registro salvo que não está no arquivo: permanece (a importação nunca apaga dados).
// O atributo permite que roteiros em Node carreguem gestao.js (que valida esta base) diretamente.
import contrato from '../dados/biblioteca-pcm-v2.json' with { type: 'json' };

export const CHAVES = { ativos: 'tag', ordens_servico: 'numero_os', falhas: 'referencia_falha', custos_manutencao: 'referencia_lancamento' };
export const ROTULOS_BASE = { ativos: 'Ativos', ordens_servico: 'Ordens de serviço', falhas: 'Falhas', custos_manutencao: 'Lançamentos de custo', orcamento: 'Orçamento' };
export const CODIGOS_IMPORTACAO = ['PCM-MAN-004', 'PCM-MAN-008', 'PCM-MAN-012'];

const NUMEROS = new Set(['horas_estimadas', 'horas_restantes', 'valor_realizado']);
const DATAS = new Set(['data_abertura', 'data_prevista', 'data_conclusao', 'data_lancamento']);
const HORARIOS = new Set(['inicio_falha', 'fim_falha', 'inicio_reparo', 'fim_reparo']);
const DOMINIOS = {
  tipo_manutencao: ['PREVENTIVA', 'CORRETIVA', 'PREDITIVA', 'INSPECAO'],
  prioridade: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'],
  status: ['ABERTA', 'PLANEJADA', 'PROGRAMADA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA'],
  categoria_custo: ['MATERIAL', 'MAO_OBRA', 'TERCEIROS', 'OUTROS'],
};

/** Campos de cada base, lidos do contrato da biblioteca (mesma ordem das tabelas dos modelos). */
export const CAMPOS = Object.fromEntries(Object.entries(contrato.fontes).map(([base, f]) => {
  const modelo = contrato.modelos.find(m => m.codigo === f.codigo);
  const tabela = modelo.abas.flatMap(a => a.tabelas).find(t => t.nome === f.tabela);
  return [base, tabela.campos];
}));

export function criarOperacao() {
  return { versao: 1, ativos: [], ordens_servico: [], falhas: [], custos_manutencao: [], orcamento: [], importacoes: [] };
}

const vazio = v => v === null || v === undefined || v === '';
const objeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const chaveOrcamento = o => `${o.competencia}|${o.setor ?? ''}|${o.categoria_custo}`;
const conteudo = (base, r) => (base === 'orcamento'
  ? { competencia: r.competencia, setor: r.setor ?? null, categoria_custo: r.categoria_custo, valor_orcado: r.valor_orcado }
  : Object.fromEntries(CAMPOS[base].map(c => [c, vazio(r[c]) ? null : r[c]])));
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function dataIso(valor, comHora) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?$/.exec(valor ?? '');
  if (!m || Boolean(m[4]) !== comHora) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] &&
    d.getUTCHours() === +(m[4] ?? 0) && d.getUTCMinutes() === +(m[5] ?? 0);
}

/** Regras de cada registro; devolve os motivos de recusa (vazio = aceito). */
function conferirRegistro(base, r) {
  const motivos = [];
  // Mesmos limites da conferência final (validarOperacao), para recusar só a linha, com motivo.
  if (typeof r[CHAVES[base]] === 'string' && r[CHAVES[base]].length > 120) motivos.push(`${CHAVES[base]}: no máximo 120 caracteres.`);
  for (const [campo, v] of Object.entries(r)) if (typeof v === 'string' && v.length > 2000) motivos.push(`${campo}: no máximo 2000 caracteres.`);
  for (const [campo, permitidos] of Object.entries(DOMINIOS)) {
    if (campo in r && !vazio(r[campo]) && !permitidos.includes(r[campo])) motivos.push(`${campo}: código fora da lista padronizada.`);
  }
  if (base === 'ordens_servico') {
    for (const campo of ['tipo_manutencao', 'prioridade']) if (vazio(r[campo])) motivos.push(`${campo}: obrigatório.`);
    if (vazio(r.tag) || vazio(r.status) || vazio(r.data_abertura)) motivos.push('OS sem TAG, status ou data de abertura.');
    if (r.data_conclusao && r.data_abertura && r.data_conclusao < r.data_abertura) motivos.push('Conclusão anterior à abertura.');
    if (r.status === 'CONCLUIDA' && !r.data_conclusao) motivos.push('OS concluída sem data de conclusão.');
  }
  if (base === 'falhas') {
    if (vazio(r.tag) || vazio(r.inicio_falha)) motivos.push('Falha sem TAG ou início.');
    for (const [ini, fim] of [['inicio_falha', 'fim_falha'], ['inicio_reparo', 'fim_reparo']]) {
      if (r[fim] && (!r[ini] || r[fim] < r[ini])) motivos.push(`${fim}: intervalo inválido.`);
    }
    if ((r.inicio_reparo && r.inicio_falha && r.inicio_reparo < r.inicio_falha) || (r.fim_reparo && r.fim_falha && r.fim_reparo > r.fim_falha)) {
      motivos.push('Reparo fora do intervalo de indisponibilidade.');
    }
  }
  if (base === 'custos_manutencao' && (vazio(r.data_lancamento) || vazio(r.setor) || vazio(r.categoria_custo) || r.valor_realizado === null)) {
    motivos.push('Lançamento sem data, setor, categoria ou valor.');
  }
  return motivos;
}

/**
 * Compara a prévia do leitor com a base local. Não grava nada.
 * @param previa resultado de prepararPreviaBibliotecaV2
 * @param orcamentoLido resultado de lerOrcamentoAnualV2 (apenas no 012) ou null
 * @param operacao base atual (ou null)
 * @param equipamentos equipamentos do plano: [{ tag, setor }]
 */
export function prepararImportacao(previa, orcamentoLido, operacao, equipamentos, { arquivo = '', referencia = '' } = {}) {
  const atual = operacao ?? criarOperacao();
  const plano = { codigo: previa.codigo, versao: previa.versao, arquivo, referencia, novos: [], iguais: [], conflitos: [], rejeitados: [], avisos: [], bloqueios: [] };
  plano.bloqueios = previa.erros.filter(e => e.estrutura).map(e => e.mensagem);
  if (!CODIGOS_IMPORTACAO.includes(previa.codigo)) plano.bloqueios.push('Este modelo não é uma fonte de dados da operação. Use o 004, o 008 ou o 012.');
  if (plano.bloqueios.length) return { ...plano, apto: false };

  const tagsPlano = new Map(equipamentos.filter(e => e.tag).map(e => [e.tag, e]));
  const tagsConhecidas = new Set([...atual.ativos.map(a => a.tag), ...tagsPlano.keys()]);
  const osConhecidas = new Set(atual.ordens_servico.map(o => o.numero_os));
  // Ativos primeiro: uma OS do mesmo arquivo pode citar uma TAG cadastrada nele. Só entram
  // nas listas de vínculo os registros aceitos; uma linha recusada não valida outra.
  const ordem = ['ativos', 'ordens_servico', 'falhas', 'custos_manutencao'].filter(b => b in previa.bases);
  const semOS = new Set();

  for (const base of ordem) {
    const salvos = new Map(atual[base].map(r => [r[CHAVES[base]], r]));
    previa.bases[base].forEach((bruto, i) => {
      const linha = previa.linhas?.[base]?.[i] ?? null;
      const registro = conteudo(base, bruto);
      const chave = registro[CHAVES[base]];
      const motivos = [...new Set(previa.erros.filter(e => !e.estrutura && e.base === base && e.linha === linha && linha !== null).map(e => e.mensagem)),
        ...conferirRegistro(base, registro)];
      if (base !== 'ativos' && !vazio(registro.tag) && !tagsConhecidas.has(registro.tag)) {
        motivos.push(`TAG ${registro.tag} não está no cadastro de ativos nem no plano. Importe o cadastro (aba Cadastros do 004) ou cadastre o equipamento.`);
      }
      if (motivos.length) { plano.rejeitados.push({ base, linha, chave: chave ?? '', motivos }); return; }
      if (base === 'ativos') tagsConhecidas.add(registro.tag);
      if (base === 'ordens_servico') osConhecidas.add(registro.numero_os);
      if (base === 'falhas' && registro.numero_os && !osConhecidas.has(registro.numero_os)) semOS.add(registro.numero_os);
      if (base === 'ativos') {
        const doPlano = tagsPlano.get(registro.tag);
        if (doPlano && registro.setor && doPlano.setor && doPlano.setor !== registro.setor) {
          plano.avisos.push(`${registro.tag}: setor "${registro.setor}" no arquivo e "${doPlano.setor}" no plano. Os dashboards usam o do arquivo.`);
        }
      }
      const salvo = salvos.get(chave);
      if (!salvo) plano.novos.push({ base, chave, registro });
      else if (iguais(conteudo(base, salvo), registro)) plano.iguais.push({ base, chave });
      else plano.conflitos.push({ base, chave, atual: conteudo(base, salvo), novo: registro, campos: Object.keys(registro).filter(c => !iguais(registro[c], conteudo(base, salvo)[c])) });
    });
  }
  if (semOS.size) plano.avisos.push(`${semOS.size} número(s) de OS citado(s) nas falhas não estão na base (ex.: ${[...semOS][0]}). As falhas entram; o vínculo fica pendente.`);

  if (orcamentoLido) {
    if (orcamentoLido.erros.length) plano.rejeitados.push({ base: 'orcamento', linha: null, chave: 'Orçamento anual', motivos: orcamentoLido.erros.map(e => e.mensagem) });
    const salvos = new Map(atual.orcamento.map(o => [chaveOrcamento(o), o]));
    for (const o of orcamentoLido.linhas) {
      const registro = conteudo('orcamento', o);
      const chave = chaveOrcamento(registro);
      const salvo = salvos.get(chave);
      if (!salvo) plano.novos.push({ base: 'orcamento', chave, registro });
      else if (iguais(conteudo('orcamento', salvo), registro)) plano.iguais.push({ base: 'orcamento', chave });
      else plano.conflitos.push({ base: 'orcamento', chave, atual: conteudo('orcamento', salvo), novo: registro, campos: ['valor_orcado'] });
    }
  }
  plano.avisos.push(...(previa.avisos ?? []).filter(a => !a.startsWith('Prévia sem gravação')));
  plano.avisos = [...new Set(plano.avisos)];
  return { ...plano, apto: plano.novos.length + plano.conflitos.length > 0 };
}

/** Aplica um plano conferido. Devolve a nova base e o registro da importação (histórico). */
export function aplicarImportacao(operacao, plano, { substituirConflitos = false, id, data }) {
  if (!plano.apto) throw new Error('Plano de importação sem registros aplicáveis.');
  const nova = structuredClone(operacao ?? criarOperacao());
  const chaveDe = (base, r) => (base === 'orcamento' ? chaveOrcamento(r) : r[CHAVES[base]]);
  for (const { base, registro } of plano.novos) nova[base].push({ ...registro, importacao: id });
  const substituidos = [];
  if (substituirConflitos) {
    for (const { base, chave, novo } of plano.conflitos) {
      const i = nova[base].findIndex(r => chaveDe(base, r) === chave);
      substituidos.push({ base, chave, anterior: conteudo(base, nova[base][i]) });
      nova[base][i] = { ...novo, importacao: id };
    }
  }
  const registro = { id, data, codigo: plano.codigo, arquivo: String(plano.arquivo).slice(0, 200), versaoBiblioteca: plano.versao,
    novos: plano.novos.length, iguais: plano.iguais.length, atualizados: substituidos.length,
    conflitosMantidos: substituirConflitos ? 0 : plano.conflitos.length, rejeitados: plano.rejeitados.length, substituidos };
  nova.importacoes.push(registro);
  return { operacao: nova, registro };
}

/** Conferência completa ao abrir a base, restaurar backup ou antes de gravar. */
export function validarOperacao(op) {
  try {
    if (!objeto(op) || op.versao !== 1) return false;
    const texto = (v, limite = 2000) => v === null || (typeof v === 'string' && v.length <= limite);
    for (const base of Object.keys(CHAVES)) {
      if (!Array.isArray(op[base]) || op[base].length > 100_000) return false;
      const vistos = new Set();
      for (const r of op[base]) {
        if (!objeto(r)) return false;
        const chave = r[CHAVES[base]];
        if (typeof chave !== 'string' || !chave.trim() || chave.length > 120 || vistos.has(chave)) return false;
        vistos.add(chave);
        if (typeof r.importacao !== 'string' || !/^[A-Za-z0-9_-]+$/.test(r.importacao)) return false;
        for (const campo of Object.keys(r)) if (campo !== 'importacao' && !CAMPOS[base].includes(campo)) return false;
        for (const campo of CAMPOS[base]) {
          const v = r[campo] ?? null;
          if (NUMEROS.has(campo)) { if (v !== null && !(typeof v === 'number' && Number.isFinite(v) && v >= 0)) return false; }
          else if (DATAS.has(campo) || HORARIOS.has(campo)) { if (v !== null && !dataIso(v, HORARIOS.has(campo))) return false; }
          else if (!texto(v)) return false;
          if (DOMINIOS[campo] && v !== null && !DOMINIOS[campo].includes(v)) return false;
        }
      }
    }
    if (!Array.isArray(op.orcamento)) return false;
    const vistos = new Set();
    for (const o of op.orcamento) {
      if (!objeto(o) || typeof o.competencia !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(o.competencia) ||
        !(o.setor === null || (typeof o.setor === 'string' && o.setor.length <= 120)) || !DOMINIOS.categoria_custo.includes(o.categoria_custo) ||
        !(typeof o.valor_orcado === 'number' && Number.isFinite(o.valor_orcado) && o.valor_orcado >= 0) ||
        typeof o.importacao !== 'string' || vistos.has(chaveOrcamento(o))) return false;
      vistos.add(chaveOrcamento(o));
    }
    if (!Array.isArray(op.importacoes)) return false;
    const ids = new Set();
    for (const i of op.importacoes) {
      if (!objeto(i) || typeof i.id !== 'string' || ids.has(i.id) || !Number.isFinite(Date.parse(i.data)) || !CODIGOS_IMPORTACAO.includes(i.codigo) ||
        !['novos', 'iguais', 'atualizados', 'conflitosMantidos', 'rejeitados'].every(c => Number.isInteger(i[c]) && i[c] >= 0) ||
        !Array.isArray(i.substituidos) || !i.substituidos.every(s => objeto(s) && (s.base in CHAVES || s.base === 'orcamento') &&
          typeof s.chave === 'string' && objeto(s.anterior))) return false;
      ids.add(i.id);
    }
    return true;
  } catch { return false; }
}

/** Contagem do que está salvo, para a tela e o resumo do backup. */
export function resumoOperacao(op) {
  const o = op ?? criarOperacao();
  return { ativos: o.ativos.length, ordens_servico: o.ordens_servico.length, falhas: o.falhas.length,
    custos_manutencao: o.custos_manutencao.length, orcamento: o.orcamento.length, importacoes: o.importacoes.length };
}
