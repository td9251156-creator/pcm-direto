# Agentes no GitHub Actions

O executor escolhido é o GitHub Actions. O fluxo `Agentes de melhoria` tem uma agenda semanal
e execução manual. Ele só chama a IA depois de uma ativação explícita. A rotina de qualidade
semanal e o Dependabot continuam funcionando independentemente dessa ativação.

## Preparação pelo mantenedor

Em **Settings → Secrets and variables → Actions** do repositório:

1. Cadastre `OPENAI_API_KEY` como **secret**, usando uma chave de projeto exclusiva para esta
   automação. Não coloque chaves no código, nas issues ou no chat.
2. Cadastre a variável `PCM_IA_MODELO` com o identificador de um modelo Codex disponível nesse projeto.
3. Confira preços, créditos e limites no provedor antes de ativar. A assinatura do ChatGPT não
   fornece automaticamente créditos da API. Minutos do Actions também seguem os limites da conta.
   Limites de tempo e tamanho do fluxo não são um teto financeiro garantido; alertas de orçamento
   do provedor podem não interromper chamadas. Use os controles efetivamente disponíveis no projeto.
4. Para autorizar o consumo configurado, cadastre `PCM_IA_ATIVA` com o valor `true`.
5. Em **Settings → Actions → General → Workflow permissions**, permita que o Actions crie PRs.
   O workflow concede escrita somente ao job que abre o PR.
6. Na tabela de `docs/FILA.md`, deixe uma tarefa pequena com critérios definidos e situação exatamente
   `Pronta`. Sem tarefa pronta, a agenda termina sem chamar a IA. Os itens que dependem de aparelhos
   ou decisões técnicas continuam bloqueados; configurar o executor não resolve essas dependências.

Depois, em **Actions → Agentes de melhoria → Run workflow**, execute primeiro o diagnóstico.
Ele informa os pré-requisitos sem exibir a chave e sem chamar o modelo. Para a primeira rodada
real, desative a opção de diagnóstico e acompanhe os jobs e o PR resultante.

As credenciais e permissões administrativas não puderam ser consultadas nesta sessão: a integração
retornou HTTP 403. A configuração do workflow não comprova que a chave exista ou que o modelo tenha
acesso. Só a primeira rodada real concluída comprova o funcionamento dos agentes.

## O que acontece em uma rodada

1. A preparação confere ativação, modelo, chave e existência de PR anterior da automação.
2. O implementador parte de uma versão imutável da `main` e escolhe uma única tarefa pronta da fila.
   Se não houver tarefa pronta, não deve inventar novas regras técnicas ou mudanças sem evidência.
3. O candidato é limitado a 12 arquivos e 500 linhas adicionadas/removidas, até 100 KB de patch.
   São aceitos apenas JavaScript e CSS de `src/` fora de `src/dados/`, testes JavaScript e `docs/FILA.md`.
   Links simbólicos, executáveis, arquivos binários e remoções de arquivos são recusados.
4. Um revisor separado recebe exatamente o candidato, sem poder editar, e precisa aprová-lo sem achados.
5. Outra máquina, sem credencial de IA ou permissão de escrita, executa lint, testes, build e navegador.
6. Só então um job separado abre um PR em rascunho. Ele não executa o código candidato, não integra
   a mudança e não publica. Uma verificação adicional é disparada explicitamente no ramo do PR.

PRs criados com o `GITHUB_TOKEN` não disparam automaticamente o evento `pull_request`. Por isso
o fluxo pede a verificação manual do ramo pelo workflow existente; não trate a ausência de checks
no PR como aprovação. Os resultados ficam ligados à execução e ao commit do ramo.

O revisor de IA pode errar. A aprovação automática não dispensa conferir as evidências e autorizar
a integração aplicável. Nenhum PR futuro recebe autorização irrestrita de publicação por este fluxo.

## Pausar e corrigir problemas

- Remova `PCM_IA_ATIVA` ou altere seu valor para `false` para impedir novas chamadas.
- Cancele uma execução em andamento em Actions se necessário; desativar a variável não cancela jobs já iniciados.
- Falta de chave, modelo ou ativação encerra a preparação sem invocar a IA.
- Um PR anterior aberto impede iniciar outra implementação. Revise, integre ou feche esse PR primeiro.
- Falha de revisão ou teste impede criar o PR; consulte os jobs antes de tentar outra rodada.
- Não configure tentativas ilimitadas, merge automático ou impressão da resposta completa dos agentes nos logs.

Código do repositório é enviado ao provedor para a tarefa de desenvolvimento. O aplicativo publicado
continua funcionando somente no navegador e não envia os dados dos seus usuários à automação.
