import { modeloCorrespondeBusca } from './busca-modelos.js';

export const CAMINHOS_COMUNIDADE = [
  { id: 'semana', titulo: 'Organizar a semana', modelos: ['003', '002', '004'] },
  { id: 'os', titulo: 'Controlar OS', modelos: ['004', '003', '006'] },
  { id: 'falhas', titulo: 'Entender falhas', modelos: ['008', '009', '011'] },
  { id: 'plano', titulo: 'Começar um plano preventivo', modelos: ['002', '005', '016'] },
];

export function modelosDoCaminho(modelos, { caminho = 'os', todos = false, busca = '' } = {}) {
  const selecionado = CAMINHOS_COMUNIDADE.find(c => c.id === caminho) ?? CAMINHOS_COMUNIDADE[1];
  if (todos || busca.trim()) return modelos.filter(m => modeloCorrespondeBusca(m, busca));
  return selecionado.modelos.map(codigo => modelos.find(m => m.codigo === `PCM-MAN-${codigo}`)).filter(Boolean);
}

export function acessoAoPcm(estado, demonstracao = false) {
  if (demonstracao) return { rota: 'semana', titulo: 'Continuar o exemplo', exemplo: true };
  if (estado.programacao.revisoes.length) return { rota: 'semana', titulo: 'Continuar minha semana' };
  if (estado.equipamentos.length || estado.gestao.organizacao.nome.trim() || estado.metadados.passo > 1) return { rota: 'assistente', titulo: 'Continuar configuração' };
  return { rota: 'assistente', titulo: 'Começar meu PCM', novo: true };
}
