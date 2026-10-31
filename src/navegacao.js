// Uma subtela mantém destacado o acesso que leva ao seu grupo.
const grupos = {
  equipamentos: 'planejar', cadastros: 'planejar', criticidade: 'planejar',
  revisao: 'planejar', plano: 'planejar', mensal: 'planejar', impressao: 'planejar',
  execucao: 'executar', modelos: 'entrega', 'entrega-modelos': 'entrega',
  catalogo: 'comunidade', inicio: 'mais', dashboards: 'mais', 'importar-operacao': 'dados', assistente: 'mais', apoio: 'mais',
};
const diretas = ['comunidade','semana','executar','ativos','falhas','planejar','biblioteca','entrega','dados','mais'];

export function acessoAtual(tela, mobile) {
  const acesso = diretas.includes(tela) ? tela : grupos[tela] || 'comunidade';
  return mobile && !['semana','executar','ativos','falhas'].includes(acesso) ? 'mais' : acesso;
}
