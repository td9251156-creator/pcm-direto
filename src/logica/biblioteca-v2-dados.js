// Dados dos modelos da Biblioteca PCM v2 preenchidos pelo app, a partir do retrato de uma emissão
// (prepararEmissao em src/saida/pcmd.js). Só leitura; não inventa campos sem equivalente no app.
import { MODELOS_V2 } from '../dados/modelos-v2.js';
import { MODELOS_DOCUMENTAIS } from '../dados/modelos-anteriores.js';

// "A cada (dias)" do modelo 002. Convenção do app (a confirmar com o mantenedor): Diária = 1 dia;
// meses e anos em dias corridos aproximados. A periodicidade original continua no plano do app.
export const DIAS_POR_PERIODICIDADE = { 'Diária': 1, Semanal: 7, Quinzenal: 14, Mensal: 30, Bimestral: 60, Trimestral: 90, Semestral: 180, Anual: 365 };

// Tipo (lista fixa do PCM-MAN-001) dos documentos que o app emite. Demais: OUTRO.
const TIPO_DOCUMENTO = { 'PCM-MAN-001': 'REGISTRO', 'PCM-MAN-002': 'PLANO', 'PCM-MAN-008': 'REGISTRO', 'PCM-MAN-018': 'PROCEDIMENTO', 'PCM-MAN-019': 'PROCEDIMENTO','PCMD-01': 'REGISTRO', 'PCMD-02': 'REGISTRO',
  'PCMD-03/04': 'PLANO', 'PCMD-05': 'FORMULARIO', 'PCMD-W1': 'PROCEDIMENTO', 'PCMD-W2': 'PROCEDIMENTO' };
const tituloDe = (codigo) => MODELOS_V2.find((m) => m.codigo === codigo)?.titulo ?? MODELOS_DOCUMENTAIS.find((m) => m[0] === codigo)?.[1] ?? codigo;
const dia = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const rev = (n) => String(n).padStart(2, '0');

/**
 * PCM-MAN-001. Documentos: este controle (situação pela aprovação informada na emissão), os documentos
 * já emitidos pelo app (sem situação: a aprovação deles não fica registrada) e as referências técnicas (OUTRO).
 * Revisões: as revisões do plano, como revisões do PCM-MAN-002, e esta emissão do 001.
 * Sem lugar no modelo (ficam no app e no backup): função/especialidade das pessoas e referencial da organização.
 */
export function dadosPcmMan001(emissao) {
  const { estado: e, revisao: r, meta: m } = emissao;
  const o = e.gestao.organizacao;
  const numeroDa = new Map(e.programacao.revisoes.map((v) => [v.id, v.numero]));
  const documentos = [{
    codigo: 'PCM-MAN-001', titulo: tituloDe('PCM-MAN-001'), tipo: 'REGISTRO', responsavel: m.elaborador, status: m.aprovador ? 'VIGENTE' : 'RASCUNHO',
    validade: null, revisao: m.revisao, data: m.dataCorte, aprovado: m.aprovador,
    observacoes: `Emitido pelo PCM Direto com o plano rev. ${r.numero}${o.nome ? ` · ${o.nome}` : ''}.`,
  }];
  const ultimas = new Map();
  // Só o que existia até a data de corte (emissão com corte retroativo não lista documentos posteriores).
  for (const x of e.programacao.emissoes) if (x.modelo !== 'PCM-MAN-001' && x.dataCorte <= m.dataCorte &&(!ultimas.has(x.modelo) || x.dataCorte >= ultimas.get(x.modelo).dataCorte)) ultimas.set(x.modelo, x);
  for (const [codigo, x] of [...ultimas].sort((a, b) => a[0].localeCompare(b[0]))) {
    documentos.push({ codigo, titulo: tituloDe(codigo), tipo: TIPO_DOCUMENTO[codigo] ?? 'OUTRO', responsavel: '', status: '', validade: null,
      revisao: numeroDa.has(x.revisaoId) ? rev(numeroDa.get(x.revisaoId)) : '', data: x.dataCorte, aprovado: '',
      observacoes: `Última emissão pelo PCM Direto em ${x.dataCorte.split('-').reverse().join('/')}; a aprovação não fica registrada no app.` });
  }
  for (const q of e.gestao.requisitos) {
    documentos.push({ codigo: q.referencia.slice(0, 60), titulo: q.referencia, tipo: 'OUTRO', responsavel: '', status: '', validade: null,
      revisao: q.versao, data: q.data || null, aprovado: '',
      observacoes: `Referência externa · ${q.status === 'verificado' ? 'Verificada' : 'Não verificada'}${q.fonte ? ` · ${q.fonte}` : ''}` });
  }
  const revisoes = e.programacao.revisoes.filter((v) => (dia(v.criadaEm) ?? dia(v.vigencia) ?? '') <= m.dataCorte).map((v) => ({ codigo: 'PCM-MAN-002', revisao: rev(v.numero), data: dia(v.criadaEm) ?? dia(v.vigencia),
    descricao: `Revisão ${v.numero} do plano: ${v.resumo}`, elaborado: v.elaborador, aprovado: '' }));
  revisoes.push({ codigo: 'PCM-MAN-001', revisao: m.revisao, data: m.dataCorte, descricao: `Emissão do controle documental com o plano rev. ${r.numero}`,
    elaborado: m.elaborador, aprovado: m.aprovador });
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, documentos, revisoes,
    pessoas: unicos([...e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome), m.elaborador, m.aprovador, ...e.programacao.revisoes.map((v) => v.elaborador)]),
  };
}

/**
 * PCM-MAN-008. Registro de falhas: as falhas importadas do 008 (campos completos) e as do registro do app até a data de
 * corte. As do app têm só a data (sem hora): o início leva o dia e o fim fica vazio; peça, horas de parada/reparo,
 * conclusão e responsável não têm coluna e vão escritos na ação. Pareto e Ficha de falha ficam para a equipe.
 */
export function dadosPcmMan008(emissao) {
  const { estado: e, revisao: r, meta: m, falhas } = emissao;
  const nomeTipo = new Map(e.biblioteca.tipos.map((t) => [t.id, t.nome]));
  const pessoa = new Map(e.gestao.pessoas.map((p) => [p.id, p.nome]));
  const num = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const op = e.gestao.operacao;
  const importadas = (op?.falhas ?? []).filter((f) => f.inicio_falha.slice(0, 10) <= m.dataCorte).map((f) => ({
    referencia: f.referencia_falha, tag: f.tag, os: f.numero_os ?? '', descricao: f.descricao_falha ?? '', causa: f.causa ?? '', acao: f.acao ?? '',
    inicio: f.inicio_falha, fim: f.fim_falha, inicioReparo: f.inicio_reparo, fimReparo: f.fim_reparo,
  }));
  const vistas = new Set(importadas.map((f) => f.referencia));
  const doApp = falhas.filter((f) => !vistas.has(f.id)).map((f) => {
    const extras = [f.peca && `Peça: ${f.peca}`, Number.isFinite(f.horasParada) && `Parada: ${num(f.horasParada)} h`,
      Number.isFinite(f.horasReparo) && `Reparo: ${num(f.horasReparo)} h`, f.dataConclusao && `Concluída em ${f.dataConclusao.split('-').reverse().join('/')}`,
      pessoa.get(f.responsavelId) && `Responsável: ${pessoa.get(f.responsavelId)}`].filter(Boolean);
    return { referencia: f.id, tag: f.tag, os: '', descricao: f.sintoma, causa: f.causa, acao: [f.acao, ...extras].filter(Boolean).join(' · '),
      inicio: f.data, fim: null, inicioReparo: null, fimReparo: null };
  });
  const registros = [...importadas, ...doApp].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.referencia.localeCompare(b.referencia));
  const ativos = r.equipamentos.map((a) => ({ tag: a.tag, descricao: a.descricao, familia: nomeTipo.get(a.tipo) ?? a.tipo, setor: a.setor }));
  const doPlano = new Set(ativos.map((a) => a.tag));
  for (const a of op?.ativos ?? []) if (!doPlano.has(a.tag)) ativos.push({ tag: a.tag, descricao: a.descricao_ativo ?? '', familia: a.familia ?? '', setor: a.setor ?? '' });
  ativos.sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, falhas: registros, ativos,
    setores: unicos([...e.gestao.organizacao.setores, ...ativos.map((a) => a.setor)]),
    familias: unicos(ativos.map((a) => a.familia)),
    pessoas: unicos([...e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome), ...falhas.map((f) => pessoa.get(f.responsavelId))]),
  };
}

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
