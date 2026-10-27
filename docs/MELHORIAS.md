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
| 01 | Importar JSON válido, mas com estrutura errada, causa erro ao procurar tipos ou tarefas. Durações em texto e códigos de tipo repetidos também eram aceitos. | A importação para sem explicar o problema; dados incorretos podem afetar o plano. | Pequeno | Médio: arquivos fora do formato passam a ser recusados; preservar arquivos válidos e travas de segurança. | Implementado; [PR #1](https://github.com/td9251156-creator/pcm-direto/pull/1), integrado à main. |
| 02 | Ao reabrir o app, `carregar()` verifica apenas se existem listas no arquivo salvo. Não repete a validação completa da biblioteca nem do rascunho. | Dados locais incompletos podem impedir a abertura ou afetar o plano. | Médio | Alto: proteger a lista existente, sem apagar ou substituir dados silenciosamente. | Implementado; [PR #2](https://github.com/td9251156-creator/pcm-direto/pull/2), integrado à main. |
| 03 | `montarDados()` recebe todos os equipamentos, embora Revisão e Impressão digam que os que têm pendência ficaram fora. Um motor sem descrição ainda gera 8 tarefas no resumo. | Carga e impressão podem incluir equipamentos que a tela afirma ter excluído. | Pequeno | Médio: definir e aplicar a mesma lista válida em resumo, impressão e arquivos. | Implementado; [PR #3](https://github.com/td9251156-creator/pcm-direto/pull/3), integrado à main. |
| 04 | Na ativação, o service worker remove todos os caches de mesma origem que não sejam o atual. | Pode apagar o funcionamento offline de outro aplicativo no mesmo domínio. | Pequeno | Médio: apagar só caches pertencentes ao PCM Direto e testar atualização. | Implementado; [PR #4](https://github.com/td9251156-creator/pcm-direto/pull/4), integrado à main. |
| 05 | A versão do cache usa nomes dos arquivos, sem o conteúdo dos arquivos fixos de `public/`. | Uma alteração só no manifesto ou ícone pode não chegar a quem usa offline. | Médio | Médio: testar publicação nova, troca de versão e abertura sem conexão. | Implementado; [PR #5](https://github.com/td9251156-creator/pcm-direto/pull/5), integrado à main. |
| 06 | CSV com quebra de linha dentro de uma descrição exportada volta como dois equipamentos na importação. | A lista muda ao exportar e importar novamente. | Pequeno | Médio: manter separadores, aspas, acentos e cabeçalhos já aceitos. | Implementado; [PR #6](https://github.com/td9251156-creator/pcm-direto/pull/6), integrado à main. |
| 07 | Quando já existe número 999 no setor/tipo, a correção sugerida pode ser 1000, fora do limite aceito. | O botão de correção não resolve a pendência. | Pequeno | Baixo: procurar número livre e explicar quando os 999 estiverem ocupados. | Implementado; [PR #7](https://github.com/td9251156-creator/pcm-direto/pull/7), integrado à main. |
| 08 | `lerXlsx()` aceita linhas da primeira aba não vazia mesmo sem identificar uma tabela de equipamentos. | Uma capa de planilha pode virar equipamento em vez da aba correta. | Médio | Médio: preservar importação sem cabeçalho quando ela for intencional. | Implementado; [PR #8](https://github.com/td9251156-creator/pcm-direto/pull/8), integrado à main. |
| 09 | Falha ao gravar no navegador retorna `false`, mas as telas em geral continuam anunciando que os dados foram salvos. | A pessoa pode fechar o app acreditando que a lista está guardada. | Médio | Médio: mensagens claras e possibilidade de guardar cópia sem apagar o rascunho. | Implementado; [PR #9](https://github.com/td9251156-creator/pcm-direto/pull/9), integrado à main. |

## Qualidade — depois dos erros e riscos

| Ordem | Problema | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 10 | Faltam testes de carregar/salvar, falha de armazenamento e compatibilidade com rascunhos antigos. | Menos proteção contra perda de listas em atualizações. | Médio | Baixo: usar exemplos fictícios e armazenamento simulado. | Implementado; [PR #10](https://github.com/td9251156-creator/pcm-direto/pull/10), integrado à main. |
| 11 | Não há testes de troca de versão e funcionamento offline do PWA. | Falhas podem aparecer só depois de publicar. | Médio | Médio: testar caches e atualização sem mudar a biblioteca técnica. | Implementado; [PR #11](https://github.com/td9251156-creator/pcm-direto/pull/11), integrado à main. |
| 12 | Os testes atuais concentram-se na lógica; faltam verificações das telas por teclado e em celular. | Botões, foco e mensagens podem falhar mesmo com os testes atuais aprovados. | Médio | Baixo: começar com fluxos principais; avaliar ferramenta antes de adicionar dependência. | Implementado; [PR #12](https://github.com/td9251156-creator/pcm-direto/pull/12), integrado à main. |

## Funções novas — respeitar o roteiro

| Ordem | Proposta e problema atendido | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 13 | Etapa 2: checklist de execução por tarefa, começando por marcação e anotação de evidência fictícia, sem dados pessoais adicionais. | Registrar o que foi executado, além do planejamento. | Grande | Alto: definir armazenamento e limites; assinatura e fotos de pessoas exigem decisão do mantenedor diante da regra sobre dados pessoais. | Implementado; [PR #13](https://github.com/td9251156-creator/pcm-direto/pull/13), integrado à main. |
| 14 | Etapa 4: registro de falhas e indicadores MTBF, MTTR e disponibilidade. | Acompanhar o histórico de manutenção. | Grande | Alto: validar com o mantenedor definições de tempo de operação, parada e período antes de calcular. | Aguardando definição técnica do mantenedor, conforme o escopo combinado. |
| 15 | Etapa 5: paradas programadas e agrupamento de tarefas por janela. | Preparar serviços em períodos disponíveis. | Grande | Alto: não adiar tarefas de segurança; confirmar regras de janela com o mantenedor. | Aguardando definição técnica do mantenedor, conforme o escopo combinado. |

A Etapa 3 (normas) permanece fora desta rodada: somente com fonte oficial, versão, data e revisão
por profissional habilitado. Não ampliar tarefas técnicas ou periodicidades sem revisar origem e versão.

## Experiência de uso — após as prioridades acima

| Ordem | Proposta e problema atendido | Impacto para quem usa | Esforço | Risco da mudança | Situação |
|---|---|---|---|---|---|
| 16 | Backup e restauração da lista completa, ajustes e biblioteca em JSON; CSV não guarda tudo. | Levar o trabalho a outro aparelho e recuperar uma cópia. | Médio | Alto: validar antes de substituir; manter compatibilidade e confirmar a troca. | Implementado; [PR #14](https://github.com/td9251156-creator/pcm-direto/pull/14), integrado à main. |
| 17 | Desfazer a última remoção de equipamento. A confirmação já existe. | Recuperar um clique errado sem recadastrar os dados. | Médio | Médio: recuperar também os ajustes daquela máquina. | Implementado; [PR #15](https://github.com/td9251156-creator/pcm-direto/pull/15), integrado à main. |
| 18 | Filtros por setor/especialidade e instruções mais claras sobre semanas acima da capacidade. | Encontrar tarefas e entender limites sem precisar conhecer o sistema. | Médio | Médio: deixar claro o que está filtrado e não ocultar alertas de segurança. | Implementado; [PR #16](https://github.com/td9251156-creator/pcm-direto/pull/16), integrado à main. |

## Rodada 1 — importação de biblioteca

- Arquivos com estrutura incorreta são recusados com mensagem, antes de substituir a biblioteca atual.
- Códigos de tipos não podem repetir; códigos seguem o formato documentado.
- Descrição, especialidade, origem e versão exigem texto; duração exige número positivo e finito.
- Tipos novos sem tarefas e observação omitida continuam aceitos. As travas de segurança continuam ativas.
- O rascunho, as chaves de armazenamento, as periodicidades e as tarefas padrão não mudam.
- Validação final: `npm ci`, lint, 82 testes em 7 arquivos e build aprovados. Importação conferida
  no Chromium em 390 × 844: recusas sem erro de JavaScript e biblioteca válida mantida após recarregar.
- Ramo enviado: `correcao/validar-importacao-biblioteca`; a `main` não foi alterada.
- Revisão aberta: [PR #1](https://github.com/td9251156-creator/pcm-direto/pull/1).
- O item 02 e os demais itens concluídos nesta rodada estão relacionados abaixo e em [REVISOES.md](REVISOES.md).

## Rodada 2 — correções, proteção de dados e checklist

- Itens 02 a 12, primeira versão do item 13 e itens 16 a 18 implementados em ramos separados.
- Itens 14 e 15 ficam para definição das regras de indicadores e janelas pelo mantenedor. Não houve
  mudança normativa ou alteração de periodicidades técnicas. Fotos e assinaturas não foram incluídas.
- Verificação final: instalação, lint, 133 testes em 12 arquivos e build aprovados.
- Conferência no Chromium: tela de celular, teclado, importação, checklist após recarregar, backup
  e restauração, desfazer remoção, filtros, aviso de gravação, recuperação e geração offline de XLSX/DOCX.
- Os 16 PRs foram integrados à main por solicitação do mantenedor. A publicação é executada pelo fluxo do GitHub Pages.
- Leitor de tela, aparelhos reais e Excel antigo ainda precisam de conferência manual.

## Interface sem criação de templates — 21/10/2026

A nova direção do mantenedor prioriza telas funcionais e reserva a criação dos modelos para ele.
Cadastros M1–M6, criticidade, responsáveis por tarefa, mensal, histórico completo e falhas foram
acrescentados sem alterar os geradores atuais nem acrescentar dependências. O guia
[INTERFACE-E-MODELOS.md](INTERFACE-E-MODELOS.md) descreve os documentos a fornecer depois.

Backup versão 2 inclui a gestão; versão 1 e rascunhos antigos continuam aceitos. Migração preserva
marcações antigas sem vínculo presumido. Registros cancelados não ressuscitam ao remover/desfazer
ou reabrir; descrições antigas extensas continuam válidas. Cadastros preservam os rascunhos dos
outros formulários ao salvar um deles. A revisão encontrou esses cenários e foram acrescentadas
regressões relevantes. Lint, 168 testes, build e Chromium aprovados, inclusive backup/restauração,
fluxos novos, celular/teclado e downloads antigos offline. Revisão independente sem bloqueadores.
Sem merge, publicação ou consumo de API. Nenhum novo template Excel/Word criado nesta entrega.


### Integração da marca final e 18 modelos — 26/10/2026

Integração autorizada pelo mantenedor à main atual, preservando Gestão, comunidade, persistência v3, revisões, execuções, falhas e os seis documentos de gestão. Manual final e fontes locais aplicados; banco adicional de 18 modelos em pasta própria, com busca, PDF e pacote essencial/completo/personalizado do rascunho. Formulários de emissão preservados em memória ao navegar; bloqueios próximos ao botão. Nenhuma migração de dados ou alteração no catálogo online.

Verificação local inicial: npm ci sem vulnerabilidades; lint, 239 testes e build aprovados. ZIP completo dos novos modelos conferido, com cinco parcialmente preenchidos e 13 manuais intactos; seleção essencial/manual, envio único entre telas e larguras de 320 a 1366 px aprovados. Revisão independente não realizada. Publicação segue por PR e verificação do Actions.


### Assinatura oficial do modelo — 26/10/2026

Correção solicitada pelo mantenedor: cabeçalho usa o SVG oficial horizontal com barra laranja e slogan incorporado, sem reconstrução em HTML. Página de apresentação e endpoints de logo alinhados. Fichas PDF públicas usam a imagem original extraída do modelo Excel e fontes Archivo locais. Modelos Office recebidos preservados. Contraste dos passos da apresentação corrigido. A publicação anterior foi autorizada; esta correção segue pelo mesmo fluxo de PR e CI.


### Revisão das imagens públicas da marca — 26/10/2026

Atualizadas a imagem social e as quatro capturas da página de apresentação. Assinatura oficial incorporada, fontes locais e capturas reais da demonstração isolada, apenas com dados fictícios. Metadados sociais ajustados para 1200×630 e endereço versionado para renovação da imagem compartilhada. Nenhuma mudança funcional ou nos dados de usuários.


### Logo oficial nos templates de gestão — 26/10/2026

Atualizados os seis modelos de gestão e seus seis exemplos: 44 imagens antigas substituídas pela assinatura oficial do modelo, mantendo a proporção. Versão 2.0.1-marca; contratos e manifesto atualizados com hashes de origem preservados. Comparação por partes OOXML comprova preservação de fórmulas, células, estilos, validações, proteção, gráficos e textos Word. Oito planilhas abertas e recalculadas no Excel sem erros, antes e depois. Prévia Excel regenerada no Excel; prévias Word recebem somente a nova imagem e sua matriz, com textos e páginas comparados e renderizados. A conversão PDF do Word nativo travou neste ambiente e não foi declarada aprovada. Os 18 modelos adicionais e seu ZIP já usavam o logo novo. Detalhes em REVISAO-LOGOS-TEMPLATES.md. Sem revisão independente.


### Assistente seguro e acessos por rotina — 26/10/2026

Reproduzido o envio duplicado: dois cliques em Guardar e continuar enfileiravam duas gravações. A etapa agora é preparada na cópia persistida e só chega ao estado visível após salvar. Avanço repetido é recusado também no estado; demonstração e restauração aguardam a operação pendente. Falha conserva etapa e campos, com acesso ao backup. Navegação durante a gravação não sofre substituição pela resposta antiga. Organização aceita Enter e mantém rascunho em memória por base de dados, sem misturar com demonstração/restauração.

Mais organizado em quatro grupos com busca por finalidade e acesso direto aos documentos da revisão e do rascunho. Nenhuma regra técnica, formato de backup, template Office ou biblioteca de tarefas alterado. Regressões específicas cobrem gravação lenta, falha, envio duplicado, teclado, busca e celular. Próximas entregas e validações humanas em PLANO-DESENVOLVIMENTO.md. Sem revisão independente nesta rodada.


## Documentos individuais e referências internas (26/10/2026)

O mantenedor definiu que o manual e o Design System orientam o padrão interno e não devem ser oferecidos a usuários. A tela da marca foi retirada; o endereço antigo leva ao catálogo de modelos. Os PPTX, ZIP da identidade e modelos-base Word/Excel foram preservados em PCM-Direto-Marca/Referencias-internas, fora do checkout e da publicação. Logos e fontes usados pelo produto permanecem.

Os modelos são baixados individualmente em Excel ou Word, com finalidade, orientação inicial e prévia PDF. Busca por palavras e filtro de finalidade reduzem a lista e permanecem na sessão ao navegar. O arquivo ZIP dos 18 modelos foi preservado em Templates/Arquivos-originais e retirado da distribuição. A importação futura não volta a copiá-lo para public.

Preencher um modelo gera um único arquivo com os equipamentos em edição; controles manuais dispensam cadastro. Documentos da revisão ativa também gera um arquivo por escolha, com data de corte e aprovação explícita. O histórico registra somente o documento emitido. Formulários mantêm envio único durante geração e navegação. A confirmação de aprovação fica expandida quando já marcada; falha de geração preserva os campos.

Foram removidos o download combinado antigo e o aviso ultrapassado de modelos “aguardando”. Revisão focada na experiência de documentos: não altera tarefas, critérios técnicos, templates Office, formato de backup ou esquema dos dados. Revisão independente e validação com usuários/aparelhos reais continuam pendentes. Ver docs/REVISAO-EXPERIENCIA-DOCUMENTOS.md (caminho a partir da raiz).

## Identidade do Figma e orientação de navegação — 26/10/2026

Pedido: aplicar e publicar melhorias do site; templates ficam para uma rodada futura.
Referência interna: https://www.figma.com/design/OCnoDOYbcfe1rfOJw0dvZM.
Foram consultados fundamentos, ações, formulários, navegação e feedback; a referência não é oferecida aos usuários.

A interface mantém o logo oficial e as fontes locais. Controles usam altura mínima de 48 px,
campos de texto com 16 px, raios de 4 px, cores de entrada/cálculo/erro e foco laranja texto.
Preservada a navegação inferior existente no celular. Subtelas destacam seu acesso de origem:
Cadastros e Plano Mestre em Planejar; modelos em Documentos; histórico em Executar.
Mais preserva a busca durante a sessão e permite limpar resultados vazios com foco no campo.

Escopo: nenhuma alteração em templates, geradores, biblioteca técnica, dados salvos, dependências
ou regras de manutenção. O teste de navegador reproduziu a ausência de localização em Cadastros
antes da correção. Regressões cobrem localização, troca de largura, busca, foco e estados dos campos.
Validação em aparelhos reais e leitor de tela permanece pendente.

Validação da rodada: npm ci concluído sem vulnerabilidades informadas; lint, 257 testes
em 36 arquivos e build aprovados. Revisão independente somente leitura identificou conflito de
especificidade na borda de erro e hover de botão secundário desabilitado; ambos corrigidos e
conferidos pelo revisor no Chromium com os CSS reais. Nenhum bloqueador restante no escopo.
O roteiro específico também confere os dois estados e aguarda o evento de mudança de largura
antes de verificar a navegação. Evidências locais em artifacts/identidade-figma-*.png.
