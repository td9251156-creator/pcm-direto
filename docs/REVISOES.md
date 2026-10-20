# Revisões prontas para o mantenedor

Foram abertos 16 PRs pequenos, um assunto por revisão. Nada foi integrado à main nem publicado no site.
A primeira versão dos checklists foi autorizada sem fotos e sem assinatura.

## Como revisar

1. Comece pelo PR #1 e siga a tabela. Cada descrição explica Antes, Depois, Como testar e Riscos.
2. Os ramos estão encadeados: o próximo usa o anterior como base para mostrar só a mudança daquele assunto.
3. Depois de integrar um PR, use o botão para excluir seu ramo. Antes de integrar o próximo, confira
   se o destino passou a ser main. Se necessário, ajuste o destino para main na edição do PR.
4. A integração na main publica o site automaticamente pelo fluxo existente do projeto.

| Ordem | Item | Revisão |
|---|---|---|
| 1 | 01 | [#1 — Validar biblioteca antes de importar e registrar melhorias](https://github.com/td9251156-creator/pcm-direto/pull/1) |
| 2 | 02 | [#2 — Proteger rascunhos antigos e preservar dados danificados](https://github.com/td9251156-creator/pcm-direto/pull/2) |
| 3 | 03 | [#3 — Excluir equipamentos com pendência dos cálculos do plano](https://github.com/td9251156-creator/pcm-direto/pull/3) |
| 4 | 04 | [#4 — Isolar os arquivos offline de cada aplicativo](https://github.com/td9251156-creator/pcm-direto/pull/4) |
| 5 | 05 | [#5 — Atualizar o modo offline quando arquivos fixos mudarem](https://github.com/td9251156-creator/pcm-direto/pull/5) |
| 6 | 06 | [#6 — Preservar descrições com várias linhas ao importar CSV](https://github.com/td9251156-creator/pcm-direto/pull/6) |
| 7 | 07 | [#7 — Respeitar o limite de numeração das TAGs](https://github.com/td9251156-creator/pcm-direto/pull/7) |
| 8 | 08 | [#8 — Encontrar a aba de equipamentos em planilhas com capa](https://github.com/td9251156-creator/pcm-direto/pull/8) |
| 9 | 09 | [#9 — Avisar quando o navegador não consegue guardar dados](https://github.com/td9251156-creator/pcm-direto/pull/9) |
| 10 | 10 | [#10 — Conferir rascunhos antigos e reabertura dos dados](https://github.com/td9251156-creator/pcm-direto/pull/10) |
| 11 | 11 | [#11 — Conferir instalação e atualização dos arquivos offline](https://github.com/td9251156-creator/pcm-direto/pull/11) |
| 12 | 12 | [#12 — Conferir celular e geração offline no navegador](https://github.com/td9251156-creator/pcm-direto/pull/12) |
| 13 | 13 | [#13 — Adicionar checklist da última execução por tarefa](https://github.com/td9251156-creator/pcm-direto/pull/13) |
| 14 | 16 | [#14 — Adicionar backup completo e restauração protegida](https://github.com/td9251156-creator/pcm-direto/pull/14) |
| 15 | 17 | [#15 — Permitir desfazer a última remoção de equipamento](https://github.com/td9251156-creator/pcm-direto/pull/15) |
| 16 | 18 | [#16 — Filtrar a impressão por setor e especialidade](https://github.com/td9251156-creator/pcm-direto/pull/16) |

## O que foi verificado

Instalação pelo arquivo de dependências, lint, 133 testes em 12 arquivos e geração da versão final
aprovados. Roteiro no Chromium conferiu celular, teclado, importação, checklist, backup/restauração,
desfazer remoção, filtros, falha de gravação, recuperação, abertura sem internet e geração offline
de planilha e documento. O roteiro está em [TESTES-NAVEGADOR.md](TESTES-NAVEGADOR.md).

Nenhuma dependência nova foi acrescentada ao aplicativo. Logo, ícones, tarefas técnicas, licença e
periodicidades padrão permanecem como estavam.

## O que depende de definição técnica

- Item 14: como considerar tempo de funcionamento, falhas, tempo de reparo e paradas planejadas nos indicadores.
- Item 15: quais janelas podem receber tarefas e como garantir que tarefas de segurança não sejam adiadas.
- Checklists: esta primeira versão guarda a última marcação por tarefa. Histórico completo, fotos e
  assinatura não estão incluídos.
- Falta conferência manual com leitor de tela, aparelhos reais e Excel antigo.
