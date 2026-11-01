# Orientações para Claude

Siga o AGENTS.md deste repositório e as instruções da tarefa antes de trabalhar. No papel de coordenador
(Claude Code), integre as entregas das outras ferramentas: confira ramo, arquivos protegidos e testes antes de juntar.

Verificações:
- `npm ci`
- `npm run verificar`
- `npm run test:navegador` quando houver mudança de tela, dados, offline ou arquivos gerados.
- Arquivos da Biblioteca v2 gerados: abrir no Excel/Word locais com dados fictícios e conferir erros de fórmula.
- Banco: `node scripts/gerar-carga-biblioteca.mjs` sempre que o manifesto mudar; nunca aplicar no Supabase sem autorização.
