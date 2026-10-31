// Dados dos modelos da Biblioteca PCM v2 preenchidos pelo app, a partir do retrato de uma emissão
// (prepararEmissao em src/saida/pcmd.js). Só leitura; não inventa campos sem equivalente no app.

// "A cada (dias)" do modelo 002. Convenção do app (a confirmar com o mantenedor): Diária = 1 dia;
// meses e anos em dias corridos aproximados. A periodicidade original continua no plano do app.
export const DIAS_POR_PERIODICIDADE = { 'Diária': 1, Semanal: 7, Quinzenal: 14, Mensal: 30, Bimestral: 60, Trimestral: 90, Semestral: 180, Anual: 365 };

const unicos = (lista) => [...new Set(lista.map((s) => String(s ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/**
 * PCM-MAN-002. Sem equivalente no app (ficam em branco no arquivo): Criticidade (escala 1–5 do modelo),
 * FMECA, componente, tipo de tarefa e "exige parada".
 */
export function dadosPcmMan002(emissao) {
  const { estado: e, revisao: r, meta: m, ocorrencias } = emissao;
  const nomeTipo = new Map(e.biblioteca.tipos.map((t) => [t.id, t.nome]));
  const pessoa = new Map(e.gestao.pessoas.map((p) => [p.id, p]));
  const ativos = r.equipamentos.map((a) => ({ tag: a.tag, descricao: a.descricao, familia: nomeTipo.get(a.tipo) ?? a.tipo, setor: a.setor }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  const primeira = new Map();
  for (const o of ocorrencias) {
    if (o.revisaoId !== r.id) continue;
    const k = `${o.equipamentoId}|${o.tarefaId}`;
    if (!primeira.has(k) || o.dataPrevista < primeira.get(k)) primeira.set(k, o.dataPrevista);
  }
  const atividades = r.plano.filter((t) => t.ativa !== false).map((t) => {
    const k = `${t.equipamentoId}|${t.tarefaId}`;
    return {
      tag: t.tag,
      atividade: t.seguranca ? `${t.descricao} (tarefa de segurança)` : t.descricao,
      dias: DIAS_POR_PERIODICIDADE[t.periodicidade] ?? null,
      responsavel: pessoa.get(r.responsaveis?.[k] ?? '')?.nome ?? '',
      duracao: Number.isFinite(t.duracaoHoras) ? t.duracaoHoras : null,
      primeira: primeira.get(k) ?? null,
    };
  }).sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR') || a.atividade.localeCompare(b.atividade, 'pt-BR'));
  const responsaveis = atividades.map((t) => t.responsavel);
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, ano: Number(m.dataCorte.slice(0, 4)),
    ativos,
    setores: unicos([...e.gestao.organizacao.setores, ...ativos.map((a) => a.setor)]),
    familias: unicos(ativos.map((a) => a.familia)),
    pessoas: unicos([...e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome), ...responsaveis]),
    atividades,
  };
}
