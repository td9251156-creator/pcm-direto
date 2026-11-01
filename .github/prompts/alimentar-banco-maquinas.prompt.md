---
description: Criar uma proposta de máquina nova (ou tarefas novas) para a biblioteca técnica, com fonte e validação.
---

Use as regras de `.github/agents/banco-maquinas.agent.md`.

Máquina ou tarefas: ${input:maquina:Ex.: redutor de velocidade; ou "tarefas novas para o compressor de ar"}
Fonte que tenho: ${input:fonte:Ex.: manual WEG W22 rev. 3, 2024 — ou "nenhuma" (base genérica)}

Crie o arquivo em `propostas-maquinas/`, rode `node scripts/validar-proposta-maquinas.mjs` nele até não haver ERRO e
me mostre a tabela das tarefas, os avisos e o que devo confirmar no manual. Não altere nada fora de `propostas-maquinas/`.
