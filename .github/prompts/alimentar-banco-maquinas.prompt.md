---
description: Cadastrar uma máquina real (ou tarefas novas) na biblioteca, com o agente banco-maquinas, uma seção por vez.
---

Use as regras de `.github/agents/banco-maquinas.agent.md`.

Máquina: ${input:maquina:Ex.: redutor SEW série R, ou "tarefas novas para o compressor de ar"}
Fonte que tenho: ${input:fonte:Ex.: manual do fabricante, modelo X, rev. 3, 2024, págs. 40–52 — ou "nenhuma"}

Conduza comigo uma seção por vez (identificação, componentes, tarefas, modos de falha, checklist, peças, fontes),
esperando meu "ok" em cada uma. Depois grave em `propostas-maquinas/`, rode o validador até não haver ERRO e me mostre
o resumo com o que ficou "a confirmar" e em quais modelos cada informação vai aparecer.
