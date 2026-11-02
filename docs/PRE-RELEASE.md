# Rascunho de notas — v0.1.0-preview.1

Não há tag nem release publicada por esta entrega. A versão permanece de teste; estas notas precisam ser conferidas contra o commit integrado antes de publicar. Revisões R00 dos modelos e formatos de backup não mudam.

## Base e mudanças preparadas

Base pública conferida: `81100416509f684e8078a988882e830fdd9adb11`. Os PRs abaixo partem dessa base separadamente; não representam um único commit publicado.

| Proposta | Commit conferido | Verificação local |
|---|---|---|
| [#58 — Entrada por necessidade](https://github.com/td9251156-creator/pcm-direto/pull/58) | `e0784395aeeee9dff8be5cd77dcb31e641b24986` | Lint, 416 testes/58 arquivos, build e 18 roteiros de navegador aprovados; revisão independente sem bloqueadores. |
| [#59 — Contribuição e questionário](https://github.com/td9251156-creator/pcm-direto/pull/59) | `210030760cf836c28a657d50d84b42de5621190f` | Lint, 417 testes/58 arquivos, build e 18 roteiros de navegador aprovados; revisão independente sem bloqueadores. |

Os testes locais usaram `VITEST_MAX_WORKERS=1` para reduzir concorrência, sem alterar asserções ou limites. Navegador: `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/pcm-playwright PCM_SEM_SANDBOX=1 npm run test:navegador`. Conferidores sem bloqueios. As verificações da documentação ficam no PR correspondente.

O #58 acrescenta caminhos por necessidade e orientação antes de baixar, preservando catálogo completo, arquivos e demonstração isolada. O #59 acrescenta contribuição e questionário só em memória, com cópia e encaminhamento explícito ao GitHub. Abrir o formulário com respostas já as encaminha ao GitHub pela URL; a publicação da issue depende de confirmação naquela plataforma. Há também contato por e-mail. Nenhum desses canais recebe dados operacionais automaticamente. O formulário de issue só estará na main após integração autorizada.

## Limites e publicação futura

Leitor de tela, aparelhos reais, validação com usuários, conferência documental completa em editores e configuração do banco online continuam pendentes. Nenhum dado operacional é sincronizado por essas mudanças. A nova entrada e o questionário não serão declarados disponíveis no site antes da confirmação da publicação.

Após autorização: integrar pelo fluxo de PR, conferir novamente o conjunto no commit resultante, registrar esse SHA como candidato, revisar estas notas e só então preparar a tag/release. Não escolher um SHA arbitrário nem tratar a publicação do GitHub Pages como prova de validação humana. Este documento não autoriza merge ou publicação.
