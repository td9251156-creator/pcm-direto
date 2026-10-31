> Atualização 24/10/2026: decisões atuais em [Reformulação](REFORMULACAO.md). As seções abaixo registram o histórico e não substituem essas decisões.

## Dashboards PCM v2 — andamento local (31/10/2026)

| Etapa | Situação | Próxima ação | Verificação |
|---|---|---|---|
| Visual (31/10) | Cartões com ícone/contexto/medidor, linhas mensais com mês parcial tracejado, barras horizontais legíveis no celular, dica ao passar o mouse | Validação humana do visual | Capturas 390–1280 px em `artifacts/` |
| Revisão independente | Concluída: sem bloqueador; itens 1–7, 9–11, 13 e parte de 14–17 corrigidos com testes | Pendentes menores: mês parcial no início do filtro, falha que começa antes do período (declarada como limitação) | 298 testes |
| Manutenção e Programação | Implementada (demonstração) | — | Controles 85 OS / 81 atrasadas / 238,5 h recalculados em teste |
| Confiabilidade | Implementada; MTBF/MTTR/disponibilidade "Definição pendente" (F-005) | Aguardar definição técnica | 124 falhas; sobreposição, recorte e falha aberta testados |
| Custos | Implementada | — | R$ 156.034 / 110.000 / 46.034; outubro marcado parcial |
| Baixar HTML | Implementado, sem scripts nem recursos externos | Aprovação da prévia | Arquivo aberto offline no Edge; prévia em `outputs/dashboards-pcm-v2/` |
| Fonte de dados real (OS/custos) | **Não iniciada**: telas leem só o pacote fictício | Decisão: armazenamento v4 + importação 004/008/012 | — |
| Biblioteca (etapas 6–7), fluxo, qualidade | Não iniciadas | Um modelo por vez | — |

Telas em `src/telas/dashboards.js` (rota `#dashboards`, Mais → Rotina); cálculo em `src/logica/dashboards/`;
HTML em `src/saida/dashboards-*.js`. Testes: `testes/dashboards-*.test.js` e `scripts/verificar-dashboards.mjs`
(roteiro de navegador, incluído em `npm run test:navegador`). Validação em aparelho real, leitor de tela e
com técnicos continua pendente (F-004). Sem commit, PR ou publicação.

## Preparação local da Biblioteca PCM v2 — 31/10/2026

Atualização posterior: modelos 002 e Word 017–019 sincronizados com os novos
arquivos enviados, manifesto v2.0.1 e versões anteriores preservadas em backup.
Detalhes em `INTEGRACAO-BIBLIOTECA-PCM-V2.md`. Sem publicação.

19 modelos recebidos (16 XLSX e 3 DOCX), cópias integrais e manifesto separado do catálogo
anterior. Leitor de prévia de ativos, OS, falhas e custos, sem persistência ou ligação à tela.
Normalização gráfica somente em memória para leitura; nunca usada para emitir documentos.
Oito testes específicos e revisão independente aprovados no escopo de preparação.
`npm run verificar`: 37 arquivos e 265 testes aprovados, lint e build concluídos.
`npm run test:navegador` concluído com sucesso nas regressões existentes. O novo leitor
foi validado por testes de dados; ainda não existe interface operacional para ele.
Integração operacional e dashboards não implementados nesta etapa.
Detalhes em [Integração v2](INTEGRACAO-BIBLIOTECA-PCM-V2.md); próxima etapa em
[Prompt dos três dashboards](PROMPT-DASHBOARDS-PCM-V2.md).
Não confundir a grade anual de 60 posições com semanas ISO; MTBF depende de horas de operação,
e o orçamento exige escopo explícito. Nenhuma migração, push, PR ou publicação executados.

# Fila de evolução

## Troca dos modelos pelo novo pacote do mantenedor (25/10/2026)

PCMD-Modelos.zip substitui os seis editáveis e seis exemplos, preservados byte a byte. As 12
prévias PDF e COMO-USAR acompanham o pacote; manifesto SHA256 em public/modelos/manifesto.json.
Versão de integração 2.0.0 identifica novas emissões; histórico de emissões anteriores permanece.
Downloads do Banco de modelos incluem as prévias estáticas, inclusive offline.

Contrato remapeado para dados na linha 4 e cadastros consolidados. Pessoas/requisitos do PCMD-01
e setores do PCMD-02 usam seus blocos próprios. Expansão realoca blocos inferiores, fórmulas,
validações, formatação condicional, nomes definidos e referências entre abas. Área impressa cobre
o último registro preenchido. Fórmula do nome do tipo do ativo preservada. Na cópia gerada,
ConfigD29 verifica o total exportado de pessoas, sem contar requisitos como excesso de pessoas.
Os originais recebidos não foram corrigidos nem regravados.

Hashes dos modelos são conferidos antes do preenchimento para recusar arquivo antigo em cache.
Regressão de exportação: 41 pessoas, 42 referências, 60 setores, 100 ativos, tarefas diárias,
3.101 execuções e 1.101 falhas, sem sobreposição ou truncamento. Revisão independente confirmou
os ajustes. Conferência final de recálculo e impressão no Excel/LibreOffice continua pendente.

## Conferência da revisão antes de ativar (25/10/2026)

Editar vigência, elaborador ou resumo invalida a prévia. A confirmação também verifica o
rascunho, biblioteca, responsáveis/pessoas, capacidade, histórico, programação e data local.
Mudança nesses dados exige conferir novamente; não ativa um impacto diferente do apresentado.
Comparação por IDs entre tarefas ativas da última revisão e do rascunho, com antes/depois,
horas afetadas por especialidade, capacidade semanal separada e lista expansível das previsões
substituídas. Prévia sem novas ocorrências avisa para conferir o início do ciclo.

A revisão preparada só chega ao estado operacional após salvar. Durante a gravação, outras
execuções/cancelamentos aguardam nova tentativa; demonstração e restauração esperam o término.
Emissões documentais concorrentes permanecem na cópia gravada e na memória. Trocar de tela
durante a ativação não causa navegação posterior inesperada. Sem mudança de formato ou regras técnicas.
Regressões reproduziram prévia antiga, programação provisória sob quota e emissão concorrente.
Revisão independente somente leitura confirmou as correções com provas isoladas.

## Execução e histórico consultáveis (24/10/2026)

Busca por TAG/tarefa/responsável nas ocorrências, datas brasileiras e Concluídas pela data
realizada. Listas começam com 20 ocorrências e permitem carregar mais. Histórico com busca,
intervalo da realização, situação, paginação e JSON de todos os resultados filtrados; o arquivo
de consulta não substitui o backup completo. Registros legados e de ativos removidos permanecem.

Cancelar agora usa diálogo com foco inicial em Voltar e só confirma após a transação terminar.
Falha de gravação mantém a execução anterior; bloqueia refazer o vínculo enquanto cancela e
aguarda pendências antes de entrar na demonstração ou restaurar outra base. Revisão independente
reproduziu os casos de clone concorrente e demonstração; regressões cobrem as correções.
Erro síncrono de escrita no IndexedDB também aborta a transação e chega à interface.

Critérios: verificações completas, consulta/restauração com 100 ativos, plano anual e duas revisões,
quota, cancelamento por teclado e mudança de tela, sem contas ou dados reais. Conferência manual
em celular, leitor de tela, Office e com três técnicos continua pendente. Próximo item: validar
esses fluxos de uso com o mantenedor e os técnicos antes da liberação final.

## HTML offline da mesma publicação (24/10/2026)

Uma atualização guardou HTML HTTP anterior junto de arquivos do build novo, deixando uma
referência a CSS antigo sem recurso disponível. O worker agora incorpora o HTML final do próprio
build e guarda as três entradas equivalentes; recursos são baixados com cache HTTP recarregado.
Instalação continua atômica quanto à ativação, sem skipWaiting, apagamento de dados ou recarga forçada.
Regressão simula publicação B enquanto o HTTP da página principal ainda responde A.
Uma entrada identificada pela versão, descoberta em versao-atual.json, permite recuperação online
quando até as entradas fixas estão presas no cache anterior; não é a abertura offline habitual.

## Tipografia do slogan (24/10/2026)

Ajuste solicitado pelo mantenedor: slogan sem serifa em Arial/Helvetica, peso 700 e espaçamento
leve entre letras, para aproximar o texto da assinatura visual do logo. Mantidos texto, cor,
proporção do SVG e linha laranja única. Sem fontes externas ou dependências.

## Recuperação de uma aba com versão antiga (24/10/2026)

A aba do mantenedor continuava no HTML antigo, com atualização pendente. Reabrir ativou uma
versão intermediária. Verificar explicitamente registro.update() a cada abertura, com falha de
rede tolerada. A entrada atualizar.html usa o mesmo HTML e a mesma origem/base de dados;
permite abrir a publicação atual quando o worker antigo fixa a página inicial no cache.
Nenhum skipWaiting, recarregamento automático, exclusão de cache manual ou limpeza de dados.
Teste confere entradas idênticas, verificação offline tolerada e histórico preservado ao trocar a entrada.
A entrada recupera clientes anteriores que não a tinham no cache; não é uma URL permanentemente
sem cache. Após sua instalação, aplica-se a atualização segura por fechamento das abas.
Arquivos públicos de URL fixa ainda pertencem ao worker ativo; nenhum deles mudou nesta correção.

## Correção da assinatura da marca (24/10/2026)

O SVG horizontal já contém a linha laranja. O cabeçalho acrescentava uma segunda borda e
colocava o slogan dentro do link, propagando o sublinhado. Agora usa uma única imagem horizontal
com dimensões coerentes (1140 × 235), slogan separado e legível, sem borda adicional.
Regressão no navegador confere proporção, assinatura única e ausência de sobreposição em
320, 390, 820 e 1280 px, além das rotinas existentes.

## Handoff mobile e desktop do mantenedor (24/10/2026)

Aplicação da referência HTML do ZIP sobre os dados e serviços existentes. Navegação responsiva,
visão geral, execução em painel, filtros e histórico, consulta de ativos e falhas adaptadas.
Escopo, decisões preservadas e diferenças restantes em [HANDOFF-MOBILE.md](HANDOFF-MOBILE.md).
Revisão independente identificou e orientou correções de foco e de respostas atrasadas após navegação.

## Encontrar e conferir tarefas antes do PDF (24/10/2026)

A busca da comunidade passa a consultar nomes e códigos das máquinas, descrição/ID das tarefas,
especialidade e periodicidade. Aceita palavras em qualquer ordem e termos sem acentos; não altera
rótulos, IDs ou dados. Documentos PCMD usam a mesma comparação por palavras.
Cada máquina oferece uma prévia expansível com todas as tarefas, duração, origem, versão,
observações e identificação de segurança. O PDF continua sendo o download principal.
Escopo restrito ao banco de modelos da página inicial; catálogo colaborativo não foi alterado.
Validação inclui busca por tarefa no celular, abertura pelo teclado e preservação de 0,25 hora.
Lint, 205 testes e build aprovados. Roteiro completo no Chromium aprovado e fluxo afetado repetido
após a correção de precisão. Revisão independente aprovada após a correção.

## Moderação de comentários publicados (24/10/2026)

O botão de ocultar desaparecia após a aprovação. A moderação agora pode ocultar comentários
pendentes ou já publicados, usando a mesma permissão do servidor e preservando o registro.
Comentários ocultos não recebem novos botões. Regressão no Chromium com conta e respostas
fictícias confere a decisão enviada e o estado após a atualização. Nenhuma interação real alterada.

Verificação: lint, 203 testes, build e roteiro completo no Chromium aprovados; revisão independente
somente leitura aprovada. Envio e moderação com conta real continuam como validação manual.

## Modelos de máquinas e tarefas em PDF (24/10/2026)

O mantenedor confirmou dois fluxos: baixar fichas em PDF e publicar PDFs prontos na comunidade.
Primeira entrega: quatro fichas públicas geradas da biblioteca, com tarefas, periodicidades,
origem/versão, duração e segurança preservadas; JSON secundário e download offline.
Segunda entrega: anexo PDF privado durante revisão e download após aprovação, com verificação
no servidor e proteção contra troca do arquivo após a conferência do moderador. Não confundir
os PDFs da biblioteca com o upload comunitário, que exige validação própria.

As quatro fichas foram publicadas no PR 10. O mantenedor confirmou que o acesso funcionou.
O envio comunitário foi implementado com bucket privado, parser no servidor, limite de 5 MB/
200 páginas, arquivo imutável e decisão por versão. Validação local: 201 testes e roteiro de
navegador com banco isolado/API simulada; revisão independente confirmou as correções de
permissões e retomada. Backend implantado com JWT obrigatório e bloqueios anônimos conferidos.
O upload real autenticado de um arquivo escolhido pelo mantenedor ainda requer conferência.

Complemento: gerar ficha local pelos campos do formulário/catálogo e por tipo da Biblioteca
técnica. Abre prévia em outra aba e usa Imprimir / salvar PDF, sem enviar dados. Marca funciona
offline; textos e títulos longos são preservados. Verificação: 203 testes, navegador e revisão
independente, com correções de marca offline e título sem espaços.

## Sessão da comunidade entre abas (24/10/2026)

Correção delimitada: o catálogo consulta a sessão somente ao abrir, deixando a tela antiga
desconectada após login em outra aba. Observar eventos do SDK, preservar formulário durante
renovação da mesma conta, invalidar respostas anteriores e remover a assinatura ao sair da tela.
Testes com API simulada cobrem entrada/saída, salvamento e permissão atrasados e troca de conta
durante uma saída pendente. Login real por link aguarda o mantenedor entrar e avisar; não enviar
e-mail ou criar conteúdo real para simular a validação.

## Atualização offline segura (24/10/2026)

Pendência do plano aprovado: publicar uma versão nova com aba antiga aberta, sem interromper
o trabalho. Três falhas foram reproduzidas antes da correção: ativação forçada, mistura de
HTML/arquivos e propostas substituindo o HTML principal offline.

Critérios: nova versão espera todas as abas; aviso com orientação de backup; rascunho de
formulário e recursos antigos continuam disponíveis; versão incompleta não substitui a ativa;
dados fictícios persistem e caches de outros apps não são removidos. Conferência por testes
unitários e `scripts/verificar-atualizacao.mjs`, inclusive transição do worker publicado.

## Interface — logo horizontal e comunidade (24/10/2026)

Solicitação do mantenedor: assinatura horizontal com slogan e melhor experiência de uso.
Usar os vetores originais do kit; no celular, separar o slogan em texto de 12 px para preservar
a leitura. Cabeçalho com retorno à comunidade e acessos ao PCM/apoio, mantendo menu lateral
no computador e inferior no celular. Entrada com caminhos distintos para modelos e fábrica,
busca com contagem e recuperação de resultado vazio.

Conferir em 320, 390, 820 e 1280 px: proporção da marca, ausência de rolagem horizontal,
busca/categorias, foco por teclado, áreas de toque e download. Testes e screenshots constam
do roteiro de navegador; publicar pelo PR após revisão e verificações.

Esta é a fila atual. [MELHORIAS.md](MELHORIAS.md) guarda o diagnóstico e as entregas anteriores.
O processo de trabalho está em [EVOLUCAO-CONTINUA.md](EVOLUCAO-CONTINUA.md).
Uma implementação por vez. Um item só termina com evidência e revisão independente.

| ID | Prioridade | Problema e resultado esperado | Critério de conclusão | Situação |
|---|---|---|---|---|
| F-001 | Alta | Organizar trabalho por agentes e impedir publicação manual de ramos não integrados. | Instruções, fila e revisão independente registradas; testes aprovados; execução manual fora da main pula a publicação. | [PR #18](https://github.com/td9251156-creator/pcm-direto/pull/18) integrado; revisão semanal executada e aprovada. |
| F-002 | Alta | Tornar o teste de navegador totalmente previsível: fixar a ferramenta de teste, recusar porta já ocupada e limitar a espera pelo serviço offline. | Uma porta ocupada e um serviço offline que não inicia falham com mensagem e tempo limite; ferramentas só de teste, separadas do aplicativo. | Implementado e revisado: ferramenta isolada com lockfile, oito testes de regressão e roteiro real aprovados. |
| F-003 | Média | Executar a conferência de navegador na rotina automática após F-002. | Fluxos de celular, backup, checklist e geração offline rodando em máquina limpa; falhas bloqueiam a revisão. | [PR #22](https://github.com/td9251156-creator/pcm-direto/pull/22) integrado; navegador aprovado na revisão semanal e antes da publicação. |
| F-004 | Média | Conferir leitor de tela, celular real e arquivos no Excel antigo. | Registrar aparelho/programa e versão, passos e resultado; corrigir problemas encontrados sem usar dados reais. | Aguardando acesso aos aparelhos/programas. |
| F-005 | Média | Definir cálculo de MTBF, MTTR e disponibilidade, item 14 do diagnóstico. | Mantenedor define funcionamento, falha, reparo, período e tratamento de paradas planejadas; exemplos numéricos aprovados antes de implementar. | Aguardando definição técnica. |
| F-006 | Média | Definir janelas e paradas programadas, item 15 do diagnóstico. | Mantenedor aprova exemplos e limites; nenhuma tarefa de segurança pode ser adiada fora da regra definida. | Aguardando definição técnica. |
| F-007 | Média | Preservar o foco de teclado ao ajustar a capacidade por especialidade na Revisão. O redesenho do quadro remove o campo focado após a primeira seta. | Setas consecutivas continuam ajustando o mesmo campo; Tab segue a ordem normal sem recuperar foco indevidamente; capacidade, carga e salvamento permanecem corretos; regressão coberta por teste. | Implementado e revisado; 150 testes e Chromium aprovados. |


## Interface funcional — direção atual do mantenedor

O mantenedor criará os modelos Excel e Word e os enviará depois. Não continuar os geradores
PCMD nem integrar o PR #31 como dependência desta interface. Consulte o
[guia dos modelos e da interface](INTERFACE-E-MODELOS.md).

| ID | Resultado | Situação |
|---|---|---|
| I-01 | Cadastros M1–M6, criticidade, Plano Mestre, mensal, histórico completo e falhas, com backup compatível. | Implementado e revisado: 168 testes, build e roteiro completo no Chromium aprovados. PR aguardará revisão do mantenedor. |
| I-02 | Receber modelos originais do mantenedor e mapear seus campos aos dados existentes. | Aguardando os arquivos; não há importação ou preenchimento automático de templates nesta entrega. |

Os modelos futuros precisam preservar segurança, identificação dos registros, origem dos dados e
aviso. O guia descreve o conteúdo; não determina um formato de integração antes de receber os arquivos.

## F-007 — primeira tarefa da execução por agentes

- **Evidência:** em 20/10/2026, no Chromium, abrir Revisão com o exemplo fictício e focar
  `#cap-Operação`. Após `ArrowUp`, o valor passa a `0.5`, mas `document.activeElement` passa
  de `INPUT#cap-Operação` para `BODY`. A segunda seta não ajusta o campo. O evento `change`
  em `src/telas/revisao.js` substitui todo o conteúdo de `#carga`, removendo o elemento focado.
- **Impacto:** quem usa teclado precisa localizar e focar o campo de novo a cada ajuste.
- **Resultado:** manter o foco da mesma especialidade se a atualização acontecer com o campo
  ainda focado. Não puxar o foco de volta quando a alteração tiver sido confirmada por Tab ou blur.
- **Escopo:** `src/telas/revisao.js`, eventual auxiliar JavaScript de interface e teste de regressão
  JavaScript em `testes/`; atualizar esta fila. Não mudar regras de capacidade, biblioteca técnica,
  dados salvos, dependências ou automações. Uma implementação pequena, dentro dos limites do executor.
- **Como conferir:** a partir do campo vazio, duas setas para cima devem chegar a `1.0` com foco
  no mesmo campo; uma seta para baixo retorna a `0.5`. Tab segue para o próximo controle sem
  reiniciar a navegação. Conferir atualização da carga e persistência ao reabrir a tela. Um teste
  relevante deve reproduzir a perda de foco antes e passar depois; executar também as verificações
  completas e o roteiro de navegador existentes.
- **Diagnóstico:** agente separado, somente leitura, com reprodução no Chromium. A proposta do executor recebeu correção complementar nesta sessão: aguardar a navegação do Tab
  antes de redesenhar e preservar o destino escolhido pelo navegador. Foram acrescentados testes
  de Tab e desmontagem da tela e uma regressão no roteiro real do Chromium. Os novos testes
  falharam antes da correção. Lint, 150 testes, build e roteiro de navegador aprovados localmente,
  com revisão independente. A entrega deve seguir por PR revisado e ter publicação conferida;
  testes locais sozinhos não comprovam disponibilidade no site.

## Modelo para adicionar um item

- **Problema e evidência:** o que aconteceu e como reproduzir com dados fictícios.
- **Impacto:** quem é afetado e o que deixa de conseguir fazer.
- **Resultado esperado:** comportamento observável, sem escolher uma reescrita antecipadamente.
- **Escopo:** arquivos ou parte do produto; registrar também o que fica para depois.
- **Critérios de conclusão:** verificações que podem falhar se a mudança estiver incorreta.
- **Dependências e decisões:** o que precisa existir antes de começar.
- **Responsável e revisão:** coordenador, implementador e revisor; registrar apenas quem participou.
- **Evidência:** PR, resultado dos testes e limitações reais.

Não abrir tarefas públicas com dados pessoais, segredos ou detalhes de falhas de segurança ainda sem correção.

## Evidência da primeira rodada com agentes

- Coordenação e implementação delimitada, com um agente preparando as instruções e outro fazendo revisão independente somente leitura.
- Instalação, `npm run verificar`, 133 testes e roteiro `npm run test:navegador` aprovados.
- Auditoria de dependências em 20/10/2026: nenhum alerta informado pelo serviço.
- [Execução manual fora da main](https://github.com/td9251156-creator/pcm-direto/actions/runs/39420496553): verificação aprovada e publicação pulada.
- A revisão semanal e as propostas do Dependabot estão configuradas na main. [Primeira revisão semanal](https://github.com/td9251156-creator/pcm-direto/actions/runs/39421631200) executada com sucesso; as próximas agendas dependem das condições do GitHub.

## Rodada de ativação das rotinas

- Playwright e Chromium preparados com versão fixada e lockfile separado do app. As dependências de produção não mudaram.
- 141 testes de lógica e infraestrutura aprovados; roteiro completo no navegador aprovado com a ferramenta fixada.
- Revisão independente dos workflows, prazos, fechamento de recursos e correção da espera entre rotas.
- Dependabot já gerou propostas no repositório; nenhuma atualização é integrada sem a revisão aplicável.
- Modo escolhido: tarefas do Codex com login do ChatGPT Plus. O Actions continua com testes, auditorias e publicação; o fluxo de IA por API foi desativado no GitHub e fica sem agenda, com pausa explícita no código. Veja [AGENTES-GITHUB-ACTIONS.md](AGENTES-GITHUB-ACTIONS.md).
- [Diagnóstico após cadastro da chave](https://github.com/td9251156-creator/pcm-direto/actions/runs/39499911020):
  o Actions recebeu `OPENAI_API_KEY`; modelo ausente e ativação desabilitada. Não houve chamada à IA,
  portanto validade da chave, saldo e acesso ao modelo ainda não foram testados. Tentativas de salvar
  as duas variáveis pela integração retornaram HTTP 403; precisam ser cadastradas nas configurações do GitHub.


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
