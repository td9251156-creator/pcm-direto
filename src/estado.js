// Estado do app (equipamentos e ajustes da revisão) e rascunho salvo no navegador.
import biblioteca from './dados/biblioteca.json';
import { EXEMPLO } from './dados/exemplo.js';
import { atribuirTags, gerarTag, proximoNumero } from './logica/tag.js';
import { siglasDaBiblioteca } from './logica/plano.js';
import { novoId } from './logica/entrada.js';

const CHAVE = 'pcm-direto:rascunho:v1';
export const siglas = siglasDaBiblioteca(biblioteca);

export const estado = {
  equipamentos: [],
  ajustes: {}, // ajustes da revisão: { "idEquipamento|idTarefa": { periodicidade, ativa } }
  exemplo: false, // true enquanto a lista for o exemplo da abertura
};

/** Recalcula a TAG de um equipamento a partir de setor, tipo e número. */
export function atualizarTag(eq) {
  eq.tag = gerarTag(eq.setor, siglas[eq.tipo] ?? '???', eq.numero);
}

/** Lista de exemplo (dados fictícios), com ids e TAGs. */
export function listaExemplo() {
  return atribuirTags(EXEMPLO.map((e) => ({ ...e, id: novoId() })), siglas);
}

/** Lê o rascunho salvo. Na primeira abertura (sem rascunho), carrega o exemplo. */
export function carregar() {
  let salvo;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE)); } catch { salvo = null; }
  if (salvo && Array.isArray(salvo.equipamentos)) {
    estado.equipamentos = salvo.equipamentos;
    estado.ajustes = salvo.ajustes ?? {};
    estado.exemplo = !!salvo.exemplo;
  } else {
    estado.equipamentos = listaExemplo();
    estado.ajustes = {};
    estado.exemplo = true;
  }
}

/** Salva o rascunho no navegador. Se o navegador bloquear, o app continua funcionando. */
export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({
      equipamentos: estado.equipamentos, ajustes: estado.ajustes, exemplo: estado.exemplo, salvoEm: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

/** Adiciona equipamentos já lidos (cadastro, colagem ou CSV), numerando os que não têm número. */
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
