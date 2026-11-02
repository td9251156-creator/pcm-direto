// Capacidades atuais: descrição editorial, sem gerar documentos ou alterar a base por abrir um link.
export const APLICACAO_MODELOS = {
  '002': { rota: 'planejar', acao: 'Conferir meu planejamento', texto: 'No app, configure ativos, avalie a criticidade e revise o plano. A MFMEA continua sendo analisada e preenchida pela equipe.' },
  '004': { rota: 'executar', acao: 'Acompanhar a execução', texto: 'Registre a execução no app. Em Documentos, o PCM-MAN-004 reúne o histórico disponível e as OS importadas; a ficha individual da OS continua sendo preenchida pela equipe.' },
  '008': { rota: 'falhas', acao: 'Registrar uma falha', texto: 'Registre as falhas no app e emita os dados disponíveis em Documentos. A equipe continua definindo as categorias e a análise do Pareto.' },
  '011': { rota: 'mensal', acao: 'Abrir o Mensal', texto: 'Em Mensal, escolha um ativo e um mês encerrado, informe as horas planejadas no mês (HP) e confira os indicadores antes de gerar o PCM-MAN-011.' },
};
export function aplicacaoModelo(modelo) {
  if (APLICACAO_MODELOS[modelo.codigo.slice(-3)]) return APLICACAO_MODELOS[modelo.codigo.slice(-3)];
  if (modelo.formato === 'Word') return { rota: 'entrega', acao: 'Ver Documentos no app', texto: 'O app preenche a identificação disponível no documento Word. O conteúdo técnico e a revisão do texto continuam sendo feitos pela equipe.' };
  if (modelo.codigo === 'PCM-MAN-001') return { rota: 'entrega', acao: 'Ver Documentos no app', texto: 'O app reúne documentos e emissões disponíveis no controle documental. Situação, validade e aprovação dos documentos continuam sendo conferidas pela equipe.' };
  return { rota: 'entrega', acao: 'Ver Documentos no app', texto: 'Em Documentos, o app pode preencher os cadastros disponíveis para as listas do arquivo. Isso não preenche todo o controle: registros, análises e conteúdo específico continuam com a equipe.' };
}
