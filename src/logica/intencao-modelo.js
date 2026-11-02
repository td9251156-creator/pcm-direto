import { MODELOS_V2 } from '../dados/modelos-v2.js';
import { aplicacaoModelo } from '../dados/aplicacao-modelos.js';
export function lerIntencaoModelo(busca) {
  const codigo = new URLSearchParams(busca).get('modelo')?.toUpperCase();
  return MODELOS_V2.find(m => m.codigo === codigo) ?? null;
}
export function destinoDoModelo(modelo, estado) {
  const aplicacao = aplicacaoModelo(modelo);
  return estado.programacao.revisoes.length ? aplicacao : {
    ...aplicacao, rota: 'assistente', acao: estado.equipamentos.length || estado.gestao.organizacao.nome.trim() || estado.metadados.passo > 1 ? 'Continuar configuração' : 'Começar meu PCM',
  };
}
