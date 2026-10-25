# Aplicação da referência mobile e desktop

Fonte: arquivo do mantenedor “PCM Direto App mobile.zip”, recebido em 24/10/2026.
Os HTMLs são referências; support.js e a base fictícia do protótipo não foram incorporados.

## Implementado nesta rodada

- Uma interface responsiva, com barra inferior de cinco acessos até 1023 px e menu lateral no computador.
- Comunidade preservada como abertura. Planejar, Documentos, biblioteca, dados e comunidade acessíveis em Mais.
- Marca horizontal, slogan legível, cores, espaçamentos, cartões e alvos de toque da referência.
- Visão geral com anel acompanhado de percentual textual, vencidas clicáveis e prioridades antes da carga.
- Executar com períodos, chips de especialidade/contagem, agrupamento diário, filtros adicionais e histórico expansível.
- Painel modal nativo de execução: folha inferior no celular, gaveta lateral no computador, datas rápidas,
  data local, responsável, observação da tarefa da revisão e proteção contra toque repetido.
- Consulta de ativos com busca, setores, criticidade pendente explícita, ficha, ocorrências,
  falhas e tarefas da revisão vigente (rascunho identificado quando não há revisão).
- Abrir falha com ativo selecionado; histórico em cartões no celular e formulário ao lado no computador.
- Backup em duas colunas no computador, sem alterar restauração ou formato armazenado.

## Decisões preservadas

Dados privados no IndexedDB existente; nenhum armazenamento ou migração do protótipo.
Cancelar mantém histórico. Não incorporar o “Desfazer” destrutivo do protótipo.
Campos opcionais de falha mantêm vazio/null; peça e precisão de parada existentes preservadas.
Datas e impacto das revisões calculados pelo código real, sem números fixos.
Tarefas e PDFs não foram modificados. Edição e importação continuam em Cadastro de equipamentos.

## Limites e continuidade

A referência foi adaptada aos fluxos existentes. Confirmações destrutivas continuam nativas;
não há novo comando Desfazer. Biblioteca continua editável, sem substituir os campos por tabela de consulta.
A lista Concluídas mantém a ordenação por previsão; a data realizada permanece no histórico.
A barra inferior reserva comunidade em Mais para manter cinco acessos da rotina.
Validação em aparelho físico, leitor de tela e documentos em Office continua pendente.

## Evidências desta rodada

205 testes de lógica/infraestrutura, lint, build e roteiro completo no Chromium aprovados.
Novos cenários: expansão pelo teclado, painel/data rápida/Escape/retorno de foco, registro e
cancelamento preservado, resposta atrasada após troca de tela, busca de ativos, falha com ativo
preenchido e layouts de celular/computador. Revisão independente reproduziu e confirmou correções
de foco e de alteração de filtros durante uma gravação. Dados e contas reais não foram usados.
