// Cadastros e movimentos locais; não cria documentos nem altera as regras do plano.
import { dataDaSemana, textoData } from './cronograma.js';
import { validarOperacao } from './operacao.js';
import { janelaValida } from './janelas.js';
import { fotosValidas } from './fotos.js';

const objeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(valor));
const texto = (valor, limite = 120, obrigatorio = false) => typeof valor === 'string' &&
  valor.length <= limite && (!obrigatorio || valor.trim().length > 0);
const id = valor => typeof valor === 'string' && /^[A-Za-z0-9_-]+$/.test(valor);
const pessoaOpcional = valor => valor === '' || id(valor);
const chaveTarefa = valor => typeof valor === 'string' && /^[A-Za-z0-9_-]+\|[A-Za-z0-9_-]+$/.test(valor);
const lista = valor => Array.isArray(valor) && valor.length <= 100_000;
const limiteValido = limites => objeto(limites) && Number.isInteger(limites.a) && Number.isInteger(limites.b) &&
  limites.b >= 5 && limites.b < limites.a && limites.a <= 15;
const nota = (n, max) => n === null || (Number.isInteger(n) && n >= 1 && n <= max);

// Criticidade no método do PCM-MAN-002: S, Q e P (consequência) e frequência de falha, de 1 a 5.
export const CRITERIOS_CRITICIDADE = ['Segurança', 'Qualidade', 'Produção', 'Frequência de falha'];
// Matriz do modelo (linha = consequência, posição = frequência). Segurança 5 vira A em qualquer quadrado.
const MATRIZ = ['CCCBB', 'CCBBA', 'CBBAA', 'BBAAA', 'BAAAA'];
// Conversão aprovada pelo mantenedor (D2) da escala antiga de 1 a 3.
const DA_ESCALA_3 = { 1: 1, 2: 3, 3: 5 };

function criticidadeValida(c) {
  if (!objeto(c) || !objeto(c.notas)) return false;
  // Formato antigo (5 notas de 1 a 3 e limites): ainda aceito em backups e convertido ao abrir.
  if (c.escala === undefined) return limiteValido(c.limites) && Object.entries(c.notas).every(([chave, ns]) => id(chave) &&
    Array.isArray(ns) && ns.length === 5 && Array.from(ns).every(n => nota(n, 3)));
  return c.escala === 5 && !Object.hasOwn(c, 'limites') && Array.isArray(c.convertidas) && c.convertidas.every(id) &&
    new Set(c.convertidas).size === c.convertidas.length &&
    Object.entries(c.notas).every(([chave, ns]) => id(chave) && Array.isArray(ns) && ns.length === 4 && Array.from(ns).every(n => nota(n, 5)));
}

/**
 * Ajusta dados do formato anterior ao padrão da Biblioteca v2: prefixo PCM-MAN e criticidade de 1 a 3 convertida
 * para 1 a 5 (a nota de custo/tempo de reparo não tem lugar no 002). As convertidas ficam marcadas para conferência.
 */
export function migrarParaBibliotecaV2(gestao) {
  let nova = gestao;
  if (nova.organizacao.padraoCodigo === 'PCMD') nova = { ...nova, organizacao: { ...nova.organizacao, padraoCodigo: 'PCM-MAN' } };
  const c = nova.criticidade;
  if (c.escala === 5) return nova;
  const notas = {}; const convertidas = [];
  for (const [chave, ns] of Object.entries(c.notas)) {
    notas[chave] = ns.slice(0, 4).map(n => (n === null ? null : DA_ESCALA_3[n]));
    if (ns.some(n => n !== null)) convertidas.push(chave); // inclui quem só tinha a nota de custo, que deixa de existir
  }
  return { ...nova, criticidade: { escala: 5, notas, convertidas } };
}

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

function fonteValida(valor) {
  if (!texto(valor, 2000)) return false;
  if (!valor) return true;
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

function semChavesPerigosas(valor) {
  if (!valor || typeof valor !== 'object') return true;
  return Object.keys(valor).every(chave => !['__proto__', 'prototype', 'constructor'].includes(chave) && semChavesPerigosas(valor[chave]));
}

function registrosValidos(registros, verificar) {
  if (!lista(registros)) return false;
  const vistos = new Set();
  return registros.every(registro => {
    if (!objeto(registro) || !id(registro.id) || vistos.has(registro.id) || !verificar(registro)) return false;
    vistos.add(registro.id);
    return true;
  });
}

export function criarGestao() {
  return {
    versao: 1,
    organizacao: { nome: '', setores: [], elaborador: '', aprovador: '', padraoCodigo: 'PCM-MAN', referencial: 'GERAL (sem norma)' },
    pessoas: [], metas: { disponibilidade: null, aderencia: null }, requisitos: [],
    criticidade: { escala: 5, notas: {}, convertidas: [] },
    responsaveis: {}, historico: [], falhas: [],
  };
}

/** Confere a estrutura inteira antes de abrir dados locais ou restaurar um backup. */
export function validarGestao(g) {
  try {
    if (!objeto(g) || ![1, 2, 3].includes(g.versao) || !semChavesPerigosas(g)) return false;
    // Versão 3 = versão 2 + dados da operação importados (004, 008, 012). Só ela pode conter `operacao`.
    if (g.versao === 3 ? !validarOperacao(g.operacao) : Object.hasOwn(g, 'operacao')) return false;
    const o = g.organizacao;
    if (!objeto(o) || !texto(o.nome) || !texto(o.elaborador) || !texto(o.aprovador) ||
        !texto(o.padraoCodigo, 40, true) || !texto(o.referencial, 120, true) ||
        !lista(o.setores) || !o.setores.every(s => texto(s, 120, true)) || new Set(o.setores).size !== o.setores.length) return false;
    if (!registrosValidos(g.pessoas, p => texto(p.nome, 120, true) && texto(p.funcao) && texto(p.especialidade) && typeof p.ativo === 'boolean')) return false;
    if (!objeto(g.metas) || !['disponibilidade', 'aderencia'].every(c => g.metas[c] === null ||
      (Number.isFinite(g.metas[c]) && g.metas[c] >= 0 && g.metas[c] <= 100))) return false;
    if (!registrosValidos(g.requisitos, r => texto(r.referencia, 2000, true) && texto(r.versao) &&
        (r.data === '' || dataValida(r.data)) && fonteValida(r.fonte) && ['nao_verificado', 'verificado'].includes(r.status) &&
        (r.status !== 'verificado' || (!!r.versao.trim() && !!r.data && !!r.fonte)))) return false;
    if (!criticidadeValida(g.criticidade)) return false;
    if (!objeto(g.responsaveis) || !Object.entries(g.responsaveis).every(([chave, valor]) => chaveTarefa(chave) && pessoaOpcional(valor))) return false;
    if (!registrosValidos(g.historico, h => id(h.equipamentoId) && id(h.tarefaId) && texto(h.tag, Number.MAX_SAFE_INTEGER) && texto(h.descricao, Number.MAX_SAFE_INTEGER) &&
        dataValida(h.data) && (h.dataPrevista === '' || dataValida(h.dataPrevista)) && texto(h.observacao, 2000) &&
        pessoaOpcional(h.responsavelId) && ['app', 'legado'].includes(h.origem) && typeof h.cancelada === 'boolean')) return false;
    const novo = f => ['dataConclusao', 'horasReparo', 'horaInicio', 'horaFim', 'fotos'].some(c => Object.hasOwn(f, c));
    if (g.versao === 1 && (Object.hasOwn(g, 'indicadoresMensais') || Object.hasOwn(g, 'janelasParada') || g.falhas.some(novo))) return false;
    if (g.versao >= 2) {
      // Janelas de parada (D4): opcionais; só datas, horas disponíveis e descrição.
      if (g.janelasParada !== undefined && (!lista(g.janelasParada) || !g.janelasParada.every(janelaValida) ||
          new Set(g.janelasParada.map(j => j.id)).size !== g.janelasParada.length)) return false;
      if (g.indicadoresMensais !== undefined) {
        if (!lista(g.indicadoresMensais)) return false;
        const vistos = new Set();
        for (const r of g.indicadoresMensais) {
          if (!objeto(r) || !id(r.equipamentoId) || !texto(r.tag, Number.MAX_SAFE_INTEGER) ||
              typeof r.mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.mes) || r.mes < '1900-01' ||
              !['horasPlanejadas', 'horasParada'].every(c => r[c] === null || (Number.isFinite(r[c]) && r[c] >= 0)) ||
              (r.horasPlanejadas !== null && r.horasParada !== null && r.horasParada > r.horasPlanejadas)) return false;
          const chave = `${r.equipamentoId}|${r.mes}`;
          if (vistos.has(chave)) return false;
          vistos.add(chave);
        }
      }
      // Horas opcionais (D7): início no dia da falha; fim no dia da conclusão, que precisa existir.
      const hora = v => v === undefined || v === '' || (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
      if (!g.falhas.every(f => !novo(f) || ((f.dataConclusao === undefined || f.dataConclusao === '' || (dataValida(f.dataConclusao) && f.dataConclusao >= f.data)) &&
          (f.horasReparo === undefined || f.horasReparo === null || (Number.isFinite(f.horasReparo) && f.horasReparo >= 0)) &&
          hora(f.horaInicio) && hora(f.horaFim) && (!f.horaFim || !!f.dataConclusao) && fotosValidas(f.fotos) &&
          (!f.horaFim || !f.horaInicio || f.dataConclusao > f.data || f.horaFim >= f.horaInicio)))) return false;
    }
    return registrosValidos(g.falhas, f => id(f.equipamentoId) && texto(f.tag, Number.MAX_SAFE_INTEGER) && dataValida(f.data) &&
      texto(f.sintoma, 2000, true) && texto(f.causa, 2000) && texto(f.acao, 2000) && texto(f.peca) && pessoaOpcional(f.responsavelId) &&
      (f.horasParada === null || (Number.isFinite(f.horasParada) && f.horasParada >= 0)));
  } catch { return false; }
}

/** Mesma regra da aba Criticidade do PCM-MAN-002: consequência = maior nota entre S, Q e P; classe pela matriz. */
export function criticidadeAtivo(notas) {
  if (!Array.isArray(notas) || notas.length !== 4 || !Array.from(notas).every(n => Number.isInteger(n) && n >= 1 && n <= 5)) {
    return { consequencia: null, classe: 'Pendente' };
  }
  const [s, q, p, f] = notas; const consequencia = Math.max(s, q, p);
  return { consequencia, classe: s === 5 ? 'A' : MATRIZ[consequencia - 1][f - 1] };
}

/** Converte a última marcação antiga sem inventar a ocorrência que foi executada. */
export function migrarExecucoesAntigas(gestao, execucoes, equipamentos = [], plano = []) {
  const nova = structuredClone(gestao);
  const pares = new Set(nova.historico.map(h => `${h.equipamentoId}|${h.tarefaId}`));
  const ids = new Set(nova.historico.map(h => h.id));
  for (const [chave, registro] of Object.entries(execucoes ?? {})) {
    if (!chaveTarefa(chave) || pares.has(chave) || !objeto(registro) || !dataValida(registro.data) || !texto(registro.observacao, 2000)) continue;
    const [equipamentoId, tarefaId] = chave.split('|');
    const equipamento = equipamentos.find(e => e.id === equipamentoId);
    const tarefa = plano.find(t => t.equipamentoId === equipamentoId && t.tarefaId === tarefaId);
    // O separador pode existir nos IDs antigos. O sufixo evita colisões sem perder registros.
    const base = `legado-${equipamentoId}-${tarefaId}`.slice(0, 110);
    let identificador = base; let sufixo = 1;
    while (ids.has(identificador)) identificador = `${base}-${sufixo++}`;
    nova.historico.push({ id: identificador, equipamentoId, tarefaId, tag: equipamento?.tag ?? tarefa?.tag ?? '',
      descricao: tarefa?.descricao ?? '', data: registro.data, dataPrevista: '', observacao: registro.observacao,
      responsavelId: '', origem: 'legado', cancelada: false });
    pares.add(chave); ids.add(identificador);
  }
  return nova;
}

/** Datas previstas derivadas das 52 semanas existentes; não faz novo balanceamento. */
export function ocorrenciasPlanejadas(dados) {
  const ocorrencias = []; const vistas = new Set();
  for (const item of dados.cronograma) {
    for (const semana of item.semanas) {
      if (!Number.isInteger(semana) || semana < 1 || semana > 52) continue;
      const inicioSemana = dataDaSemana(dados.inicio, semana);
      const diaria = item.vezesAno > 52;
      for (let deslocamento = 0; deslocamento < (diaria ? 7 : 1); deslocamento++) {
        const data = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + deslocamento);
        if (diaria && (data.getDay() === 0 || data.getDay() === 6)) continue;
        const dataPrevista = textoData(data);
        const chave = `${item.equipamentoId}|${item.tarefaId}|${dataPrevista}`;
        if (vistas.has(chave)) continue;
        vistas.add(chave);
        ocorrencias.push({ chave, equipamentoId: item.equipamentoId, tarefaId: item.tarefaId, tag: item.tag,
          descricao: item.descricao, especialidade: item.especialidade, dataPrevista, horas: item.duracaoHoras });
      }
    }
  }
  return ocorrencias.sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista) || a.chave.localeCompare(b.chave));
}

export function resumoMensal(dados, gestao, ano = dados.inicio.getFullYear()) {
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, previstas: 0, realizadas: 0, horas: 0, percentual: null }));
  const foraDoAno = { previstas: 0, horas: 0 };
  const ocorrencias = ocorrenciasPlanejadas(dados);
  const previstas = new Map(ocorrencias.map(o => [o.chave, o]));
  const realizadas = new Set();
  let semVinculo = 0;
  for (const h of gestao.historico) {
    if (h.cancelada) continue;
    const chave = `${h.equipamentoId}|${h.tarefaId}|${h.dataPrevista}`;
    if (h.dataPrevista && previstas.has(chave)) realizadas.add(chave);
    else if (Number(h.data.slice(0, 4)) === Number(ano)) semVinculo++;
  }
  for (const o of ocorrencias) {
    if (Number(o.dataPrevista.slice(0, 4)) !== Number(ano)) {
      foraDoAno.previstas++; foraDoAno.horas += o.horas;
      continue;
    }
    const mes = meses[Number(o.dataPrevista.slice(5, 7)) - 1];
    mes.previstas++; mes.horas += o.horas;
    if (realizadas.has(o.chave)) mes.realizadas++;
  }
  for (const mes of meses) if (mes.previstas) mes.percentual = mes.realizadas * 100 / mes.previstas;
  return { meses, foraDoAno, semVinculo };
}
