# Como usar outras IAs para contribuir com o PCM Direto

Guia curto para o mantenedor. As regras que todas as ferramentas leem sozinhas estão no `AGENTS.md`
(Copilot também lê `.github/copilot-instructions.md`; Claude lê `CLAUDE.md`). Não é preciso colar regras em cada conversa.

## Quem faz o quê

| Ferramenta | Use para | Não use para |
|---|---|---|
| **Claude Code** | Coordenar, integrar, mexer em dados/backup/importação/modelos/banco, revisão final e publicação | Tarefas repetitivas simples |
| **OpenCode + DeepSeek** | Tarefas mecânicas: testes extras, textos e documentação, capturas de tela, scripts de conferência | Arquivos protegidos (lista no AGENTS.md) |
| **GitHub Copilot** | Ajustes pequenos no VS Code e revisão automática dos PRs no GitHub | Mudanças grandes |
| **ChatGPT** | Só consulta: procedimentos, opções, revisão de texto | Editar o projeto ou os modelos |

Regra de ouro: **uma tarefa, uma ferramenta, um ramo**. Nada vai para a `main` sem `npm run verificar`, conferência e a sua aprovação.
Nunca cole dados reais da fábrica, backups, senhas ou o arquivo `.env` em nenhuma IA.

## Fluxo em 5 passos

1. **Escolha a tarefa** em `docs/FILA.md` (ou abra uma issue "Tarefa para uma ferramenta de IA" no GitHub).
2. **Crie a pasta separada** da tarefa (não mexe na pasta principal):
   ```powershell
   powershell -File scripts/nova-tarefa-ia.ps1 -Ferramenta opencode -Tarefa testes-criticidade
   ```
3. **Peça à ferramenta**, dentro dessa pasta, usando o modelo de pedido abaixo.
4. **Confira** na pasta da tarefa:
   ```powershell
   npm run verificar
   node scripts/conferir-entrega-ia.mjs
   ```
   O conferidor lista os arquivos alterados e acusa arquivo protegido, `.env`/backup, dependência nova e senha no código.
5. **Entregue para integração:** diga ao Claude Code o nome do ramo (`ia/opencode/testes-criticidade`). Ele revisa, roda
   os 13 roteiros de navegador, abre o PR e você aprova o merge. Depois apague a pasta: `git worktree remove <pasta>`.

## Modelo de pedido (cole na ferramenta)

```
Tarefa: <uma só, com o item da FILA>
Arquivos que pode alterar: <lista>
Pronto quando: <critério verificável> e `npm run verificar` passando.
Siga o AGENTS.md. Só dados fictícios. Sem dependências novas. Não altere arquivos protegidos.
Não faça push, merge nem PR. Ao terminar, mostre os arquivos alterados e a saída real de `npm run verificar`.
```

## Configuração de cada ferramenta (uma vez)

### OpenCode + DeepSeek
1. Instale o OpenCode (site oficial: opencode.ai) e entre com a sua chave da DeepSeek: `opencode auth login` → DeepSeek.
2. Na pasta da tarefa, rode `opencode`. Escolha o modelo da DeepSeek com `/models`.
3. O projeto já traz `opencode.json`: sessões **não** são compartilhadas; testes, lint, `git status/diff/add/commit` liberados;
   `git push`, `merge`, `rebase`, `reset --hard`, `gh pr merge` e `npm install` **bloqueados**; outros comandos pedem sua confirmação.
4. O OpenCode lê o `AGENTS.md` sozinho.

### GitHub Copilot (VS Code)
1. Instale a extensão GitHub Copilot e entre com a conta do GitHub (Copilot Pro de estudante).
2. O projeto já traz `.vscode/settings.json` ligando as instruções (`.github/copilot-instructions.md`) e os prompts de
   `.github/prompts/` no chat do Copilot.
3. Revisão automática de PR (uma vez, no GitHub): repositório → **Settings → Rules → Rulesets → New branch ruleset** →
   alvo `main` → marque **Automatically request Copilot code review**. Ou, em cada PR, **Reviewers → Copilot**.

### ChatGPT
Só consulta. Para levar o resultado ao projeto, cole a resposta numa issue ou mande ao Claude Code.

## Tarefas boas para começar (OpenCode)

1. Nova captura da tela de Criticidade para `public/conheca.html` (`public/apresentacao/criticidade-pc.webp`), com o
   exemplo fictício do app. Pode alterar: `scripts/`, `public/apresentacao/criticidade-pc.webp`, `public/conheca.html`.
2. Marcar em `docs/` o que foi retirado em 01/11/2026 (PCMD, refeitos, "Preencher um modelo"), sem apagar o histórico.
   Pode alterar: só `docs/`.
3. Testes de todas as combinações da criticidade 1 a 5 contra a fórmula do PCM-MAN-002 em `testes/criticidade-matriz.test.js`.
   Pode alterar: só esse arquivo.

## Se algo der errado
- A ferramenta mexeu em arquivo protegido ou "quebrou" testes: não integre. Peça para desfazer ou apague a pasta da tarefa.
- Dúvida de manutenção (regra técnica, indicador, norma): a decisão é sua; a IA não deve inventar.
