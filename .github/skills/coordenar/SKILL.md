---
name: coordenar
description: "Coordenar o desenvolvimento do PCM Direto em ciclos curtos, um item da fila por vez (Codex, Claude Code ou Copilot no modo agente)."
disable-model-invocation: true
---
Siga integralmente `.github/prompts/coordenar.prompt.md` (fonte única: papel, regras, fila com critérios de aceite,
pastas e ramos dos agentes, ciclo de cada item e formato do relatório). Leia antes o `AGENTS.md`.

Item a fazer: ${input:item:Ex.: "Faça o item 1" ou "Qual o próximo item?"}
