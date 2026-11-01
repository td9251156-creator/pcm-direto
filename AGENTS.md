# Instruções para agentes do PCM Direto

O PCM Direto gera plano de manutenção, cronograma, planilha e documento em português.
O mantenedor é especialista em manutenção industrial e não é programador. Explique resultados,
decisões e descrições de PR em português simples, indicando o que muda para quem usa.

## Antes de trabalhar

1. Leia `README.md`, `DECISOES.md`, `ROADMAP.md`, `CONTRIBUTING.md` e `SECURITY.md`.
2. Consulte a tarefa atual em `docs/FILA.md`, a estratégia em `docs/EVOLUCAO-CONTINUA.md`
   e o histórico em `docs/MELHORIAS.md`. Leia `BIBLIOTECA.md` se houver conteúdo técnico.
3. Confira o estado do Git e preserve arquivos, alterações e trabalho preexistentes.
4. Use o checkout existente. Cada tarefa na nuvem já é isolada; não crie worktrees sem pedido explícito.
5. Defina um resultado pequeno, como verificá-lo e quais arquivos poderão mudar.

Prossiga com o trabalho rotineiro já autorizado, incluindo inspeção, correções reversíveis, testes
e preparação de PR. Não repita pedidos de confirmação para decisões já respondidas. Uma dúvida
de manutenção bloqueia apenas o trecho que depende dela; avance no restante autorizado.

## Regras do produto

- O app roda no navegador, sem servidor próprio, analytics ou rastreamento. Nenhum dado do usuário sai do navegador.
  A única exceção é o catálogo público da comunidade (e, quando autorizado, a Biblioteca v2) no Supabase, que guarda
  apenas conteúdo público, nunca dados operacionais. Não acrescente API ou serviço pago.
- Mantenha HTML, CSS e JavaScript simples, sem framework, TypeScript ou reescrita grande.
  Só acrescente dependência se indispensável e com licença compatível com MIT.
- Interface, mensagens, comentários e documentação devem ser em português do Brasil.
- Mantenha a licença MIT. Em exemplos e testes use apenas dados fictícios. Os únicos dados
  pessoais permitidos são o nome do autor, o LinkedIn existente e `pcmdireto@gmail.com`.
- Tarefas de segurança não podem ser removidas, desmarcadas como segurança ou afrouxadas pelo usuário.
  Preserve as travas na interface, na lógica e ao reabrir ou importar dados.
- Preserve o aviso discreto no rodapé, no README e nos arquivos gerados. Não prometa conformidade,
  aprovação em auditoria ou ganhos garantidos.
- Não cite número de norma sem fonte oficial, versão e data. Não invente regras técnicas:
  tarefas novas ou alteradas precisam de origem e versão; uma base genérica deve ser identificada
  como `base genérica a validar com manual do fabricante`.
- Preserve o logo e os ícones. As cores da marca ficam em `src/marca.js`; siga os testes de consistência.
- Preserve compatibilidade dos rascunhos e backups antigos. Uma migração precisa de teste;
  dados danificados não podem ser descartados silenciosamente.
- A planilha deve continuar usando funções clássicas, sem macros ou matriz dinâmica.
  Mantenha teclado, leitor de tela e celular como requisitos.

## Coordenação entre agentes

Quando o mantenedor autorizar trabalho paralelo, agentes diferentes podem implementar ao mesmo tempo apenas em tarefas com listas de arquivos permitidos que não se sobreponham; cada tarefa usa ramo próprio; docs/FILA.md e docs/MELHORIAS.md só são atualizados pelo integrador depois dos merges; o revisor independente é sempre outro agente, nunca quem implementou.

Mantenha **uma implementação por vez**. O coordenador pode delegar diagnósticos delimitados
e uma revisão independente em paralelo, sem autorizar agentes diferentes a editar os mesmos arquivos.

Cada delegação informa: tarefa, resultado esperado, arquivos permitidos, verificações, restrições
e se o trabalho é somente leitura. O coordenador confere os resultados antes de integrá-los.
O agente que implementou não substitui o revisor independente.

O revisor procura falhas concretas de comportamento, perda de dados, segurança, acessibilidade,
compatibilidade e escopo. Registra arquivo, situação que causa o problema, impacto e evidência.
Não declare revisão independente se ela não aconteceu; registre essa limitação no PR.

## Implementação e validação

- Crie um ramo por assunto. Prefira PR pequeno baseado na `main` atual; evite cadeias longas
  de PRs dependentes. Separe mudanças sem relação e não faça push direto na `main`.
- Para um erro, primeiro reproduza e acrescente um teste que falhava antes. Toda regra nova
  em `src/logica/` deve ganhar teste relevante. Não desative testes ou verificação de integridade.
- Instale respeitando o lockfile: `npm ci`. Neste ambiente, se o cache padrão não for gravável,
  use `npm ci --cache /workspace/.npm-cache`.
- Rode `npm run verificar` para conferir código, testes e build. Se falhar, investigue a causa,
  corrija e repita as verificações afetadas. Não considere uma execução sem testes como aprovação.
- Para mudanças de tela, armazenamento, importação, offline ou exportação, rode também
  `npm run test:navegador`, seguindo `docs/TESTES-NAVEGADOR.md` para preparar o navegador.
  Registre separadamente o que não pôde ser executado.
- Ao alterar planilha ou documento, confira a geração, o conteúdo esperado e o aviso.
  Testar um arquivo ZIP válido não prova sozinho que todas as informações estão corretas.
- Atualize a fila e os documentos afetados pelo resultado. Não transforme histórico em promessa
  de funcionalidade entregue.

## Entrega e publicação

Descreva o PR com **Antes**, **Depois**, **Como testar** e **Riscos**, incluindo a tarefa e as
verificações realmente executadas. Informe o que ficou pendente, a decisão necessária e o próximo item.

Alterações de agentes não são integradas ou publicadas automaticamente. Testes aprovados não
substituem essa autorização. Se o pedido ou o contexto já autorizar integração e publicação,
execute pelo fluxo de PR, confira os resultados no GitHub e a publicação; não peça a mesma autorização
outra vez. A integração na `main` aciona o GitHub Pages.

Nunca divulgue credenciais ou dados reais em comandos, logs, testes ou relatórios. Siga `SECURITY.md`
para vulnerabilidades; não abra relato público com detalhes exploráveis antes da correção.

## Limites da automação

A rotina semanal do GitHub Actions verifica código e dependências. Ela não executa agentes de IA,
não modifica o produto e não abre PRs de implementação. Não prometa agentes trabalhando depois
do encerramento da sessão sem um executor persistente efetivamente configurado e verificado.

O fluxo separado de implementação no Actions está documentado em `docs/AGENTES-GITHUB-ACTIONS.md`.
As chamadas de IA pela API do Actions estão pausadas. Não reative a API nem sua agenda sem novo pedido.
O fluxo de API preservado no repositório gera PRs em rascunho e não integra ou publica sozinho.
O Actions continua executando testes e publicação.

## Ferramentas de IA usadas pelo mantenedor (papéis)

| Ferramenta | Papel | Ramo |
|---|---|---|
| Claude Code | Coordena e integra: geradores OOXML, armazenamento e backup, importação, banco, revisão final, verificação completa e preparo da publicação | `coord/...` |
| GitHub Copilot | No editor: ajustes pequenos e testes simples. No GitHub: revisão automática dos PRs | `ia/copilot/...` |
| OpenCode + DeepSeek | Tarefas mecânicas e delimitadas: textos, documentação, testes extras, scripts de conferência e capturas | `ia/opencode/...`, em `git worktree` separado |
| ChatGPT | Apenas consulta: procedimentos, opções e revisão de texto. Não edita o repositório nem os modelos | — |

- **Arquivos protegidos** (só o coordenador altera, com pedido explícito): `src/logica/gestao.js`, `src/estado.js`,
  `src/repositorio.js`, `src/logica/operacao.js`, `src/integracao/`, `src/saida/biblioteca-v2-*.js`,
  `src/dados/biblioteca-pcm-v2.json`, `public/modelos/**` e `supabase/**`.
- Nenhum dado da fábrica, backup real, chave ou `.env` vai para qualquer ferramenta de IA ou serviço externo.
- Toda entrega informa o ramo, os arquivos alterados, a saída real de `npm run verificar` e de`n  `node scripts/conferir-entrega-ia.mjs` e o que ficou pendente. Passo a passo para o mantenedor: docs/CONTRIBUIR-COM-IA.md.

## Direção atual: Gestão, comunidade e Biblioteca PCM v2

O plano aprovado está em docs/REFORMULACAO.md: interface B Gestão, comunidade como abertura e apenas tema claro.
O site e o app usam **somente** os modelos da Biblioteca PCM v2 (padrão PCM-MAN), em `public/modelos/biblioteca-v2/`,
conferidos por SHA-256 (`src/dados/biblioteca-pcm-v2.json`). Os modelos PCMD e "refeitos" foram retirados; não os
reintroduza. Preencha cópias OOXML integrais e preserve os originais; não renomeie abas, tabelas `tb_pcm_...` nem
campos da linha 4. Os modelos estão em desenvolvimento (R00): não mude a revisão sem pedido. Pendências e decisões
ficam em docs/FILA.md; o banco da biblioteca está descrito em docs/BANCO-BIBLIOTECA.md (não aplicado online).
Não prometa validação humana ou documental sem evidência.
