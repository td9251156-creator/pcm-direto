// Orientações de uso; não acrescentam regras de manutenção aos modelos.
export const GUIAS_MODELOS={
  'PCMD-01':{quando:'Para saber quais documentos estão em uso e quem responde por eles.',comecar:'Confira a organização e preencha a lista mestra, os responsáveis e as revisões.'},
  'PCMD-02':{quando:'Para organizar o inventário e avaliar a importância de cada equipamento.',comecar:'Confira TAG, descrição e setor. Preencha os critérios de criticidade com o responsável.'},
  'PCMD-03-04':{quando:'Para consultar tarefas preventivas e distribuir o trabalho ao longo do ano.',comecar:'Confira tarefas, frequências, responsáveis e datas antes de usar o cronograma.'},
  'PCMD-05':{quando:'Quando ocorrer uma falha e você precisar registrar o que aconteceu.',comecar:'Identifique o equipamento, descreva o sintoma e registre a ação e a parada.'},
  'PCMD-06':{quando:'Para acompanhar peças importantes e decidir o que precisa de reposição.',comecar:'Cadastre a peça, o equipamento atendido, o saldo e os critérios de reposição.'},
  'PCMD-07':{quando:'Para reunir os resultados do mês e registrar a análise da manutenção.',comecar:'Confira as definições dos indicadores na planilha antes de informar os dados do mês.'},
  'PCMD-08':{quando:'Para acompanhar a solução de um problema e verificar se a ação funcionou.',comecar:'Descreva o problema, defina ação, responsável e prazo e registre a verificação de eficácia.'},
  'PCMD-K01':{quando:'Para controlar ativos e preventivas diretamente em uma planilha separada.',comecar:'Cadastre ativos e tarefas. Escolha o aplicativo ou esta planilha como controle do mesmo registro.'},
  'PCMD-K02':{quando:'Para abrir uma ordem de serviço e acompanhar o atendimento até a conclusão.',comecar:'Informe equipamento, solicitação, prioridade e responsável; complete o encerramento após o serviço.'},
  'PCMD-K03':{quando:'Para seguir um roteiro de verificação diário, semanal ou mensal.',comecar:'Adapte os itens ao equipamento e registre a verificação e as anomalias encontradas.'},
  'PCMD-K04':{quando:'Para controlar materiais, entradas e saídas do almoxarifado.',comecar:'Cadastre os materiais e o saldo inicial. Registre cada movimentação e confira as sugestões de compra.'},
  'PCMD-K05':{quando:'Para acompanhar uma compra desde o pedido até o recebimento.',comecar:'Informe item, quantidade, fornecedor, valor e prazo; atualize o recebimento.'},
  'PCMD-K06':{quando:'Para analisar os resultados de manutenção de um equipamento específico.',comecar:'Confira as definições e registre corretivas e dados de produção antes de analisar os indicadores.'},
  'PCMD-K07':{quando:'Para transformar uma melhoria em ações com responsáveis e prazos.',comecar:'Descreva o que fazer, por quê, onde, quando, quem, como e o custo; acompanhe o avanço.'},
  'PCMD-K08':{quando:'Para localizar evidências de calibração, treinamento e outros requisitos.',comecar:'Liste os registros, os responsáveis, os prazos e onde encontrar cada evidência.'},
  'PCMD-K09':{quando:'Para reunir os controles de manutenção em um único arquivo de trabalho.',comecar:'Comece pelos cadastros e escolha este arquivo ou os controles separados; eles não sincronizam entre si.'},
  'PCMD-W1':{quando:'Para documentar como a organização gerencia os ativos e distribui responsabilidades.',comecar:'Confira os cadastros inseridos e complete critérios, responsabilidades e decisões com o responsável.'},
  'PCMD-W2':{quando:'Para registrar como as estratégias de manutenção são escolhidas e revisadas.',comecar:'Confira as tarefas inseridas e complete as estratégias, os critérios e a aprovação com o responsável.'},
};

export const guiaModelo=codigo=>GUIAS_MODELOS[codigo.replace('/','-')];
