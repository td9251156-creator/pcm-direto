> Atualização 24/10/2026: decisões atuais em [Reformulação](REFORMULACAO.md). As seções abaixo registram o histórico e não substituem essas decisões.

# Fila de evolução

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
