# Guias para revisão técnica do mantenedor

Os textos abaixo foram incluídos na prévia como orientações editoriais, após conferência com o catálogo, os arquivos e as capacidades atuais do app. Isso não equivale à revisão técnica humana; use este documento para registrar ajustes sem precisar ler código.

Fonte: `src/dados/guias-portal.js`. Para regenerar: `node scripts/preparar-revisao-guias.mjs`.

Confira se a orientação é adequada ao público, se o exemplo é claro e se há alguma afirmação técnica a corrigir. Registre ajustes por código: 003, 008 e 002. Não é necessário revisar código JavaScript.

## PCM-MAN-003 — Como organizar a semana de manutenção

**Situação:** orientação editorial incluída na prévia; conferência humana pendente. **Arquivo:** Excel, R00.

[Abrir o modelo e sua orientação já publicada](https://pcmdireto.me/modelos/pcm-man-003/)

**Limite atual do app:** Em Documentos, o app pode preencher os cadastros disponíveis para as listas do arquivo. Isso não preenche todo o controle: registros, análises e conteúdo específico continuam com a equipe.

Reúna pendências, combine responsáveis e acompanhe o realizado em uma semana de cada vez.

### Reúna o trabalho que precisa ser acompanhado

Escolha a semana de referência e reúna as atividades já definidas pela equipe. Separe o que está planejado do que ainda depende de decisão.

Use os mesmos identificadores de ativos dos demais registros.

### Confira a possibilidade de execução

Converse com os responsáveis sobre disponibilidade, materiais e pendências. O planner organiza o trabalho, mas não confirma sozinho que uma atividade está pronta para ser executada.

Registre o combinado e deixe as pendências visíveis.

### Feche a semana e leve as pendências adiante

Compare o que estava combinado com o que foi realizado. Não transforme uma atividade não registrada em uma conclusão presumida.

No app, a Visão geral acompanha o previsto e o realizado da revisão; o PCM-MAN-003 recebe os cadastros disponíveis, e o preenchimento específico do planner continua com a equipe.

### Exemplo fictício

A Oficina Exemplo combina dois serviços já definidos para uma semana. Ao final, registra que um foi concluído e que o outro continua aguardando material, com o próximo acompanhamento identificado.

**Conferência humana:** pendente. Registrar ajustes observados na aplicação, sem tratar os testes automáticos como aprovação técnica.

## PCM-MAN-008 — Como registrar falhas e começar a analisar o Pareto

**Situação:** orientação editorial incluída na prévia; conferência humana pendente. **Arquivo:** Excel, R00.

[Abrir o modelo e sua orientação já publicada](https://pcmdireto.me/modelos/pcm-man-008/)

**Limite atual do app:** Registre as falhas no app e emita os dados disponíveis em Documentos. A equipe continua definindo as categorias e a análise do Pareto.

Registre ocorrências consistentes antes de comparar categorias de falha.

### Comece pelo registro da ocorrência

Identifique o ativo e descreva o que aconteceu. Informe datas e horários conhecidos e diferencie a falha observada de uma causa ainda em análise.

Um campo vazio representa informação não registrada; não o trate automaticamente como duração zero.

### Padronize as categorias com a equipe

Combine como as categorias serão escritas e usadas. Diferenças de digitação podem separar ocorrências que a equipe gostaria de analisar juntas.

Confira o conjunto de registros antes de interpretar o gráfico. O Pareto depende dos dados e das categorias escolhidas.

### Use o resultado para orientar perguntas

Observe quais categorias concentram os registros e investigue seu contexto. Frequência de registro não equivale, sozinha, à criticidade de um ativo ou à causa de um problema.

No app, Falhas registra ocorrências e Documentos emite os dados disponíveis no PCM-MAN-008. As categorias e a análise do Pareto continuam com a equipe.

### Exemplo fictício

Na Oficina Exemplo, três descrições de falha recebem a mesma categoria combinada. A equipe confere os registros antes de comparar essa categoria com as demais.

**Conferência humana:** pendente. Registrar ajustes observados na aplicação, sem tratar os testes automáticos como aprovação técnica.

## PCM-MAN-002 — Como começar um plano preventivo com poucos ativos

**Situação:** orientação editorial incluída na prévia; conferência humana pendente. **Arquivo:** Excel, R00.

[Abrir o modelo e sua orientação já publicada](https://pcmdireto.me/modelos/pcm-man-002/)

**Limite atual do app:** No app, configure ativos, avalie a criticidade e revise o plano. A MFMEA continua sendo analisada e preenchida pela equipe.

Organize o cadastro, revise as tarefas e confira o planejamento antes de ampliar o plano.

### Escolha poucos ativos para começar

Confira a identificação e o cadastro dos equipamentos que a equipe conhece. Começar com uma lista pequena facilita perceber cadastros incompletos.

Avalie a criticidade com a equipe e registre as informações que ainda precisam de conferência.

### Revise o conteúdo antes de planejar

Confira as tarefas aplicáveis a cada equipamento, seus responsáveis e as informações necessárias ao planejamento. O arquivo organiza as decisões; não as toma pela equipe.

A análise MFMEA continua sendo um trabalho da equipe. Não a considere pronta apenas porque o cadastro e o cronograma foram preenchidos.

### Confira a distribuição e acompanhe o realizado

Observe a distribuição do trabalho e a disponibilidade antes de colocar a revisão em uso. Depois acompanhe a execução e registre os problemas encontrados.

No app, configure os ativos, avalie a criticidade e confira a prévia antes de ativar uma revisão. Em Documentos, o PCM-MAN-002 usa a revisão ativa, sem gerar arquivos apenas por abrir o material.

### Exemplo fictício

A Oficina Exemplo começa com um motor de bancada. A equipe confere o cadastro, discute sua criticidade e revisa o planejamento antes de acrescentar os outros equipamentos.

**Conferência humana:** pendente. Registrar ajustes observados na aplicação, sem tratar os testes automáticos como aprovação técnica.
