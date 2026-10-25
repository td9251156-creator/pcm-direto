# Validação da reformulação

Registro de 24/10/2026. Somente testes realmente executados são evidências de entrega.

O mantenedor autorizou publicar uma **versão de teste** no domínio atual antes da liberação
final. O aplicativo exibe esse estado e orienta backup. Essa autorização não representa
aprovação dos documentos ou conclusão dos testes humanos listados abaixo.

## Executado

- `npm ci` e instalação do Chromium fixado da ferramenta de navegador.
- Verificação anterior: lint, **188 testes** e build aprovados no Windows/Node 26.
- Cenário de lógica: 100 ativos, 31.200 ocorrências diárias/semanais em um ano, duas revisões,
  histórico semestral preservado e realizado mensal sem duplicações aprovado.
- Revisão complementar somente leitura de Codex: preservação, transação concorrente real no
  Chromium, vínculos de ocorrências e duplicidade, migração/restauração, execução e OOXML.
  Achados corrigidos: TAG histórica da falha, duplicatas semânticas, vínculos trocados,
  registro de ocorrência, default de execuções no legado e marcadores Word divididos.
- Projeto Supabase conferido antes da alteração: tabelas de modelos/moderadores existentes,
  RLS habilitada. Migração aditiva de interações aplicada com sucesso; sem dados fictícios
  inseridos no projeto real. RPCs de escrita restritas ao papel authenticated e verificam usuário.

## Navegador aprovado

O roteiro `npm run test:navegador` cobre comunidade inicial/claro, migração v1, exemplo isolado,
cadastros, criticidade, capacidade e teclado, importação inválida, revisão, execução e cancelamento,
falha sem parada, backup, seis documentos sem rede, concorrência e recuperação de corrupção.
A execução completa passou. Inclui restauração v1 sem execuções sem herdar histórico, retorno
ao backup v3 e quota simulada com aborto da transação sem alterar o registro persistido.
Imagens e desenhos dos arquivos gerados foram comparados byte a byte com os originais.
Não houve erro de página no contexto principal.

## Limites e pendências de liberação

- Revisão de Claude Code, teste com três técnicos e celular real não executados.
- Figma bloqueou chamadas pelo limite da conta; arquivo criado ainda não contém propostas editáveis.
- Protótipo Sites ainda não publicado. A versão de teste no GitHub Pages foi publicada e
  conferida em `https://pcmdireto.me/`, incluindo a identidade horizontal do PR 6.
- Conferência visual no Excel/LibreOffice e impressão ainda pendentes. ZIP válido, fórmulas
  preservadas e imagens idênticas não substituem abertura e conferência nesses programas.
  `render_docx.py` foi executado e informou ausência de `soffice.exe` no ambiente.
- Cenário automatizado de restauração e consulta com 100 ativos, plano anual, duas revisões e
  histórico foi acrescentado ao roteiro. Validação do ciclo completo por técnicos continua pendente.
- Fluxo autenticado de publicação/interações entre aparelhos precisa teste com contas de teste
  autorizadas; não usar a conta nem o conteúdo real do mantenedor para simular interações.
- Auditor do Supabase aponta funções SECURITY DEFINER acessíveis por papéis autorizados:
  é deliberado para operações validadas por RPC; revisar as verificações ao mudar o esquema.
  A visão agregada pública usa SECURITY INVOKER e função de agregação em esquema privado,
  expondo somente contagens de modelos aprovados, sem autores das curtidas. Após a correção,
  o auditor não retornou erro de visão SECURITY DEFINER. Consulta anônima e bloqueio da RPC
  de escrita anônima foram conferidos com transação revertida, sem conteúdo inserido.
  Proteção contra senhas vazadas é configuração de Auth a conferir; o cliente usa link por email.

Referências do auditor: [funções autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Atualização offline com abas abertas

Verificação desta correção: lint, **190 testes**, build e roteiro Gestão aprovados.

Testes novos reproduziram três falhas: ativação forçada, HTML trocado enquanto o worker
antigo permanecia em uso e navegação nas propostas substituindo a página principal offline.
A atualização agora espera o fechamento de todas as abas e mantém HTML e arquivos da versão
ativa juntos. O aplicativo informa quando há atualização pronta, com acesso ao backup.

`scripts/verificar-atualizacao.mjs` usa servidor local e Chromium isolado. Publica A, B e uma
C incompleta: duas abas A continuam operando offline com arquivos removidos do servidor,
texto ainda não enviado fica intacto e B só assume depois que ambas fecham. Conteúdo local
fictício é preservado, caches de outros aplicativos permanecem e C não substitui B.
Abrir propostas não troca o HTML principal. Há também transição a partir de uma cópia do
worker efetivamente publicado no commit 71e0b87, sem forçar a aba antiga a recarregar.

O teste especializado valida o ciclo do worker real e do aviso em uma página fictícia.
Não simula migração de esquema entre versões nem substitui testes em aparelhos reais.
Na primeira transição do worker antigo, fechar todas as abas e abrir novamente aplica
o novo protocolo; não é necessário limpar dados nem desinstalar a PWA.
Limite da primeira transição: recarregar ou abrir outra aba enquanto o worker antigo ainda
controla o site pode trazer HTML novo pelo comportamento antigo. A correção não modifica
retroativamente esse worker. O teste legado preserva a aba que já estava aberta e verifica
a ativação depois de fechá-la; não comprova coerência de uma nova aba nessa janela.
O aviso novo não existe na versão antiga, por isso a orientação de fechar as abas também
deve acompanhar a publicação desta correção.

## Sessão da comunidade

Lint, 191 testes, build e roteiro completo de navegador aprovados. O cenário adicional de
saída pendente foi incorporado ao roteiro e executado novamente, com lint aprovado.

O teste novo reproduziu a falta de atualização ao entrar em outra aba. A tela observa os
eventos de autenticação e encerra a assinatura ao navegar. Renovar a mesma sessão não redesenha
o formulário em edição. Trocar de conta ou sair fecha o formulário e avisa; rascunhos já salvos
online continuam na conta de origem. Respostas antigas não podem reaparecer ou iniciar o envio
de uma contribuição após a troca de sessão.

A revisão independente de Codex reproduziu uma corrida adicional: uma saída pendente de A
sobrescrevia a entrada de B. A continuação agora confere a versão da sessão; o revisor repetiu
o cenário e confirmou a correção. Claude Code não foi utilizado.

As verificações automatizadas usam respostas fictícias e não enviam e-mails ou conteúdo ao
projeto real. O mantenedor escolheu entrar pessoalmente no site e avisar; o teste real do link
e das operações autenticadas permanece pendente até esse aviso.

## PDFs de máquinas e tarefas

O mantenedor confirmou o funcionamento do acesso e pediu os dois fluxos de PDF. A primeira
entrega disponibiliza as quatro fichas da biblioteca: motor elétrico (2 páginas), compressor
de ar (3), bomba centrífuga (2) e ponte rolante (3). Os 38 itens, fontes, versões, observações,
periodicidades, durações e marcações de segurança foram comparados com a biblioteca por pypdf.
As dez páginas foram renderizadas com Poppler e conferidas visualmente; geração ReportLab 4.4.9.
O teste de hash detecta mudança na biblioteca sem regeneração dos PDFs. Lint, 195 testes,
build e roteiro completo de navegador aprovados, com os quatro downloads e um download offline.
O JSON editável permanece em “Outros formatos”. Não houve alteração das regras técnicas.

O envio de PDFs prontos pela comunidade constitui a segunda entrega; não está incluído nesta
primeira alteração. Ela exige armazenamento privado, validação no servidor e moderação do arquivo.

## Envio de PDFs prontos pela comunidade

A segunda entrega acrescenta PDF opcional ao formulário, de até 5.000.000 bytes e 200 páginas.
Escolher o arquivo não inicia envio automático. Salvar rascunho envia os campos e o PDF
escolhidos; publicar exige consentimento e aprovação. O arquivo fica privado para autor e
moderação; após aprovação, a consulta pública pode baixá-lo. Arquivar bloqueia novas leituras
públicas, preservando o arquivo e as cópias já baixadas. Trocar PDF exige nova versão.

Verificações locais: lint, 201 testes e build aprovados; roteiro de navegador completo aprovado,
incluindo formulário de PDF em 390 px, download e decisão com versão. `verificar-pdfs-banco.mjs`
executa as funções SQL reais em PGlite isolado, com substitutos de auth/storage: autoria,
permissões, escrita sem sobrescrita, limite, anexo completo, retomada idempotente, decisão
antiga recusada e arquivo preservado ao arquivar. O parser pdf-lib 1.17.1 abriu as quatro
fichas e recusou um arquivo falso com cabeçalho/EOF PDF. O roteiro não equivale à API Storage.

Revisão independente de Codex identificou e confirmou correções em três casos: policy
permitia operações além de GET; resposta perdida após vincular bloqueava retomada; o erro
moderno HTTP 409 do SDK não era reconhecido. Não usou contas nem arquivos reais.

Backend implantado: migração `20261024145808_pdfs_catalogo.sql`, bucket privado e finalizador
versão 1 com `verify_jwt=true`. Conferência real: anônimo recebe 401 no finalizador e na RPC
administrativa; preflight retorna 200; rota pública do bucket não oferece leitura; somente
service_role pode executar o vínculo. A assinatura antiga de aprovação foi removida. O auditor
retornou avisos das RPCs SECURITY DEFINER deliberadas e proteção de senha preexistente,
sem novo erro: a reserva exige usuário/autoria e o vínculo exige papel administrativo.

A validação abre estrutura, limita tamanho/páginas e calcula SHA256; não faz análise antivírus.
Não foi criado conteúdo fictício no projeto real. O mantenedor informou que o acesso funcionou;
upload e moderação reais de um PDF escolhido por ele ainda precisam de conferência. Claude Code
não foi utilizado. A publicação continua sendo versão de teste.

## Gerar a própria ficha dos campos

Formulários e registros do catálogo, inclusive sem PDF anexo, podem abrir ficha local para
Imprimir / salvar PDF. A Biblioteca técnica também gera a ficha do tipo editado neste aparelho,
com suas tarefas e aviso. Escolher Salvar como PDF é uma ação do usuário no diálogo de impressão;
não há upload automático nem conversão em servidor.

Lint, 203 testes e build aprovados. O roteiro completo passou com geração offline, marca
incorporada e tarefas completas. PDF local de motor foi aberto por pypdf e renderizado por
Poppler: oito tarefas e fontes/observações preservadas, com conferência visual das páginas.
O fluxo de formulário confirma que gerar a ficha não chama salvamento nem upload, testa
impressão/fechamento e exige nova aba sem opener. Textos são escapados; não viram HTML.

O teste reproduziu falha de logo offline na aba nova, corrigida incorporando o SVG original.
A revisão independente achou título longo sem espaços fora da área de impressão; quebra
foi corrigida e o revisor confirmou título com 120 caracteres e logo sem rede no Chromium.
O roteiro contém essa regressão. Paginação e diálogo em aparelhos reais continuam pendentes.

## Execução e consulta do histórico

Verificação atual: lint, **216 testes** e build aprovados. Roteiro completo de navegador aprovado,
incluindo 100 motores fictícios restaurados pela interface, plano anual com duas revisões e
76 registros. Confere busca, data realizada, conclusões recentes, todas as páginas no download,
legado fora do cadastro, texto escapado, intervalo inválido e cancelamento por teclado.
Quota de escrita mantém o registro ativo em memória e no IndexedDB, sem exceção global.
A primeira execução aprovou os cenários de atualização, mas excedeu o prazo ao fechar um recurso
do teste; a repetição completa encerrou normalmente e aprovou todos os cenários.

Regressões de estado reproduziram antes da correção: cancelamento anunciado apesar de falha,
clone concorrente e entrada na demonstração restaurando uma flag anterior. Revisão independente
somente leitura confirmou as correções e executou gravação concorrente com IndexedDB real e
quota síncrona isolada. Não houve alteração de esquema, envio de dados operacionais ou uso de
contas reais. Claude Code não participou; conferências humanas e documentais seguem pendentes.

## Prévia e ativação de revisões — 25/10/2026

Lint, 221 testes e build aprovados; roteiro completo de navegador aprovado, incluindo prévia
com 100 ativos e invalidação de vigência, elaborador e resumo. Confere foco, retorno ao rascunho,
ativação e preservação dos fluxos anteriores. A primeira verificação teve timeout de importação
XLSX; uma execução do navegador concluiu os cenários, mas excedeu o prazo de fechamento de um
recurso. Repetições completas terminaram com sucesso, sem alterar limites nem desativar testes.

Novas regressões cobrem comparação por IDs, carga recortada, assinatura vencida após alteração
de dados/data, execução e cancelamento, quota durante ativação, espera da demonstração e emissão
documental concorrente. A revisão independente reproduziu os problemas antes e confirmou depois
que a base/backup permanecem válidos, a emissão é preservada e uma resposta tardia não muda outra
tela. Também conferiu metadados alterados sem evento de input e texto escapado no Chromium.
Não repetiu todo o roteiro grande; essa execução foi feita pelo implementador. Sem Claude Code,
contas reais ou mudança de esquema. Validações humanas e documentais continuam pendentes.
