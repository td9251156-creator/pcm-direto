// Estado do app (equipamentos, ajustes, biblioteca e capacidade) e o que fica salvo no navegador.
import padrao from './dados/biblioteca.json';
import { EXEMPLO } from './dados/exemplo.js';
import { atribuirTags, gerarTag, proximoNumero } from './logica/tag.js';
import { siglasDaBiblioteca } from './logica/plano.js';
import { novoId } from './logica/entrada.js';
import { montarDados } from './logica/pacote.js';
import { proximaSegunda, textoData } from './logica/cronograma.js';
import { lerRascunho } from './logica/rascunho.js';
import { verificarBibliotecaEditada } from './logica/edicao.js';
import { validarExecucoes } from './logica/execucao.js';
import { verificarBackup, criarBackup } from './logica/backup.js';
import { abrirRepositorio } from './repositorio.js';
import { criarProgramacao, prepararRevisao, ocorrenciasVigentes, idsConcluidos } from './logica/programacao.js';
import { recuperarTransacao, lerDadoLocal, guardarBackupLocal } from './armazenamento.js';
import { criarGestao, validarGestao, migrarExecucoesAntigas, ocorrenciasPlanejadas } from './logica/gestao.js';
import { marcarExecucao } from './logica/execucao.js';
import { chaveAjuste } from './logica/plano.js';

const CHAVE = 'pcm-direto:rascunho:v1';
const CHAVE_BIBLIOTECA = 'pcm-direto:biblioteca:v1';
const originaisPendentes = new Map();
export const recuperacao = [];
export const armazenamento = { rascunho: true, biblioteca: true, leitura: true };
let ultimaRemocao = null;
let repositorio = null;
let sequencia = 0;
let fila = Promise.resolve();
const cancelamentosPendentes = new Map();
let revisaoPendente = null;
async function esperarOperacoesDoPlano() {
  while(cancelamentosPendentes.size||revisaoPendente)await Promise.all([...cancelamentosPendentes.values(),...(revisaoPendente?[revisaoPendente]:[])].map(p=>p.concluido));
}
let geracaoBase=0;
const vinculoExecucao=(e,previsao)=>`${e.equipamentoId}|${e.tarefaId}|${previsao||''}`;
let persistenciaBloqueada = false;
let antesDaDemonstracao = null;
export let motivoArmazenamento = '';
export const podeDesfazerRemocao = () => ultimaRemocao !== null;

function lerLocal(chave) {
  let original;
  try { original = lerDadoLocal(chave); } catch { armazenamento.leitura = false; return null; }
  if (original === null) return null;
  try { return { valor: JSON.parse(original), original }; }
  catch { return { valor: null, original }; }
}

function preservar(chave, original) {
  originaisPendentes.set(chave, original);
  recuperacao.push({ chave, original });
}

/** Guarda os originais antes de permitir qualquer substituição dos dados locais. */
function prepararGravacao() {
  try {
    if (!recuperarTransacao()) return false;
    for (const [chave, original] of originaisPendentes) {
      localStorage.setItem(`pcm-direto:recuperacao:v1:${novoId()}`, JSON.stringify({ chave, original }));
      originaisPendentes.delete(chave);
    }
    return true;
  } catch { return false; }
}

/** Biblioteca que vem com o app (src/dados/biblioteca.json). Nunca é alterada. */
export const BIBLIOTECA_PADRAO = padrao;
const copia = (obj) => JSON.parse(JSON.stringify(obj));

export const estado = {
  equipamentos: [],
  ajustes: {}, // ajustes da revisão: { "idEquipamento|idTarefa": { periodicidade, ativa } }
  execucoes: {}, // última marcação por equipamento e tarefa; não altera o plano
  exemplo: false, // true enquanto a lista for o exemplo da abertura
  inicio: textoData(proximaSegunda()), // data da semana 1 do cronograma
  capacidade: {}, // horas disponíveis por semana em cada especialidade: { Mecânica: 8 }
  biblioteca: copia(padrao), // biblioteca em uso (pode ter sido editada no app)
  bibliotecaEditada: false,
  gestao: criarGestao(),
  programacao: criarProgramacao(),
  metadados: { ultimoBackup: '', alteradoEm: '', passo: 1 },
};

/** Siglas por tipo da biblioteca em uso: { motor_eletrico: 'MOT', ... } */
export function siglas() {
  return siglasDaBiblioteca(estado.biblioteca);
}

/** Plano, cronograma e resumo da lista atual. */
export function dadosAtuais() {
  return montarDados(estado.equipamentos, estado.biblioteca, estado.ajustes, estado.inicio, estado.capacidade);
}

/** Recalcula a TAG de um equipamento a partir de setor, tipo e número. */
export function atualizarTag(eq) {
  eq.tag = gerarTag(eq.setor, siglas()[eq.tipo] ?? '???', eq.numero);
}

/** Lista de exemplo (dados fictícios), com ids e TAGs. */
export function listaExemplo() {
  return atribuirTags(EXEMPLO.map((e) => ({ ...e, id: novoId() })), siglas());
}

/** Lê o que está salvo. Na primeira abertura (nada salvo), carrega o exemplo. */
export function carregar() {
  geracaoBase++;
  ultimaRemocao = null;
  Object.assign(armazenamento, { rascunho: true, biblioteca: true, leitura: true });
  if (!recuperarTransacao()) armazenamento.leitura = false;
  recuperacao.length = 0;
  originaisPendentes.clear();
  estado.biblioteca = copia(padrao);
  estado.bibliotecaEditada = false;
  const biblioteca = lerLocal(CHAVE_BIBLIOTECA);
  if (biblioteca && verificarBibliotecaEditada(padrao, biblioteca.valor).length === 0) {
    estado.biblioteca = biblioteca.valor;
    estado.bibliotecaEditada = true;
  } else if (biblioteca) preservar(CHAVE_BIBLIOTECA, biblioteca.original);

  estado.inicio = textoData(proximaSegunda());
  estado.capacidade = {};
  const local = lerLocal(CHAVE);
  const lido = local && lerRascunho(local.valor);
  const salvo = lido && validarExecucoes(lido.execucoes ?? {}) ? lido : null;
  estado.execucoes = salvo?.execucoes ?? {};
  estado.gestao = salvo?.gestao ?? criarGestao();
  estado.programacao = salvo?.programacao ?? criarProgramacao();
  estado.metadados = salvo?.metadados ?? { ultimoBackup: '', alteradoEm: '', passo: 1 };
  if (salvo) {
    estado.equipamentos = salvo.equipamentos.map((e) => ({ ...e }));
    for (const e of estado.equipamentos) atualizarTag(e);
    estado.ajustes = salvo.ajustes ?? {};
    estado.exemplo = !!salvo.exemplo;
    if (salvo.inicio) estado.inicio = salvo.inicio;
    estado.capacidade = salvo.capacidade ?? {};
  } else {
    if (local) preservar(CHAVE, local.original);
    estado.equipamentos = local ? [] : listaExemplo();
    estado.ajustes = {};
    estado.exemplo = !local;
  }
  estado.gestao = migrarExecucoesAntigas(estado.gestao, estado.execucoes, estado.equipamentos, dadosAtuais().plano);
  atualizarUltimasExecucoes();
}

/** Valida tudo antes de restaurar; mantém os originais se a gravação não terminar. */
export async function restaurarBackup(arquivo) {
  const r = verificarBackup(arquivo, padrao);
  if (!r.ok) return r;
  await esperarOperacoesDoPlano();
  if (repositorio) {
    const anterior = criarBackup(estado);
    aplicarDados(r);
    if (!await salvar({ recuperarAnterior: true })) { aplicarDados(verificarBackup(anterior, padrao)); return { ok: false, motivo: motivoArmazenamento }; }
    return { ok: true };
  }
  if (persistenciaBloqueada) return { ok: false, motivo: motivoArmazenamento };
  if (!prepararGravacao() || !guardarBackupLocal(r.biblioteca, r.rascunho)) {
    armazenamento.rascunho = false;
    return { ok: false, motivo: 'Não foi possível guardar o backup neste aparelho. Os dados anteriores foram preservados; baixe uma cópia antes de sair.' };
  }
  carregar();
  return { ok: true };
}

/** Salva a lista no navegador. Se o navegador bloquear, o app continua funcionando. */
export async function salvar(opcoes = {}) {
  if (antesDaDemonstracao) return true; // O exemplo nunca substitui a base de trabalho.
  if (!opcoes.semAlteracao) estado.metadados.alteradoEm = new Date().toISOString();
  if (persistenciaBloqueada) { armazenamento.rascunho = false; return false; }
  const dados = criarBackup(estado);
  if(revisaoPendente?.geracao===geracaoBase)dados.rascunho.programacao={...copia(revisaoPendente.programacao),emissoes:dados.rascunho.programacao.emissoes};
  // Todas as cópias enfileiradas incluem o cancelamento; a tela só o recebe após gravar.
  const pendentes=new Set([...cancelamentosPendentes].filter(([,p])=>p.geracao===geracaoBase).map(([id])=>id));
  if(pendentes.size){
    dados.rascunho.gestao.historico=dados.rascunho.gestao.historico.map(h=>pendentes.has(h.id)?{...h,cancelada:true}:h);
    dados.rascunho.execucoes=ultimasExecucoes(dados.rascunho.gestao.historico,dados.rascunho.equipamentos);
  }
  if (repositorio) {
    const tarefa = fila.then(async () => {
      if (persistenciaBloqueada) return false;
      try {
        sequencia = await repositorio.gravar(dados, sequencia, opcoes);
        Object.assign(armazenamento, { rascunho: true, biblioteca: true, leitura: true });
        motivoArmazenamento = ''; return true;
      } catch (erro) {
        armazenamento.rascunho = false; motivoArmazenamento = erro.message;
        // Bloquear a fila após falha impede confirmar uma gravação posterior com base obsoleta.
        persistenciaBloqueada = true; return false;
      }
    });
    fila = tarefa.then(() => {});
    return tarefa;
  }
  try {
    if (!prepararGravacao()) { armazenamento.rascunho = false; return false; }
    localStorage.setItem(CHAVE, JSON.stringify({...dados.rascunho,salvoEm:new Date().toISOString()}));
    armazenamento.rascunho = true;
    return true;
  } catch {
    armazenamento.rascunho = false;
    return false;
  }
}

/** Troca a biblioteca em uso (depois de editar ou importar) e salva no navegador. */
export async function usarBiblioteca(nova) {
  estado.biblioteca = nova;
  estado.bibliotecaEditada = true;
  for (const eq of estado.equipamentos) atualizarTag(eq); // a sigla de um tipo pode ter mudado
  if (repositorio || persistenciaBloqueada || antesDaDemonstracao) return salvar();
  try {
    if (!prepararGravacao()) throw new Error('Cópia de recuperação indisponível');
    localStorage.setItem(CHAVE_BIBLIOTECA, JSON.stringify(nova));
    armazenamento.biblioteca = true;
  } catch { armazenamento.biblioteca = false; }
  return await salvar() && armazenamento.biblioteca;
}

/** Volta para a biblioteca que vem com o app. */
export async function restaurarBiblioteca() {
  estado.biblioteca = copia(padrao);
  estado.bibliotecaEditada = false;
  for (const eq of estado.equipamentos) atualizarTag(eq);
  if (repositorio || persistenciaBloqueada || antesDaDemonstracao) return salvar();
  try {
    if (!prepararGravacao()) throw new Error('Cópia de recuperação indisponível');
    localStorage.removeItem(CHAVE_BIBLIOTECA);
    armazenamento.biblioteca = true;
  } catch { armazenamento.biblioteca = false; }
  return await salvar() && armazenamento.biblioteca;
}

/** Adiciona equipamentos já lidos (cadastro, colagem ou arquivo), numerando os que não têm número. */
export async function adicionar(novos) {
  if (estado.exemplo) { estado.exemplo = false; }
  for (const e of novos) {
    const eq = { ...e };
    if (!eq.numero) eq.numero = proximoNumero(estado.equipamentos, eq.setor, eq.tipo);
    atualizarTag(eq);
    estado.equipamentos.push(eq);
  }
  return salvar();
}

export async function remover(id) {
  const indice = estado.equipamentos.findIndex((e) => e.id === id);
  if (indice < 0) return;
  estado.gestao = migrarExecucoesAntigas(estado.gestao, estado.execucoes, estado.equipamentos, dadosAtuais().plano);
  const selecionar = (dados) => Object.fromEntries(Object.entries(dados).filter(([k]) => k.startsWith(id + '|')));
  ultimaRemocao = {
    equipamento: { ...estado.equipamentos[indice] }, indice,
    ajustes: selecionar(estado.ajustes), execucoes: selecionar(estado.execucoes),
  };
  estado.equipamentos = estado.equipamentos.filter((e) => e.id !== id);
  // Remove também os ajustes desse equipamento
  for (const k of Object.keys(estado.ajustes)) if (k.startsWith(id + '|')) delete estado.ajustes[k];
  for (const k of Object.keys(estado.execucoes)) if (k.startsWith(id + '|')) delete estado.execucoes[k];
  return salvar();
}

/** Desfaz uma remoção desta sessão, recuperando também ajustes e marcações. */
export async function desfazerRemocao() {
  if (!ultimaRemocao) return { ok: false, motivo: 'Não há remoção para desfazer nesta sessão.' };
  const { equipamento, indice, ajustes, execucoes } = ultimaRemocao;
  const eq = { ...equipamento };
  atualizarTag(eq);
  if (estado.equipamentos.some((e) => e.id === eq.id || e.tag === eq.tag)) {
    return { ok: false, motivo: 'A TAG removida já está em uso. Corrija a numeração desse equipamento antes de desfazer.' };
  }
  estado.equipamentos.splice(indice, 0, eq);
  Object.assign(estado.ajustes, ajustes);
  Object.assign(estado.execucoes, execucoes);
  atualizarUltimasExecucoes();
  ultimaRemocao = null;
  return { ok: true, guardado: await salvar() };
}

/** Começa uma lista vazia. */
export async function limpar() {
  ultimaRemocao = null;
  estado.equipamentos = [];
  estado.ajustes = {};
  estado.execucoes = {};
  estado.gestao.criticidade.notas = {};
  estado.gestao.responsaveis = {};
  estado.exemplo = false;
  return salvar();
}

/** Volta para o exemplo da abertura. */
export async function carregarExemplo() {
  ultimaRemocao = null;
  estado.equipamentos = listaExemplo();
  estado.ajustes = {};
  estado.execucoes = {};
  estado.gestao.criticidade.notas = {};
  estado.gestao.responsaveis = {};
  estado.exemplo = true;
  return salvar();
}

/** Atualiza somente dados de gestão válidos. Falha de armazenamento é informada pela interface. */
export async function atualizarGestao(nova) {
  if (!validarGestao(nova)) return { ok: false, motivo: 'Confira os campos: há dados de gestão inválidos.' };
  estado.gestao = nova;
  return { ok: true, guardado: await salvar() };
}

/** Registra cada execução sem alterar frequência ou planejamento. */
export async function registrarExecucao(linha, alteracao) {
  if(revisaoPendente)return {ok:false,motivo:'Aguarde a ativação da revisão terminar antes de registrar uma execução.'};
  if([...cancelamentosPendentes.values()].some(p=>p.geracao===geracaoBase&&p.vinculo===vinculoExecucao(linha,alteracao.dataPrevista)))return {ok:false,motivo:'Aguarde o cancelamento desta ocorrência terminar antes de registrar novamente.'};
  const r = marcarExecucao(estado.execucoes, linha, { ...alteracao, concluida: true });
  if (!r.ok) return r;
  const dataPrevista = alteracao.dataPrevista || '';
  const previstas = estado.programacao.revisoes.length ? ocorrenciasVigentes(estado.programacao) : ocorrenciasPlanejadas(dadosAtuais());
  const ocorrencia = alteracao.ocorrenciaId ? previstas.find(o => o.id === alteracao.ocorrenciaId) : null;
  if (alteracao.ocorrenciaId && (!ocorrencia || ocorrencia.equipamentoId !== linha.equipamentoId || ocorrencia.tarefaId !== linha.tarefaId)) return { ok: false, motivo: 'Ocorrência não encontrada na programação vigente.' };
  if (dataPrevista && !previstas.some(o => o.equipamentoId === linha.equipamentoId && o.tarefaId === linha.tarefaId && o.dataPrevista === dataPrevista)) {
    return { ok: false, motivo: 'Escolha uma ocorrência prevista do plano atual ou deixe sem vínculo.' };
  }
  if (dataPrevista && estado.gestao.historico.some(h => !h.cancelada && h.equipamentoId === linha.equipamentoId && h.tarefaId === linha.tarefaId && h.dataPrevista === dataPrevista)) {
    return { ok: false, motivo: 'Essa ocorrência já tem execução registrada. Cancele o registro anterior para corrigir.' };
  }
  const registro = { id: novoId(), equipamentoId: linha.equipamentoId, tarefaId: linha.tarefaId,
    tag: ocorrencia?.tag ?? linha.tag, descricao: ocorrencia?.descricao ?? linha.descricao, data: alteracao.data, dataPrevista,
    ...(ocorrencia ? { ocorrenciaId: ocorrencia.id, revisaoId: ocorrencia.revisaoId } : {}),
    observacao: alteracao.observacao.trim(), responsavelId: alteracao.responsavelId || '', origem: 'app', cancelada: false };
  const nova = { ...estado.gestao, historico: [...estado.gestao.historico, registro] };
  if (!validarGestao(nova)) return { ok: false, motivo: 'Não foi possível registrar a execução: confira os campos.' };
  estado.gestao = nova;
  atualizarUltimasExecucoes();
  return { ok: true, guardado: await salvar() };
}

function ultimasExecucoes(historico,equipamentos) {
  const ultimas = {};
  const ativos = new Set(equipamentos.map(e => e.id));
  for (const h of historico) {
    if (h.cancelada || !ativos.has(h.equipamentoId)) continue;
    const chave = chaveAjuste(h.equipamentoId, h.tarefaId);
    if (!ultimas[chave] || h.data >= ultimas[chave].data) ultimas[chave] = { data: h.data, observacao: h.observacao };
  }
  return ultimas;
}
function atualizarUltimasExecucoes(){estado.execucoes=ultimasExecucoes(estado.gestao.historico,estado.equipamentos);}

export async function cancelarExecucao(id) {
  if(revisaoPendente)return {ok:false,motivo:'Aguarde a ativação da revisão terminar antes de cancelar uma execução.'};
  const anterior=estado.gestao.historico.find(h=>h.id===id&&!h.cancelada);
  if(!anterior||cancelamentosPendentes.has(id))return {ok:false,motivo:'Registro não encontrado, já cancelado ou aguardando gravação.'};
  const geracao=geracaoBase;
  let concluir;
  const concluido=new Promise(resolve=>{concluir=resolve;});
  cancelamentosPendentes.set(id,{vinculo:vinculoExecucao(anterior,anterior.dataPrevista),geracao,concluido});
  try{
    const guardado=await salvar();
    if(!guardado)return {ok:false,guardado:false,motivo:'Cancelamento não guardado. O registro anterior foi mantido. Baixe um backup antes de sair.'};
    if(geracaoBase===geracao){
      estado.gestao={...estado.gestao,historico:estado.gestao.historico.map(h=>h.id===id?{...h,cancelada:true}:h)};
      atualizarUltimasExecucoes();
    }
    return {ok:true,guardado:true};
  }catch{return {ok:false,guardado:false,motivo:'Não foi possível guardar o cancelamento. O registro anterior foi mantido.'};}
  finally{cancelamentosPendentes.delete(id);concluir();}
}

function aplicarDados(r) {
  geracaoBase++;
  Object.assign(estado, copia(r.rascunho), { biblioteca: copia(r.biblioteca),
    execucoes: copia(r.rascunho.execucoes ?? {}),
    bibliotecaEditada: true, programacao: copia(r.rascunho.programacao ?? criarProgramacao()),
    metadados: copia(r.rascunho.metadados ?? { ultimoBackup: '', alteradoEm: '', passo: 1 }),
    gestao: copia(r.rascunho.gestao ?? criarGestao()) });
  estado.gestao = migrarExecucoesAntigas(estado.gestao, estado.execucoes, estado.equipamentos, dadosAtuais().plano);
  atualizarUltimasExecucoes();
}

/** Migração só publica a cópia válida após a transação; nunca remove as chaves antigas. */
export async function inicializarPersistencia() {
  try {
    repositorio = await abrirRepositorio();
    const base = await repositorio.ler();
    if (base) {
      const r = base.formato === 3 && verificarBackup(base.dados, padrao);
      if (!r?.ok || !Number.isSafeInteger(base.sequencia) || base.sequencia < 1) {
        recuperacao.push({ chave: 'IndexedDB:principal', original: JSON.stringify(base) });
        throw new Error('A base local é incompatível ou está danificada. Nenhum dado foi substituído.');
      }
      sequencia = base.sequencia; aplicarDados(r); return;
    }
    carregar();
    if (!armazenamento.leitura || recuperacao.length) throw new Error('Os dados antigos precisam de recuperação antes da migração. Baixe os originais.');
    if (lerDadoLocal(CHAVE) === null) {
      estado.equipamentos = []; estado.exemplo = false;
    }
    sequencia = await repositorio.gravar(criarBackup(estado), 0);
  } catch (erro) {
    persistenciaBloqueada = true; motivoArmazenamento = erro.message; armazenamento.leitura = false;
  }
}

export function referenciaRevisao(){
  return JSON.stringify({geracao:geracaoBase,hoje:textoData(new Date()),equipamentos:estado.equipamentos,ajustes:estado.ajustes,
    inicio:estado.inicio,capacidade:estado.capacidade,biblioteca:estado.biblioteca,responsaveis:estado.gestao.responsaveis,pessoas:estado.gestao.pessoas,
    programacao:estado.programacao,historico:estado.gestao.historico});
}

export async function ativarRevisao(meta,referencia=null,hoje=textoData(new Date())) {
  if(revisaoPendente||cancelamentosPendentes.size)return {ok:false,motivo:'Aguarde a gravação pendente e confira o impacto novamente.'};
  if(referencia!==null&&referencia!==referenciaRevisao())return {ok:false,motivo:'O plano ou o histórico mudou. Confira o impacto novamente antes de ativar.'};
  const r = prepararRevisao(estado.programacao, dadosAtuais(), estado.gestao, { ...meta, capacidade: estado.capacidade }, hoje);
  if (!r.ok) return r;
  let concluir;const concluido=new Promise(resolve=>{concluir=resolve;});const geracao=geracaoBase;
  revisaoPendente={programacao:r.programacao,geracao,concluido};
  try {
    if(!await salvar())return {ok:false,motivo:motivoArmazenamento||'Não foi possível guardar a revisão. A programação anterior foi mantida.'};
    if(geracao===geracaoBase)estado.programacao={...r.programacao,emissoes:estado.programacao.emissoes};
    return {ok:true,impacto:r.impacto};
  } catch {return {ok:false,motivo:'Não foi possível guardar a revisão. A programação anterior foi mantida.'};}
  finally{revisaoPendente=null;concluir();}
}

export async function registrarOcorrencia(id, alteracao = {}) {
  const o = ocorrenciasVigentes(estado.programacao).find(o => o.id === id);
  if (!o) return { ok: false, motivo: 'Ocorrência não encontrada.' };
  if (idsConcluidos(estado.programacao, estado.gestao.historico).has(id)) return { ok: false, motivo: 'Esta ocorrência já foi registrada.' };
  return registrarExecucao({ ...o, ativa: true }, { data: textoData(new Date()), observacao: '', responsavelId: o.responsavelId,
    ...alteracao, ocorrenciaId: id, dataPrevista: o.dataPrevista });
}

export async function demonstrar() {
  await esperarOperacoesDoPlano();
  geracaoBase++;
  if (!antesDaDemonstracao) antesDaDemonstracao = criarBackup(estado);
  estado.gestao = criarGestao(); estado.programacao = criarProgramacao();
  estado.biblioteca = copia(padrao); estado.inicio = textoData(proximaSegunda()); estado.capacidade = {};
  estado.metadados = { ultimoBackup: '', alteradoEm: '', passo: 1 };
  estado.gestao.organizacao.nome = 'Indústria Exemplo';
  await carregarExemplo();
  // O exemplo já abre com o plano ativo desde a segunda-feira desta semana, para a Visão geral
  // e Executar mostrarem tarefas. Fica só na demonstração; a base de trabalho não muda.
  const segunda = new Date(); segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
  estado.inicio = textoData(segunda);
  await ativarRevisao({ id: novoId(), vigencia: estado.inicio, elaborador: 'Técnico Exemplo', resumo: 'Plano preventivo inicial do exemplo' }, null, estado.inicio);
  // Ocorrências de dias anteriores aparecem feitas na data prevista; três ficam vencidas para mostrar o alerta.
  const hoje = textoData(new Date());
  const passadas = ocorrenciasVigentes(estado.programacao).filter(o => o.dataPrevista < hoje);
  for (const o of passadas.slice(0, Math.max(0, passadas.length - 3))) await registrarOcorrencia(o.id, { data: o.dataPrevista });
}
export function sairDaDemonstracao() {
  if (antesDaDemonstracao) aplicarDados(verificarBackup(antesDaDemonstracao, padrao));
  antesDaDemonstracao = null;
}
export const emDemonstracao = () => antesDaDemonstracao !== null;
