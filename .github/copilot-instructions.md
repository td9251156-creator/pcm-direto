# Instruções para o GitHub Copilot

Siga o AGENTS.md e leia os documentos obrigatórios antes de trabalhar. Explique resultados e decisões em português simples.

- Preserve o trabalho existente; use um ramo por tarefa e respeite a lista de arquivos permitidos.
- Trabalho paralelo depende de autorização do mantenedor e de listas de arquivos sem sobreposição. A revisão independente cabe a outro agente. O integrador atualiza docs/FILA.md e docs/MELHORIAS.md depois dos merges.
- Mantenha HTML, CSS e JavaScript simples e a licença MIT. Não acrescente dependências sem autorização.
- Preserve dados locais, rascunhos e backups antigos; não descarte dados danificados silenciosamente. Não acrescente servidor, login, analytics ou rastreamento, nem envie dados operacionais.
- Use português do Brasil na interface, mensagens, comentários e documentação, com dados fictícios em exemplos e testes.
- Não invente regras técnicas, periodicidades, indicadores ou normas. Preserve travas de segurança, avisos, logo, acessibilidade, teclado e celular.
- Não altere modelos PCMD sem autorização. Não divulgue credenciais ou dados reais.
- Para erros, primeiro reproduza com teste que falha. Não enfraqueça testes.
- Execute `npm ci` e `npm run verificar`. Para telas, dados, offline ou arquivos gerados, execute também `npm run test:navegador`, conforme docs/TESTES-NAVEGADOR.md. Informe a saída real e o que não foi conferido.
- PRs devem explicar Antes, Depois, Como testar e Riscos, com evidências da revisão independente. Não faça merge, push na main ou publicação sem autorização explícita.
