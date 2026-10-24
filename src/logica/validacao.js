// Validação dos equipamentos, com sugestão de correção para cada problema.
import { chave, distancia } from './texto.js';
import { normalizarSetor, proximoNumero, SETOR_MIN, SETOR_MAX } from './tag.js';

/**
 * Tenta reconhecer o tipo digitado pelo usuário ("Motor Elétrico", "motor_eletrico", "MOT").
 * Retorna o id do tipo ou null.
 */
export function resolverTipo(texto, tipos) {
  const k = chave(texto);
  if (!k) return null;
  const achado = tipos.find(
    (t) => t.id === k || chave(t.nome) === k || chave(t.sigla) === k,
  );
  return achado ? achado.id : null;
}

/** Tipo mais parecido com o texto, para sugerir ("bomba" -> Bomba centrífuga). */
export function tipoMaisParecido(texto, tipos) {
  const k = chave(texto);
  if (!k) return null;
  // Primeiro: o texto aparece dentro do nome
  const contem = tipos.find((t) => chave(t.nome).includes(k) || k.includes(chave(t.nome)));
  if (contem) return contem;
  // Depois: menor distância de letras
  let melhor = null;
  let menor = Infinity;
  for (const t of tipos) {
    const d = Math.min(distancia(k, t.id), distancia(k, chave(t.nome)));
    if (d < menor) { menor = d; melhor = t; }
  }
  return menor <= 4 ? melhor : null;
}

/**
 * Lista os problemas de um equipamento.
 * Cada problema: { campo, mensagem, sugestao } — sugestao é o valor corrigido, quando houver.
 */
export function validarEquipamento(eq, tipos, todos = []) {
  const problemas = [];

  // Setor
  const setor = String(eq.setor ?? '');
  if (!setor.trim()) {
    problemas.push({ campo: 'setor', mensagem: `Informe o setor (${SETOR_MIN} a ${SETOR_MAX} letras, ex.: UTL).`, sugestao: null });
  } else {
    const corrigido = normalizarSetor(setor);
    if (corrigido.length < SETOR_MIN) {
      problemas.push({ campo: 'setor', mensagem: `O setor precisa de ${SETOR_MIN} a ${SETOR_MAX} letras ou números.`, sugestao: null });
    } else if (corrigido !== setor) {
      problemas.push({ campo: 'setor', mensagem: `Use maiúsculas, sem acento nem espaço, até ${SETOR_MAX} caracteres.`, sugestao: corrigido });
    }
  }

  // Tipo
  if (!tipos.some((t) => t.id === eq.tipo)) {
    const reconhecido = resolverTipo(eq.tipo, tipos);
    const parecido = reconhecido ? tipos.find((t) => t.id === reconhecido) : tipoMaisParecido(eq.tipo, tipos);
    const lista = tipos.map((t) => t.nome).join(', ');
    problemas.push({
      campo: 'tipo',
      mensagem: eq.tipo ? `Tipo "${eq.tipo}" não está na biblioteca. Tipos aceitos: ${lista}.` : `Escolha o tipo. Tipos aceitos: ${lista}.`,
      sugestao: parecido ? parecido.id : null,
    });
  }

  // Descrição
  if (!String(eq.descricao ?? '').trim()) {
    problemas.push({ campo: 'descricao', mensagem: 'Descreva o equipamento (ex.: Motor do exaustor 1).', sugestao: null });
  }

  // Número
  const numero = Number(eq.numero);
  const sugestaoNumero = () => proximoNumero(todos, eq.setor, eq.tipo, eq.id);
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
    problemas.push({
      campo: 'numero',
      mensagem: sugestaoNumero() === null ? 'Os números de 1 a 999 deste setor e tipo estão ocupados. Revise a lista ou escolha outro setor.' : 'O número deve ser inteiro, de 1 a 999.',
      sugestao: sugestaoNumero(),
    });
  } else if (eq.tag && todos.some((o) => o.id !== eq.id && o.tag === eq.tag)) {
    // TAG repetida
    problemas.push({
      campo: 'numero',
      mensagem: `A TAG ${eq.tag} já existe em outro equipamento.${sugestaoNumero() === null ? ' Todos os números deste setor e tipo estão ocupados.' : ''}`,
      sugestao: sugestaoNumero(),
    });
  }

  return problemas;
}

/** Valida a lista inteira. Retorna um mapa id -> problemas (só equipamentos com problema). */
export function validarLista(equipamentos, tipos) {
  const mapa = Object.create(null);
  for (const eq of equipamentos) {
    const p = validarEquipamento(eq, tipos, equipamentos);
    if (p.length) mapa[eq.id] = p;
  }
  return mapa;
}
