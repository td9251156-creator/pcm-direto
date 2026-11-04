> Continuação: [implementação consolidada do portal](portal/ENTREGA.md). O escopo abaixo registra a primeira parte do PR #67.

# Catálogo público de modelos — PR #67 integrado

Continuação da fundação do portal: encontrar um arquivo, entender seu conteúdo e baixar o original sem entrar no aplicativo. Etapa 2 integrada pelo PR #67, commit `562e292`. A continuação está na entrega consolidada acima.

## Implementado

- `/modelos/` e 19 páginas `/modelos/pcm-man-XXX/`, geradas pelo build existente.
- Conteúdo principal e downloads acessíveis sem JavaScript. Arquivos, revisão, formato e abas vêm do catálogo conferido por hash.
- Quatro necessidades, com Controlar OS inicial; três sugestões por caminho, na ordem definida. Ver todos apresenta os 19 modelos. Busca com acentos pesquisa toda a biblioteca; limpar o campo restaura o modo anterior. Trocar o caminho limpa a busca. Escolhas permanecem apenas na página aberta.
- Orientações iniciais de preenchimento e exemplo fictício por modelo, finalidade, conteúdo, cuidados de registro, autoria editorial e links reais para o app e o feedback. Não são guias técnicos aprofundados nem regras novas de manutenção.
- Links da entrada principal levam ao catálogo público. Máquinas e tarefas continuam separadas no app.
- Páginas editoriais fora do precache obrigatório; navegações já visitadas usam o cache público limitado existente. Filtros e estilos locais disponíveis com o cache do app pronto. Seus nomes incluem a versão do conteúdo, evitando que um worker anterior sobreponha os estilos ou filtros de uma página nova.

## Verificações

`npm run verificar`: lint, 490 testes/62 arquivos e build aprovados. Roteiro específico do catálogo aprovado. Conferidor e suíte completa de navegador são exigidos antes da integração. O roteiro novo confere 19 páginas, downloads originais, quatro caminhos, busca, teclado, 320/390/820/1280 px, leitura sem JavaScript, ausência de abertura da base e páginas visitadas offline.

Revisão independente de código e cenários concluída sem bloqueadores. Conferência técnica humana das orientações e testes com pessoas permanecem separados; não foram apresentados como executados.

## Próxima entrega

Guia aprofundado de ordens de serviço e continuidade contextual entre o material e o app. Ainda não implementados nesta etapa: parâmetro `modelo`, conversas por documento, mudanças no Supabase, indexação/distribuição completa e os outros três guias aprofundados. Os 24 guias atuais continuam no apoio do app.

A busca pública reconhece OS, O.S. e (O.S.) como sigla explícita do modelo de ordens de serviço. Siglas curtas não casam trechos de palavras; OS usa alias separado para não confundir o artigo “os” com o documento. Códigos aceitam hífens ou espaços, e palavras maiores continuam aceitando trechos. Consultas só de pontuação não encontram modelos.
