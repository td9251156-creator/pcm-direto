# Melhorias do PCM Direto

Diagnóstico de 20/10/2026, a partir da revisão `18e06e1`. Ordem de trabalho: erros e riscos,
qualidade, funções novas e melhorias de uso. Um assunto por pull request (PR); o mantenedor
revisa antes de publicar. Itens ainda não implementados não são promessas de entrega.

## Verificação inicial

- Leitura de README, decisões, roteiro, biblioteca, contribuição, segurança, código e testes.
- Base: 54 testes em 7 arquivos, lint e geração da versão final aprovados.
- `npm audit`: nenhum alerta informado pelo serviço em 20/10/2026; não substitui revisão do código.
- O app roda com Node.js 24 e sem serviço externo. O cache do npm neste ambiente deve ficar
  em `/workspace/.npm-cache`: `npm ci --cache /workspace/.npm-cache`.
- Esta rodada inclui conferência da importação no Chromium em tela de 390 × 844 pixels.
  Ainda falta avaliação com leitor de tela, aparelhos reais e Excel antigo.

## Erros e riscos — executar primeiro, nesta ordem

| Ordem | Problema e evidência | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 01 | Importar JSON válido, mas com estrutura errada, causa erro ao procurar tipos ou tarefas. Durações em texto e códigos de tipo repetidos também eram aceitos. | A importação para sem explicar o problema; dados incorretos podem afetar o plano. | Pequeno | Médio: arquivos fora do formato passam a ser recusados; preservar arquivos válidos e travas de segurança. | Implementado neste ramo; PR pendente de abertura. |
| 02 | Ao reabrir o app, `carregar()` verifica apenas se existem listas no arquivo salvo. Não repete a validação completa da biblioteca nem do rascunho. | Dados locais incompletos podem impedir a abertura ou afetar o plano. | Médio | Alto: proteger a lista existente, sem apagar ou substituir dados silenciosamente. | Implementado; [abrir revisão](https://github.com/td9251156-creator/pcm-direto/compare/correcao%2Fvalidar-importacao-biblioteca...correcao%2Fproteger-rascunho-local?expand=1). |
| 03 | `montarDados()` recebe todos os equipamentos, embora Revisão e Impressão digam que os que têm pendência ficaram fora. Um motor sem descrição ainda gera 8 tarefas no resumo. | Carga e impressão podem incluir equipamentos que a tela afirma ter excluído. | Pequeno | Médio: definir e aplicar a mesma lista válida em resumo, impressão e arquivos. | Implementado; [abrir revisão](https://github.com/td9251156-creator/pcm-direto/compare/correcao%2Fproteger-rascunho-local...correcao%2Fexcluir-pendencias-do-plano?expand=1). |
| 04 | Na ativação, o service worker remove todos os caches de mesma origem que não sejam o atual. | Pode apagar o funcionamento offline de outro aplicativo no mesmo domínio. | Pequeno | Médio: apagar só caches pertencentes ao PCM Direto e testar atualização. | Implementado; [abrir revisão](https://github.com/td9251156-creator/pcm-direto/compare/correcao%2Fexcluir-pendencias-do-plano...correcao%2Fisolar-cache-offline?expand=1). |
| 05 | A versão do cache usa nomes dos arquivos, sem o conteúdo dos arquivos fixos de `public/`. | Uma alteração só no manifesto ou ícone pode não chegar a quem usa offline. | Médio | Médio: testar publicação nova, troca de versão e abertura sem conexão. | Implementado; [abrir revisão](https://github.com/td9251156-creator/pcm-direto/compare/correcao%2Fisolar-cache-offline...correcao%2Fatualizar-versao-cache?expand=1). |
| 06 | CSV com quebra de linha dentro de uma descrição exportada volta como dois equipamentos na importação. | A lista muda ao exportar e importar novamente. | Pequeno | Médio: manter separadores, aspas, acentos e cabeçalhos já aceitos. | Implementado; [abrir revisão](https://github.com/td9251156-creator/pcm-direto/compare/correcao%2Fatualizar-versao-cache...correcao%2Fpreservar-linhas-csv?expand=1). |
| 07 | Quando já existe número 999 no setor/tipo, a correção sugerida pode ser 1000, fora do limite aceito. | O botão de correção não resolve a pendência. | Pequeno | Baixo: procurar número livre e explicar quando os 999 estiverem ocupados. | Implementado; [abrir revisão](https://github.com/td9251156-creator/pcm-direto/compare/correcao%2Fpreservar-linhas-csv...correcao%2Flimitar-numeracao-tags?expand=1). |
| 08 | `lerXlsx()` aceita linhas da primeira aba não vazia mesmo sem identificar uma tabela de equipamentos. | Uma capa de planilha pode virar equipamento em vez da aba correta. | Médio | Médio: preservar importação sem cabeçalho quando ela for intencional. | Pendente. |
| 09 | Falha ao gravar no navegador retorna `false`, mas as telas em geral continuam anunciando que os dados foram salvos. | A pessoa pode fechar o app acreditando que a lista está guardada. | Médio | Médio: mensagens claras e possibilidade de guardar cópia sem apagar o rascunho. | Pendente. |

## Qualidade — depois dos erros e riscos

| Ordem | Problema | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 10 | Faltam testes de carregar/salvar, falha de armazenamento e compatibilidade com rascunhos antigos. | Menos proteção contra perda de listas em atualizações. | Médio | Baixo: usar exemplos fictícios e armazenamento simulado. | Pendente. |
| 11 | Não há testes de troca de versão e funcionamento offline do PWA. | Falhas podem aparecer só depois de publicar. | Médio | Médio: testar caches e atualização sem mudar a biblioteca técnica. | Pendente. |
| 12 | Os testes atuais concentram-se na lógica; faltam verificações das telas por teclado e em celular. | Botões, foco e mensagens podem falhar mesmo com os testes atuais aprovados. | Médio | Baixo: começar com fluxos principais; avaliar ferramenta antes de adicionar dependência. | Pendente. |

## Funções novas — respeitar o roteiro

| Ordem | Proposta e problema atendido | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 13 | Etapa 2: checklist de execução por tarefa, começando por marcação e anotação de evidência fictícia, sem dados pessoais adicionais. | Registrar o que foi executado, além do planejamento. | Grande | Alto: definir armazenamento e limites; assinatura e fotos de pessoas exigem decisão do mantenedor diante da regra sobre dados pessoais. | Pendente de desenho e decisão sobre evidências. |
| 14 | Etapa 4: registro de falhas e indicadores MTBF, MTTR e disponibilidade. | Acompanhar o histórico de manutenção. | Grande | Alto: validar com o mantenedor definições de tempo de operação, parada e período antes de calcular. | Pendente. |
| 15 | Etapa 5: paradas programadas e agrupamento de tarefas por janela. | Preparar serviços em períodos disponíveis. | Grande | Alto: não adiar tarefas de segurança; confirmar regras de janela com o mantenedor. | Pendente. |

A Etapa 3 (normas) permanece fora desta rodada: somente com fonte oficial, versão, data e revisão
por profissional habilitado. Não ampliar tarefas técnicas ou periodicidades sem revisar origem e versão.

## Experiência de uso — após as prioridades acima

| Ordem | Proposta e problema atendido | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 16 | Backup e restauração da lista completa, ajustes e biblioteca em JSON; CSV não guarda tudo. | Levar o trabalho a outro aparelho e recuperar uma cópia. | Médio | Alto: validar antes de substituir; manter compatibilidade e confirmar a troca. | Pendente. |
| 17 | Desfazer a última remoção de equipamento. A confirmação já existe. | Recuperar um clique errado sem recadastrar os dados. | Médio | Médio: recuperar também os ajustes daquela máquina. | Pendente. |
| 18 | Filtros por setor/especialidade e instruções mais claras sobre semanas acima da capacidade. | Encontrar tarefas e entender limites sem precisar conhecer o sistema. | Médio | Médio: deixar claro o que está filtrado e não ocultar alertas de segurança. | Pendente. |

## Rodada 1 — importação de biblioteca

- Arquivos com estrutura incorreta são recusados com mensagem, antes de substituir a biblioteca atual.
- Códigos de tipos não podem repetir; códigos seguem o formato documentado.
- Descrição, especialidade, origem e versão exigem texto; duração exige número positivo e finito.
- Tipos novos sem tarefas e observação omitida continuam aceitos. As travas de segurança continuam ativas.
- O rascunho, as chaves de armazenamento, as periodicidades e as tarefas padrão não mudam.
- Validação final: `npm ci`, lint, 82 testes em 7 arquivos e build aprovados. Importação conferida
  no Chromium em 390 × 844: recusas sem erro de JavaScript e biblioteca válida mantida após recarregar.
- Ramo enviado: `correcao/validar-importacao-biblioteca`; a `main` não foi alterada.
- PR ainda não aberto: a API do GitHub recusou acesso neste ambiente.
  [Abrir o PR deste ramo](https://github.com/td9251156-creator/pcm-direto/pull/new/correcao/validar-importacao-biblioteca).
- Próximo trabalho: item 02, em outro PR, com testes de compatibilidade e preservação dos dados locais.
