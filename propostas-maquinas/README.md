# Propostas para o banco de máquinas

Aqui ficam as propostas de **novos tipos de máquina** e **novas tarefas preventivas** para a biblioteca técnica
(`src/dados/biblioteca.json`). Uma proposta não muda o app: o coordenador integra só depois da aprovação do mantenedor.

## Como pedir ao agente (Copilot, no VS Code)
1. Abra o chat do Copilot e escolha o agente **banco-maquinas** na lista de agentes (ou digite `/alimentar-banco-maquinas`).
2. Diga a máquina e a fonte. Ex.: "Redutor de velocidade; fonte: manual do fabricante X, modelo Y, rev. 2, 2024".
   Sem manual, diga "nenhuma": as tarefas entram como base genérica a validar.
3. O agente cria `propostas-maquinas/AAAA-MM-DD-<assunto>.json`, roda o validador e mostra a tabela das tarefas.
4. Confira no manual. Depois peça ao Claude Code: "integre a proposta propostas-maquinas/<arquivo>.json".

## Conferir à mão
```powershell
node scripts/validar-proposta-maquinas.mjs propostas-maquinas/<arquivo>.json
node scripts/validar-proposta-maquinas.mjs propostas-maquinas/<arquivo>.json --previa   # grava a prévia em artifacts/
```
O validador usa as regras do próprio app e barra: fonte ausente; manual ou norma sem versão e data; origem diferente
da fonte; código fora de SIGLA-NN; sigla ou tipo repetido; norma citada sem fonte oficial; tarefa de segurança sem
explicação do risco. Avisa sobre tarefa de segurança com base genérica e descrições repetidas.

## O que o coordenador faz ao integrar
Junta ao `src/dados/biblioteca.json` (com a versão da biblioteca atualizada), gera o PDF do tipo novo em
`public/modelos/maquinas/`, atualiza os testes e o checklist do `BIBLIOTECA.md`, roda `npm run verificar` e os roteiros
de navegador, e só então prepara a publicação.

`exemplo-proposta.json` mostra o formato; não é uma proposta real.
