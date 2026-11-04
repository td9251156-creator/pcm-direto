// Dados dos modelos da Biblioteca PCM v2 preenchidos pelo app, a partir do retrato de uma emissão
// (prepararEmissao em src/logica/emissao.js). Só leitura; não inventa campos sem equivalente no app.
import { MODELOS_V2 } from '../dados/modelos-v2.js';
import { idsConcluidos, ocorrenciasVigentes } from './programacao.js';
import { falhasDoAtivo, indicadores017 } from './indicadores-017.js';

// "A cada (dias)" do modelo 002. Convenção do app (a confirmar com o mantenedor): Diária = 1 dia;
// meses e anos em dias corridos aproximados. A periodicidade original continua no plano do app.
export const DIAS_POR_PERIODICIDADE = { 'Diária': 1, Semanal: 7, Quinzenal: 14, Mensal: 30, Bimestral: 60, Trimestral: 90, Semestral: 180, Anual: 365 };

// Tipo (lista fixa do PCM-MAN-001) dos documentos que o app emite. Demais: OUTRO.
const TIPO_DOCUMENTO = { 'PCM-MAN-001': 'REGISTRO', 'PCM-MAN-002': 'PLANO', 'PCM-MAN-004': 'REGISTRO', 'PCM-MAN-008': 'REGISTRO', 'PCM-MAN-018': 'PROCEDIMENTO', 'PCM-MAN-019': 'PROCEDIMENTO' };
// Documentos do formato anterior (retirado) que podem constar em emissões antigas: entram como OBSOLETO, com o substituto.
const ANTERIORES = { 'PCMD-01': ['Controle documental', 'PCM-MAN-001'], 'PCMD-02': ['Ativos e criticidade', 'PCM-MAN-002'],
  'PCMD-03/04': ['Plano e cronograma', 'PCM-MAN-002 e PCM-MAN-004'], 'PCMD-05': ['Ficha de falha', 'PCM-MAN-008'],
  'PCMD-W1': ['Gestão de ativos', 'PCM-MAN-018'], 'PCMD-W2': ['Estratégia de manutenção', 'PCM-MAN-019'] };
const tituloDe = (codigo) => MODELOS_V2.find((m) => m.codigo === codigo)?.titulo ?? ANTERIORES[codigo]?.[0] ?? codigo;
const dia = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const rev = (n) => String(n).padStart(2, '0');

/**
 * PCM-MAN-001. Documentos: este controle (situação pela aprovação informada na emissão) e os documentos já emitidos
 * pelo app. Referências: normas e manuais cadastrados (aba própria). Organização: nome, referencial e metas.
 * Pessoas: nome, função, especialidade e ativo. Revisões: as do plano (como PCM-MAN-002) e esta emissão do 001.
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
    const anterior = ANTERIORES[codigo];
    documentos.push({ codigo, titulo: tituloDe(codigo), tipo: TIPO_DOCUMENTO[codigo] ?? 'OUTRO', responsavel: '', status: anterior ? 'OBSOLETO' : '', validade: null,
      revisao: numeroDa.has(x.revisaoId) ? rev(numeroDa.get(x.revisaoId)) : '', data: x.dataCorte, aprovado: '',
      observacoes: `Última emissão pelo PCM Direto em ${x.dataCorte.split('-').reverse().join('/')}; ${anterior
        ? `formato anterior retirado, substituído pelo ${anterior[1]}.` : 'a aprovação não fica registrada no app.'}` });
  }
  const referencias = e.gestao.requisitos.map((q) => ({ referencia: q.referencia, versao: q.versao, data: q.data || null, fonte: q.fonte,
    situacao: q.status === 'verificado' ? 'Verificada' : 'Não verificada' }));
  const revisoes = e.programacao.revisoes.filter((v) => (dia(v.criadaEm) ?? dia(v.vigencia) ?? '') <= m.dataCorte).map((v) => ({ codigo: 'PCM-MAN-002', revisao: rev(v.numero), data: dia(v.criadaEm) ?? dia(v.vigencia),
    descricao: `Revisão ${v.numero} do plano: ${v.resumo}`, elaborado: v.elaborador, aprovado: '' }));
  revisoes.push({ codigo: 'PCM-MAN-001', revisao: m.revisao, data: m.dataCorte, descricao: `Emissão do controle documental com o plano rev. ${r.numero}`,
    elaborado: m.elaborador, aprovado: m.aprovador });
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, documentos, revisoes, referencias,
    organizacao: { nome: o.nome, referencial: o.referencial, metaDisponibilidade: e.gestao.metas.disponibilidade, metaAderencia: e.gestao.metas.aderencia },
    // Cadastro completo das pessoas e, só com o nome, quem elaborou/aprovou sem cadastro (para as listas ▼).
    pessoas: [...e.gestao.pessoas.map((p) => ({ nome: p.nome, funcao: p.funcao, especialidade: p.especialidade, ativo: p.ativo ? 'Sim' : 'Não' })),
      ...unicos([m.elaborador, m.aprovador, ...e.programacao.revisoes.map((v) => v.elaborador)])
        .filter((n) => !e.gestao.pessoas.some((p) => p.nome.trim() === n)).map((nome) => ({ nome, funcao: '', especialidade: '', ativo: '' }))],
  };
}

/**
 * PCM-MAN-008. Registro de falhas: as falhas importadas do 008 (campos completos) e as do registro do app até a data de
 * corte. As do app levam início (data e hora, se informada) e fim = conclusão do reparo com hora (sem hora: na ação);
 * peça, responsável, horas de parada e horas de reparo têm colunas próprias. Pareto e Ficha de falha ficam para a equipe.
 */
export function dadosPcmMan008(emissao) {
  const { estado: e, revisao: r, meta: m, falhas } = emissao;
  const nomeTipo = new Map(e.biblioteca.tipos.map((t) => [t.id, t.nome]));
  const pessoa = new Map(e.gestao.pessoas.map((p) => [p.id, p.nome]));
  const num = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const op = e.gestao.operacao;
  const importadas = (op?.falhas ?? []).filter((f) => f.inicio_falha.slice(0, 10) <= m.dataCorte).map((f) => ({
    referencia: f.referencia_falha, tag: f.tag, os: f.numero_os ?? '', descricao: f.descricao_falha ?? '', causa: f.causa ?? '', acao: f.acao ?? '',
    inicio: f.inicio_falha, fim: f.fim_falha, inicioReparo: f.inicio_reparo, fimReparo: f.fim_reparo, horasParada: f.horas_parada ?? null, horasReparo: f.horas_reparo ?? null, peca: f.peca ?? '', responsavel: f.responsavel ?? '',
  }));
  const vistas = new Set(importadas.map((f) => f.referencia));
  const comHora = (d, h) => (d && h ? `${d}T${h}:00` : d || null);
  const doApp = falhas.filter((f) => !vistas.has(f.id)).map((f) => {
    // A data de conclusão é preservada mesmo sem hora: o leitor reconhece o formato só data sem inventar 00:00.
    const fim = comHora(f.dataConclusao, f.horaFim);
    const extras = [Number.isFinite(f.horasParada) && `Parada: ${num(f.horasParada)} h`, Number.isFinite(f.horasReparo) && `Reparo: ${num(f.horasReparo)} h`,
      f.dataConclusao && !f.horaFim && `Concluída em ${f.dataConclusao.split('-').reverse().join('/')} (sem hora)`].filter(Boolean);
    return { referencia: f.id, tag: f.tag, os: '', descricao: f.sintoma, causa: f.causa, acao: [f.acao, ...extras].filter(Boolean).join(' · '),
      inicio: comHora(f.data, f.horaInicio), fim, inicioReparo: null, fimReparo: null, horasParada: f.horasParada ?? null, horasReparo: f.horasReparo ?? null, peca: f.peca ?? '', responsavel: pessoa.get(f.responsavelId) ?? '' };
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
    pessoas: unicos([...e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome), ...registros.map((f) => f.responsavel)]),
  };
}

/**
 * PCM-MAN-004 (decisão D3): o histórico do app vira linhas da aba Ordens de Serviço, uma por registro, com número
 * "APP-" + ID interno. Execução = CONCLUIDA (cancelada = CANCELADA); ocorrência prevista até a data de corte sem
 * execução = PROGRAMADA. Tipo PREVENTIVA (tarefas do plano). Abertura = data prevista (ou a da execução, se feita antes).
 * As OS importadas do 004 entram como vieram. Sem equivalente no app (fica em branco): prioridade.
 */
export function dadosPcmMan004(emissao) {
  const { estado: e, revisao: r, meta: m, ocorrencias, historico } = emissao;
  const nomeTipo = new Map(e.biblioteca.tipos.map((t) => [t.id, t.nome]));
  const pessoa = new Map(e.gestao.pessoas.map((p) => [p.id, p.nome]));
  const op = e.gestao.operacao;
  // Apenas IDs realmente conhecidos pertencem à operação local. APP- de outra base não é descartada pelo prefixo.
  const idsLocais = new Set([...[...(e.gestao.historico ?? []), ...historico].map(h => `APP-${h.id}`), ...e.programacao.ocorrencias.map(o => `APP-${o.id}`)]);
  const horasApontadas = (numero, tag, ocorrenciaId = null) => {
    const candidatas = [numero, ocorrenciaId && `APP-${ocorrenciaId}`].filter(Boolean);
    for (const id of candidatas) {
      const o = op?.ordens_servico?.find(x => x.numero_os === id && x.tag === tag);
      if (typeof o?.horas_executadas === 'number' && Number.isFinite(o.horas_executadas) && o.horas_executadas >= 0) return o.horas_executadas;
    }
    return null;
  };
  const importadas = (op?.ordens_servico ?? []).filter((o) => !idsLocais.has(o.numero_os) && (!o.data_abertura || o.data_abertura <= m.dataCorte)).map((o) => ({
    numero: o.numero_os, tag: o.tag, atividade: o.atividade ?? '', tipo: o.tipo_manutencao ?? '', prioridade: o.prioridade ?? '', status: o.status ?? '',
    responsavel: o.responsavel ?? '', abertura: o.data_abertura ?? null, prazo: o.data_prevista ?? null, conclusao: o.data_conclusao ?? null,
    estimadas: o.horas_estimadas ?? null, executadas: o.horas_executadas ?? null, origem: o.origem_registro || 'OS importada', restantes: o.horas_restantes ?? null, observacao: o.observacao ?? '',
  }));
  const vistas = new Set(importadas.map((o) => o.numero));
  const chave = (x) => `${x.equipamentoId}|${x.tarefaId}|${x.dataPrevista}`;
  const porChave = new Map(ocorrencias.map((o) => [chave(o), o]));
  const duracao = new Map(e.programacao.revisoes.flatMap((v) => v.plano.map((t) => [`${t.equipamentoId}|${t.tarefaId}`, t])));
  const nomeTarefa = (descricao, seguranca) => (seguranca ? `${descricao} (tarefa de segurança)` : descricao);
  const execucoes = historico.map((h) => {
    const o = porChave.get(chave(h)) ?? (h.ocorrenciaId ? ocorrencias.find((x) => x.id === h.ocorrenciaId) : null);
    const t = duracao.get(`${h.equipamentoId}|${h.tarefaId}`);
    const horas = o?.horas ?? t?.duracaoHoras ?? null;
    return { numero: `APP-${h.id}`, tag: h.tag, atividade: nomeTarefa(h.descricao || t?.descricao || '', o?.seguranca ?? t?.seguranca),
      tipo: 'PREVENTIVA', prioridade: '', status: h.cancelada ? 'CANCELADA' : 'CONCLUIDA', responsavel: pessoa.get(h.responsavelId) ?? '',
      abertura: h.dataPrevista && h.dataPrevista <= h.data ? h.dataPrevista : h.data, prazo: h.dataPrevista || null,
      conclusao: h.cancelada ? null : h.data, estimadas: horas, executadas: horasApontadas(`APP-${h.id}`, h.tag, h.ocorrenciaId || o?.id), origem: 'Execução no app', restantes: horas === null ? null : 0, observacao: h.observacao ?? '' };
  });
  const feitas = idsConcluidos(e.programacao, historico);
  const programadas = ocorrencias.filter((o) => o.dataPrevista <= m.dataCorte && !feitas.has(o.id)).map((o) => ({
    numero: `APP-${o.id}`, tag: o.tag, atividade: nomeTarefa(o.descricao, o.seguranca), tipo: 'PREVENTIVA', prioridade: '', status: 'PROGRAMADA',
    responsavel: pessoa.get(o.responsavelId) ?? '', abertura: o.dataPrevista, prazo: o.dataPrevista, conclusao: null, estimadas: o.horas, executadas: horasApontadas(`APP-${o.id}`, o.tag), origem: 'Execução no app', restantes: o.horas, observacao: '',
  }));
  const ordens = [...importadas, ...[...execucoes, ...programadas].filter((o) => !vistas.has(o.numero))]
    .sort((a, b) => (a.abertura ?? '').localeCompare(b.abertura ?? '') || a.numero.localeCompare(b.numero));
  const ativos = r.equipamentos.map((a) => ({ tag: a.tag, descricao: a.descricao, familia: nomeTipo.get(a.tipo) ?? a.tipo, setor: a.setor }));
  const doPlano = new Set(ativos.map((a) => a.tag));
  for (const a of op?.ativos ?? []) if (!doPlano.has(a.tag)) ativos.push({ tag: a.tag, descricao: a.descricao_ativo ?? '', familia: a.familia ?? '', setor: a.setor ?? '' });
  ativos.sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, ordens, ativos,
    setores: unicos([...e.gestao.organizacao.setores, ...ativos.map((a) => a.setor)]),
    familias: unicos(ativos.map((a) => a.familia)),
    pessoas: unicos([...e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome), ...ordens.map((o) => o.responsavel)]),
  };
}

/** Cadastros da revisão ativa para os demais modelos (003, 005–007, 009–016): ativos, pessoas, famílias e setores. */
export function dadosCadastrosV2(emissao) {
  const { estado: e, revisao: r, meta: m } = emissao;
  const nomeTipo = new Map(e.biblioteca.tipos.map((t) => [t.id, t.nome]));
  const ativos = r.equipamentos.map((a) => ({ tag: a.tag, descricao: a.descricao, familia: nomeTipo.get(a.tipo) ?? a.tipo, setor: a.setor }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, ativos,
    pessoas: unicos(e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome)),
    familias: unicos(ativos.map((a) => a.familia)),
    setores: unicos([...e.gestao.organizacao.setores, ...ativos.map((a) => a.setor)]),
  };
}

const unicos = (lista) => [...new Set(lista.map((s) => String(s ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

/**
 * PCM-MAN-002. Criticidade: um ativo por linha, com as notas S, Q, P e frequência (1 a 5) avaliadas no app; a classe é
 * calculada pela própria planilha. MFMEA fica para a equipe; opcionais só são emitidos quando existem na biblioteca da revisão.
 */
export function dadosPcmMan002(emissao) {
  const { estado: e, revisao: r, meta: m, ocorrencias } = emissao;
  const nomeTipo = new Map(e.biblioteca.tipos.map((t) => [t.id, t.nome]));
  const pessoa = new Map(e.gestao.pessoas.map((p) => [p.id, p]));
  const ativos = r.equipamentos.map((a) => ({ tag: a.tag, descricao: a.descricao, familia: nomeTipo.get(a.tipo) ?? a.tipo, setor: a.setor }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  const notasDe = new Map(r.equipamentos.map((a) => [a.tag, e.gestao.criticidade.notas[a.id] ?? [null, null, null, null]]));
  const criticidade = ativos.map((a) => { const [s, q, p, f] = notasDe.get(a.tag); return { tag: a.tag, s, q, p, f }; });
  const primeira = new Map();
  for (const o of ocorrencias) {
    if (o.revisaoId !== r.id) continue;
    const k = `${o.equipamentoId}|${o.tarefaId}`;
    if (!primeira.has(k) || o.dataPrevista < primeira.get(k)) primeira.set(k, o.dataPrevista);
  }
  const atividades = r.plano.filter((t) => t.ativa !== false).map((t) => {
    const k = `${t.equipamentoId}|${t.tarefaId}`;
    const equipamento = r.equipamentos.find(a => a.id === t.equipamentoId);
    const fonte = r.biblioteca?.tipos?.find(x => x.id === equipamento?.tipo)?.tarefas?.find(x => x.id === t.tarefaId);
    // Campos opcionais vêm apenas da biblioteca congelada da revisão. Não inferir pela descrição ou especialidade.
    const tipos = { INSPECAO: 'Inspeção', LUBRIFICACAO: 'Lubrificação', PREVENTIVA: 'Preventiva', PREDITIVA: 'Preditiva' };
    const executantes = ['Operador','Manutenção','Terceiro'];
    const origens = ['MFMEA','Manual do fabricante','Requisito legal','Lição aprendida','Outra'];
    const origem = t.origem || fonte?.origem || '';
    return {
      tag: t.tag,
      atividade: t.seguranca ? `${t.descricao} (tarefa de segurança)` : t.descricao,
      tarefaId: t.tarefaId || '', seguranca: t.seguranca === true ? 'Sim' : t.seguranca === false ? 'Não' : '',
      origem: origem ? (origens.includes(origem) ? origem : 'Outra') : '', origemCompleta: origem, versao: t.versao || fonte?.versao || '',
      componente: fonte?.componente || '', tipoTarefa: tipos[fonte?.tipo_tarefa] ?? '',
      executante: executantes.includes(fonte?.executante) ? fonte.executante : '',
      parada: typeof fonte?.exige_parada === 'boolean' ? (fonte.exige_parada ? 'Sim' : 'Não') : '',
      periodicidade: t.periodicidade, dias: DIAS_POR_PERIODICIDADE[t.periodicidade] ?? null,
      responsavel: pessoa.get(r.responsaveis?.[k] ?? '')?.nome ?? '',
      duracao: Number.isFinite(t.duracaoHoras) ? t.duracaoHoras : null,
      primeira: primeira.get(k) ?? null,
    };
  }).sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR') || a.atividade.localeCompare(b.atividade, 'pt-BR'));
  const responsaveis = atividades.map((t) => t.responsavel);
  return {
    elaborado: m.elaborador, aprovado: m.aprovador, ano: Number(m.dataCorte.slice(0, 4)),
    ativos, criticidade,
    setores: unicos([...e.gestao.organizacao.setores, ...ativos.map((a) => a.setor)]),
    familias: unicos(ativos.map((a) => a.familia)),
    pessoas: unicos([...e.gestao.pessoas.filter((p) => p.ativo).map((p) => p.nome), ...responsaveis]),
    atividades,
  };
}

/**
 * PCM-MAN-011 (um ativo, 12 meses do ano), pelo procedimento PCM-MAN-017: horas programadas = HP digitada no Mensal;
 * horas de operação = HO; nº de falhas = N; horas de reparo = soma dos reparos completos; PM planejadas/feitas e horas
 * em preventiva = ocorrências do plano no mês (feitas pelas execuções registradas); horas em corretiva = horas de reparo.
 * Meses ainda não encerrados ficam em branco. Sem dado nunca vira zero.
 */
export function dadosPcmMan011(estado, equipamento, ano, hoje, elaborado = '') {
  const g = estado.gestao; const feitas = idsConcluidos(estado.programacao, g.historico);
  const falhas = falhasDoAtivo(g, equipamento.id, equipamento.tag);
  const meses = Array.from({ length: 12 }, (_, i) => {
    const mes = `${ano}-${String(i + 1).padStart(2, '0')}`;
    if (mes >= hoje.slice(0, 7)) return { mes, aberto: true };
    const total = (g.indicadoresMensais ?? []).find((r) => r.equipamentoId === equipamento.id && r.mes === mes);
    const r = indicadores017(falhas, mes, total?.horasPlanejadas ?? null, `${hoje}T00:00:00`);
    const pms = ocorrenciasVigentes(estado.programacao).filter((o) => o.equipamentoId === equipamento.id && o.dataPrevista.slice(0, 7) === mes);
    const pmFeitas = pms.filter((o) => feitas.has(o.id));
    return { mes, horasProgramadas: r.hp, horasOperacao: r.ho, falhas: r.n, reparosCompletos: r.reparos, horasReparo: r.somaReparos, pmPlanejadas: pms.length,
      pmFeitas: pmFeitas.length, horasCorretiva: r.somaReparos, horasPreventiva: pmFeitas.length ? pmFeitas.reduce((s, o) => s + o.horas, 0) : null,
      provisorio: r.provisoria, alertas: r.alertas };
  });
  const meta = (v) => (Number.isFinite(v) ? v / 100 : null);
  return { ativo: `${equipamento.tag} · ${equipamento.descricao}`, ano, metaDisponibilidade: meta(g.metas.disponibilidade), metaCumprimento: meta(g.metas.aderencia),
    elaborado, pessoas: unicos(g.pessoas.filter((p) => p.ativo).map((p) => p.nome)), meses };
}
