// Revisões e ocorrências persistidas: editar o rascunho não reescreve a programação.
import { dataValida, objeto } from './rascunho.js';
import { ocorrenciasPlanejadas } from './gestao.js';
import { textoData, lerData } from './cronograma.js';

const copia = valor => JSON.parse(JSON.stringify(valor));
const idValido = valor => typeof valor === 'string' && /^[A-Za-z0-9_-]+$/.test(valor);
const texto = valor => typeof valor === 'string';
export const criarProgramacao = () => ({ versao: 1, revisoes: [], ocorrencias: [], emissoes: [] });
const chave = o => `${o.equipamentoId}|${o.tarefaId}|${o.dataPrevista}`;

export function validarProgramacao(p) {
  if (!objeto(p) || p.versao !== 1 || !['revisoes', 'ocorrencias', 'emissoes'].every(k => Array.isArray(p[k]))) return false;
  const revisoes = new Set(); const ocorrencias = new Set(); const emissoes = new Set();
  for (const r of p.revisoes) {
    if (!objeto(r) || !idValido(r.id) || revisoes.has(r.id) || r.numero !== revisoes.size + 1 ||
      !dataValida(r.vigencia) || !dataValida(r.inicio) || !dataValida(r.criadaEm) || !texto(r.elaborador) ||
      !r.elaborador.trim() || !texto(r.resumo) || !r.resumo.trim() || !Array.isArray(r.plano) ||
      !Array.isArray(r.equipamentos) || !objeto(r.capacidade)) return false;
    if (r.plano.some(t => !objeto(t) || !idValido(t.equipamentoId) || !idValido(t.tarefaId) ||
      !texto(t.descricao) || !texto(t.especialidade) || !Number.isFinite(t.duracaoHoras) || t.duracaoHoras <= 0 ||
      typeof t.seguranca !== 'boolean' || typeof t.ativa !== 'boolean')) return false;
    if (Object.values(r.capacidade).some(v => !Number.isFinite(v) || v < 0)) return false;
    if (p.revisoes[revisoes.size - 1]?.vigencia > r.vigencia) return false;
    revisoes.add(r.id);
  }
  const porRevisao = new Map(p.revisoes.map(r => [r.id, new Set(r.plano.map(t => `${t.equipamentoId}|${t.tarefaId}`))]));
  const semanticas = new Set(); const vigentes = new Set();
  for (const o of p.ocorrencias) {
    if (!objeto(o) || !texto(o.id) || !o.id || ocorrencias.has(o.id) || !revisoes.has(o.revisaoId) ||
      !idValido(o.equipamentoId) || !idValido(o.tarefaId) || !dataValida(o.dataPrevista) || !texto(o.tag) ||
      !texto(o.descricao) || !texto(o.especialidade) || !texto(o.setor) || !texto(o.responsavelId) ||
      !Number.isFinite(o.horas) || o.horas <= 0 || typeof o.seguranca !== 'boolean' ||
      !['prevista', 'substituida'].includes(o.situacao) || !porRevisao.get(o.revisaoId).has(`${o.equipamentoId}|${o.tarefaId}`)) return false;
    const semantica = `${o.revisaoId}|${chave(o)}`;
    if (semanticas.has(semantica) || (o.situacao === 'prevista' && vigentes.has(chave(o)))) return false;
    semanticas.add(semantica); if (o.situacao === 'prevista') vigentes.add(chave(o));
    ocorrencias.add(o.id);
  }
  for (const e of p.emissoes) {
    if (!objeto(e) || !idValido(e.id) || emissoes.has(e.id) || !revisoes.has(e.revisaoId) ||
      !dataValida(e.dataCorte) || !texto(e.modelo) || !texto(e.versaoModelo)) return false;
    emissoes.add(e.id);
  }
  return true;
}

export function idsConcluidos(programacao, historico) {
  const resultado = new Set();
  const porId = new Map(programacao.ocorrencias.map(o => [o.id, o]));
  const porChave = new Map(programacao.ocorrencias.filter(o => o.situacao === 'prevista').map(o => [chave(o), o.id]));
  for (const h of historico) {
    if (h.cancelada) continue;
    if (h.ocorrenciaId) {
      const o = porId.get(h.ocorrenciaId);
      if (o && o.equipamentoId === h.equipamentoId && o.tarefaId === h.tarefaId && o.dataPrevista === h.dataPrevista) resultado.add(h.ocorrenciaId);
    }
    // Só o vínculo explícito anterior é aceito; nunca inferir da data realizada.
    else if (h.dataPrevista && porChave.has(chave(h))) resultado.add(porChave.get(chave(h)));
  }
  return resultado;
}

/** Prévia pura; não muda rascunho, revisão nem histórico. */
export function prepararRevisao(programacao, dados, gestao, metadados, hoje = textoData(new Date())) {
  if (!validarProgramacao(programacao)) return { ok: false, motivo: 'A programação atual é inválida. Preserve um backup para recuperação.' };
  const { id, vigencia, elaborador, resumo } = metadados;
  if (!idValido(id) || programacao.revisoes.some(r => r.id === id) || !dataValida(vigencia) || vigencia < hoje ||
    !texto(elaborador) || !elaborador.trim() || !texto(resumo) || !resumo.trim()) {
    return { ok: false, motivo: 'Informe vigência a partir de hoje, elaborador e resumo da revisão.' };
  }
  if (programacao.revisoes.at(-1)?.vigencia > vigencia) return { ok: false, motivo: 'A vigência não pode anteceder a última revisão.' };
  if (!dados.plano.some(t => t.ativa)) return { ok: false, motivo: 'O plano precisa de ao menos uma tarefa ativa.' };
  if (dados.plano.some(t => t.seguranca && !t.ativa)) return { ok: false, motivo: 'Tarefas de segurança precisam permanecer ativas.' };
  const nova = copia(programacao);
  const concluidas = idsConcluidos(nova, gestao.historico);
  const substituidas = nova.ocorrencias.filter(o => o.situacao === 'prevista' && o.dataPrevista >= vigencia && !concluidas.has(o.id));
  const ids = new Set(substituidas.map(o => o.id));
  nova.ocorrencias.forEach(o => { if (ids.has(o.id)) o.situacao = 'substituida'; });
  const preservadas = new Set(nova.ocorrencias.filter(o => o.situacao === 'prevista').map(chave));
  const porTarefa = new Map(dados.plano.map(t => [`${t.equipamentoId}|${t.tarefaId}`, t]));
  const porAtivo = new Map(dados.equipamentos.map(e => [e.id, e]));
  const adicionadas = ocorrenciasPlanejadas(dados).filter(o => o.dataPrevista >= vigencia && !preservadas.has(chave(o))).map(o => {
    const t = porTarefa.get(`${o.equipamentoId}|${o.tarefaId}`);
    return { ...o, id: `${id}|${o.chave}`, revisaoId: id, setor: porAtivo.get(o.equipamentoId)?.setor ?? '',
      seguranca: !!t.seguranca, responsavelId: gestao.responsaveis[`${o.equipamentoId}|${o.tarefaId}`] ?? '', situacao: 'prevista' };
  });
  const revisao = { id, numero: nova.revisoes.length + 1, vigencia, criadaEm: hoje, elaborador: elaborador.trim(), resumo: resumo.trim(),
    inicio: textoData(dados.inicio), capacidade: copia(metadados.capacidade ?? {}), biblioteca: copia(dados.biblioteca ?? {}),
    plano: copia(dados.plano), equipamentos: copia(dados.equipamentos), responsaveis: copia(gestao.responsaveis) };
  nova.revisoes.push(revisao); nova.ocorrencias.push(...adicionadas);
  if (!validarProgramacao(nova)) return { ok: false, motivo: 'Não foi possível validar a revisão. O plano anterior foi mantido.' };
  const horas = lista => lista.reduce((s, o) => s + o.horas, 0);
  return { ok: true, programacao: nova, impacto: { substituidas: substituidas.length, adicionadas: adicionadas.length,
    preservadasConcluidas: nova.ocorrencias.filter(o => concluidas.has(o.id)).length,
    horasAnteriores: horas(substituidas), horasNovas: horas(adicionadas) } };
}

export function ocorrenciasVigentes(p) { return p.ocorrencias.filter(o => o.situacao === 'prevista'); }

export function painelDaSemana(p, historico, hoje = textoData(new Date())) {
  const inicio = lerData(hoje); const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
  const fim = new Date(inicio); fim.setDate(fim.getDate() + 6);
  const segunda = textoData(inicio); const domingo = textoData(fim);
  const concluidas = idsConcluidos(p, historico);
  const ativas = ocorrenciasVigentes(p);
  const pendentes = ativas.filter(o => !concluidas.has(o.id));
  const semana = ativas.filter(o => o.dataPrevista >= segunda && o.dataPrevista <= domingo);
  const carga = {};
  for (const o of semana) carga[o.especialidade] = (carga[o.especialidade] ?? 0) + o.horas;
  return { inicio: segunda, fim: domingo, carga,
    vencidas: pendentes.filter(o => o.dataPrevista < hoje),
    nestaSemana: pendentes.filter(o => o.dataPrevista >= hoje && o.dataPrevista <= domingo),
    proximas: pendentes.filter(o => o.dataPrevista > domingo),
    concluidas: semana.filter(o => concluidas.has(o.id)).length, previstas: semana.length };
}

export function resumoMensalRevisoes(p, historico, ano) {
  const concluidas = idsConcluidos(p, historico);
  const meses = Array.from({length:12}, (_,i) => ({mes:i+1,previstas:0,realizadas:0,horas:0,percentual:null}));
  for (const o of ocorrenciasVigentes(p)) {
    if (Number(o.dataPrevista.slice(0,4)) !== Number(ano)) continue;
    const m = meses[Number(o.dataPrevista.slice(5,7))-1];
    m.previstas++; m.horas+=o.horas; if (concluidas.has(o.id)) m.realizadas++;
  }
  for (const m of meses) if (m.previstas) m.percentual=m.realizadas*100/m.previstas;
  return meses;
}
