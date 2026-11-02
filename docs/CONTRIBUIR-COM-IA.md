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

## Pastas: quem trabalha onde

```
PCM Direto\
├─ app\                      desenvolvimento original e integração (só o coordenador)
├─ agentes\                  uma pasta por tarefa de agente (criada pelo script)
│  ├─ maquinas-<tarefa>\     agente banco-maquinas · ramo ia/maquinas/<tarefa> · só propostas-maquinas/
│  ├─ divulgacao-<tarefa>\   agente redes-sociais  · ramo ia/divulgacao/<tarefa> · só divulgacao/
│  └─ opencode-<tarefa>\     código (também copilot-…, claude-…) · ramo ia/<tipo>/<tarefa> · sem arquivos protegidos
└─ backups\                  cópias de segurança completas do repositório (.bundle)
```

O Codex trabalha no próprio contêiner, no ramo `ia/codex/<item>`, com as mesmas regras do perfil de código.

## Fluxo em 4 comandos (na pasta `app`)

1. **Criar a pasta da tarefa** (não mexe na pasta `app`):
   ```powershell
   powershell -File scripts/nova-tarefa-ia.ps1 -Tipo maquinas -Tarefa redutor-sew-r
   ```
   Tipos: `maquinas`, `divulgacao`, `opencode`, `copilot`, `claude`.
2. **Trabalhar na pasta criada:** abra no VS Code e use o agente (banco-maquinas ou redes-sociais), ou rode o OpenCode
   dentro dela com o modelo de pedido abaixo.
3. **Conferir e preparar a integração** (grava o que ficou sem commit, aplica o perfil do ramo, valida):
   ```powershell
   powershell -File scripts/integrar-tarefa-ia.ps1 -Tarefa maquinas-redutor-sew-r
   powershell -File scripts/integrar-tarefa-ia.ps1 -Tarefa maquinas-redutor-sew-r -AbrirPR   # envia e abre o PR
   ```
   Arquivo fora da área do agente, arquivo protegido, `.env`/backup, dependência nova ou senha: a integração para.
4. **Depois do merge, limpar:**
   ```powershell
   powershell -File scripts/limpar-tarefas-ia.ps1             # mostra o que seria removido
   powershell -File scripts/limpar-tarefas-ia.ps1 -Confirmar  # remove só as tarefas já integradas e sem pendências
   ```

O coordenador (Claude Code) revisa cada PR, roda os roteiros de navegador quando preciso e você aprova o merge.

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

## Tarefas para o OpenCode
As tarefas iniciais (captura da Criticidade, docs retirados, testes da criticidade) já foram feitas e integradas em
01/11/2026. Para novas tarefas, use os itens "Pronto" da fila do coordenador (`.github/prompts/coordenar.prompt.md`)
que não mexem em arquivos protegidos.

## Agentes e prompts prontos

| Para quê | Onde usar | Arquivo | Saída |
|---|---|---|---|
| Desenvolver um item da fila por vez | Codex (nuvem), Claude Code ou Copilot (modo agente) | `.github/prompts/coordenar.prompt.md` | PR para você aprovar |
| Cadastrar máquinas reais, com você | Copilot → agente **banco-maquinas**, ou `/alimentar-banco-maquinas` | `.github/agents/banco-maquinas.agent.md` | Proposta em `propostas-maquinas/` |
| Criar conteúdos de redes sociais, com você | Copilot → agente **redes-sociais**, ou `/redes-sociais`; ou cole o arquivo no ChatGPT | `.github/agents/redes-sociais.agent.md` | Rascunhos em `divulgacao/` |

Os mesmos atalhos existem como prompts (`.github/prompts/*.prompt.md`) e como skills do Copilot (`.github/skills/`).

### Banco de máquinas: do manual ao modelo preenchido
1. No Copilot, escolha o agente **banco-maquinas** e diga a máquina (fabricante e modelo) e a fonte (manual, revisão e data).
2. O agente propõe uma seção por vez: identificação, componentes, tarefas, modos de falha, checklist, peças e fontes.
   Você confirma cada uma.
3. Ele grava a proposta em `propostas-maquinas/` e roda o validador. Os campos já correspondem às colunas dos modelos
   002 (Plano e MFMEA), 005 (Checklist) e 010 (Peças críticas).
4. Peça ao Claude Code: "integre a proposta propostas-maquinas/<arquivo>.json".
5. Quando o item 14 da fila estiver pronto, o usuário escolhe a máquina e baixa o modelo preenchido em Excel, Word ou PDF.

### Redes sociais: um conteúdo por vez
1. No Copilot, escolha o agente **redes-sociais** e informe o canal, o pilar e o objetivo.
2. Escolha um entre três ganchos e aprove o texto, as peças visuais e o checklist.
3. O rascunho fica em `divulgacao/rascunhos/` e a linha em `divulgacao/calendario.md`. Quem publica é você.

### Codex: configuração (uma vez)
- GitHub: conecte o repositório, com permissão para criar ramos e PRs. O merge continua com você.
- Internet: ligada só na preparação. Segredos: nenhum. Variável de ambiente: `PCM_SEM_SANDBOX=1`.
- Script de preparação:
  ```bash
  npm ci
  npm ci --prefix ferramentas/navegador
  node ferramentas/navegador/node_modules/playwright/cli.js install --with-deps chromium
  sudo apt-get update && sudo apt-get install -y postgresql
  ```
- Em cada tarefa, cole `.github/prompts/coordenar.prompt.md` e escreva "Faça o item N". Não conecte Supabase, Drive,
  Notion nem Figma ao Codex.

## Se algo der errado
- A ferramenta mexeu em arquivo protegido ou "quebrou" testes: não integre. Peça para desfazer ou apague a pasta da tarefa.
- Dúvida de manutenção (regra técnica, indicador, norma): a decisão é sua; a IA não deve inventar.
