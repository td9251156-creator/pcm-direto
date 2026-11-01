# Instruções para o GitHub Copilot

Siga o AGENTS.md (regras do produto, papéis das ferramentas e arquivos protegidos). Explique resultados e decisões em
português simples; o mantenedor é especialista em manutenção, não programador.

## No editor
- Ajustes pequenos e testes simples, no estilo do arquivo aberto. JavaScript puro com Vite, sem frameworks e sem
  dependências novas. Textos da interface e comentários em português do Brasil, com acentos.
- Não altere os arquivos protegidos listados no AGENTS.md (armazenamento, backup, importação, geradores OOXML,
  manifesto e arquivos da Biblioteca PCM v2, Supabase). Proponha a mudança em texto se ela for necessária.
- Use apenas dados fictícios. Nunca inclua credenciais, dados reais da fábrica ou backups.
- Não invente regras técnicas, periodicidades, indicadores ou normas. Preserve travas de segurança, avisos, logo,
  acessibilidade, teclado e celular. Só modelos PCM-MAN da Biblioteca v2; não reintroduza PCMD.
- Para erros, primeiro um teste que falha. Não enfraqueça testes. Antes de propor PR: `npm run verificar`
  (e `npm run test:navegador` para telas, dados, offline ou arquivos gerados), informando a saída real.

## Na revisão de PR
Aponte, com arquivo e linha: bug de correção, perda ou corrupção de dados (rascunho, backup, IndexedDB), quebra de
compatibilidade com backups antigos, exposição de dados ou credenciais, regressão de acessibilidade, teclado ou celular,
texto sem acento ou em outro idioma e alteração de arquivo protegido sem justificativa. Ignore preferências de estilo.

PRs explicam Antes, Depois, Como testar e Riscos. Não faça merge, push na main ou publicação sem autorização explícita.
