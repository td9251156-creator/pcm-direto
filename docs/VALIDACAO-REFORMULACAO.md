# Validação da reformulação

Registro de 24/10/2026. Somente testes realmente executados são evidências de entrega.

O mantenedor autorizou publicar uma **versão de teste** no domínio atual antes da liberação
final. O aplicativo exibe esse estado e orienta backup. Essa autorização não representa
aprovação dos documentos ou conclusão dos testes humanos listados abaixo.

## Executado

- `npm ci` e instalação do Chromium fixado da ferramenta de navegador.
- `npm run verificar`: lint, **188 testes** e build aprovados no Windows/Node 26.
- Cenário de lógica: 100 ativos, 31.200 ocorrências diárias/semanais em um ano, duas revisões,
  histórico semestral preservado e realizado mensal sem duplicações aprovado.
- Revisão complementar somente leitura de Codex: preservação, transação concorrente real no
  Chromium, vínculos de ocorrências e duplicidade, migração/restauração, execução e OOXML.
  Achados corrigidos: TAG histórica da falha, duplicatas semânticas, vínculos trocados,
  registro de ocorrência, default de execuções no legado e marcadores Word divididos.
- Projeto Supabase conferido antes da alteração: tabelas de modelos/moderadores existentes,
  RLS habilitada. Migração aditiva de interações aplicada com sucesso; sem dados fictícios
  inseridos no projeto real. RPCs de escrita restritas ao papel authenticated e verificam usuário.

## Navegador aprovado

O roteiro `npm run test:navegador` cobre comunidade inicial/claro, migração v1, exemplo isolado,
cadastros, criticidade, capacidade e teclado, importação inválida, revisão, execução e cancelamento,
falha sem parada, backup, seis documentos sem rede, concorrência e recuperação de corrupção.
A execução completa passou. Inclui restauração v1 sem execuções sem herdar histórico, retorno
ao backup v3 e quota simulada com aborto da transação sem alterar o registro persistido.
Imagens e desenhos dos arquivos gerados foram comparados byte a byte com os originais.
Não houve erro de página no contexto principal.

## Limites e pendências de liberação

- Revisão de Claude Code, teste com três técnicos e celular real não executados.
- Figma bloqueou chamadas pelo limite da conta; arquivo criado ainda não contém propostas editáveis.
- Publicação de protótipo Sites e liberação do GitHub Pages ainda não verificadas.
- Conferência visual no Excel/LibreOffice e impressão ainda pendentes. ZIP válido, fórmulas
  preservadas e imagens idênticas não substituem abertura e conferência nesses programas.
  `render_docx.py` foi executado e informou ausência de `soffice.exe` no ambiente.
- Cenário de uso completo de 100 ativos na interface, histórico anual e atualização da PWA
  com aba antiga ainda exige evidência específica; o teste de lógica não substitui esse uso real.
- Fluxo autenticado de publicação/interações entre aparelhos precisa teste com contas de teste
  autorizadas; não usar a conta nem o conteúdo real do mantenedor para simular interações.
- Auditor do Supabase aponta funções SECURITY DEFINER acessíveis por papéis autorizados:
  é deliberado para operações validadas por RPC; revisar as verificações ao mudar o esquema.
  A visão agregada pública usa SECURITY INVOKER e função de agregação em esquema privado,
  expondo somente contagens de modelos aprovados, sem autores das curtidas. Após a correção,
  o auditor não retornou erro de visão SECURITY DEFINER. Consulta anônima e bloqueio da RPC
  de escrita anônima foram conferidos com transação revertida, sem conteúdo inserido.
  Proteção contra senhas vazadas é configuração de Auth a conferir; o cliente usa link por email.

Referências do auditor: [funções autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
