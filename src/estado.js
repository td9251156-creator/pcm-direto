// Estado do app (equipamentos, ajustes, biblioteca e capacidade) e o que fica salvo no navegador.
import padrao from './dados/biblioteca.json';
import { EXEMPLO } from './dados/exemplo.js';
import { atribuirTags, gerarTag, proximoNumero } from './logica/tag.js';
import { siglasDaBiblioteca } from './logica/plano.js';
import { novoId } from './logica/entrada.js';
import { montarDados } from './logica/pacote.js';
import { proximaSegunda, textoData } from './logica/cronograma.js';

const CHAVE = 'pcm-direto:rascunho:v1';
const CHAVE_BIBLIOTECA = 'pcm-direto:biblioteca:v1';

/** Biblioteca que vem com o app (src/dados/biblioteca.json). Nunca é alterada. */
export const BIBLIOTECA_PADRAO = padrao;
const copia = (obj) => JSON.parse(JSON.stringify(obj));

export const estado = {
  equipamentos: [],
  ajustes: {}, // ajustes da revisão: { "idEquipamento|idTarefa": { periodicidade, ativa } }
  exemplo: false, // true enquanto a lista for o exemplo da abertura
  inicio: textoData(proximaSegunda()), // data da semana 1 do cronograma
  capacidade: {}, // horas disponíveis por semana em cada especialidade: { Mecânica: 8 }
  biblioteca: copia(padrao), // biblioteca em uso (pode ter sido editada no app)
  bibliotecaEditada: false,
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
  let biblioteca;
  try { biblioteca = JSON.parse(localStorage.getItem(CHAVE_BIBLIOTECA)); } catch { biblioteca = null; }
  if (biblioteca && Array.isArray(biblioteca.tipos)) {
    estado.biblioteca = biblioteca;
    estado.bibliotecaEditada = true;
  }

  let salvo;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE)); } catch { salvo = null; }
  if (salvo && Array.isArray(salvo.equipamentos)) {
    estado.equipamentos = salvo.equipamentos;
    estado.ajustes = salvo.ajustes ?? {};
    estado.exemplo = !!salvo.exemplo;
    if (salvo.inicio) estado.inicio = salvo.inicio;
    estado.capacidade = salvo.capacidade ?? {};
  } else {
    estado.equipamentos = listaExemplo();
    estado.ajustes = {};
    estado.exemplo = true;
  }
}

/** Salva a lista no navegador. Se o navegador bloquear, o app continua funcionando. */
export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({
      equipamentos: estado.equipamentos,
      ajustes: estado.ajustes,
      exemplo: estado.exemplo,
      inicio: estado.inicio,
      capacidade: estado.capacidade,
      salvoEm: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

/** Troca a biblioteca em uso (depois de editar ou importar) e salva no navegador. */
export function usarBiblioteca(nova) {
  estado.biblioteca = nova;
  estado.bibliotecaEditada = true;
  for (const eq of estado.equipamentos) atualizarTag(eq); // a sigla de um tipo pode ter mudado
  try { localStorage.setItem(CHAVE_BIBLIOTECA, JSON.stringify(nova)); } catch { /* segue sem salvar */ }
  salvar();
}

/** Volta para a biblioteca que vem com o app. */
export function restaurarBiblioteca() {
  estado.biblioteca = copia(padrao);
  estado.bibliotecaEditada = false;
  for (const eq of estado.equipamentos) atualizarTag(eq);
  try { localStorage.removeItem(CHAVE_BIBLIOTECA); } catch { /* nada a fazer */ }
  salvar();
}

/** Adiciona equipamentos já lidos (cadastro, colagem ou arquivo), numerando os que não têm número. */
export function adicionar(novos) {
  if (estado.exemplo) { estado.exemplo = false; }
  for (const e of novos) {
    const eq = { ...e };
    if (!eq.numero) eq.numero = proximoNumero(estado.equipamentos, eq.setor, eq.tipo);
    atualizarTag(eq);
    estado.equipamentos.push(eq);
  }
  salvar();
}

export function remover(id) {
  estado.equipamentos = estado.equipamentos.filter((e) => e.id !== id);
  // Remove também os ajustes desse equipamento
  for (const k of Object.keys(estado.ajustes)) if (k.startsWith(id + '|')) delete estado.ajustes[k];
  salvar();
}

/** Começa uma lista vazia. */
export function limpar() {
  estado.equipamentos = [];
  estado.ajustes = {};
  estado.exemplo = false;
  salvar();
}

/** Volta para o exemplo da abertura. */
export function carregarExemplo() {
  estado.equipamentos = listaExemplo();
  estado.ajustes = {};
  estado.exemplo = true;
  salvar();
}
