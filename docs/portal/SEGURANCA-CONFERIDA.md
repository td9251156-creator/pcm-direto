# Conferência de segurança — 04/11/2026

Escopo: metadados do Supabase real, comparação de funções e auditoria das dependências instaladas. Não foram lidas mensagens privadas, e-mails ou registros operacionais. Não houve mudança de esquema, permissões, moderadores ou configuração do Auth nesta conferência.

## Conversas por material

- Quatro tabelas em `comunidade_pcm` com RLS habilitado; `anon` e `authenticated` sem SELECT/INSERT/UPDATE/DELETE diretos.
- Dez funções privadas comparadas à migração do repositório, normalizando somente espaços: todas iguais ao código exercitado nos testes. `search_path` vazio.
- Nove wrappers públicos `SECURITY INVOKER`. Visitantes podem executar somente disponibilidade, resumo e listagem pública; as operações de participação exigem conta e os guards internos de autoria/moderação.
-19 assuntos, participação ativa e uma conta moderadora. Visitantes e contas comuns não podem alterar diretamente a lista de moderadores. Não foram consultados nomes ou e-mails dessa conta.
- A projeção da leitura pública não contém `autor_id`, e-mail ou nonce; denúncias não têm permissão de leitura anônima.

A identidade do SDK, duas contas fictícias, autoria, moderação, retirada, denúncias, quotas e troca de sessão são exercitadas pelos roteiros locais. O mantenedor confirmou entrada real, envio/aprovação/retirada e, depois da correção do callback, entrada da conta participante sem a fila de moderação. A autorização completa entre contas reais comuns continua pendente; nenhuma sessão real foi simulada como se fosse uma pessoa autenticada.

Para a conferência humana de isolamento, use contas comuns suas em perfis/janelas separados e uma conta moderadora separada. Uma conta moderadora pode ver a fila por projeto: isso não deve ser confundido com uma conta comum vendo mensagens de outra pessoa. Use mensagens fictícias, não compartilhe tokens/links de acesso e registre quais ações foram realmente executadas.

## Advisors — avisos preservados

| Aviso observado | Situação |
|---|---|
| RLS sem políticas em quatro tabelas privadas | Intencional nesta arquitetura: acesso direto revogado e operações por RPC com guardas. Não é RLS isoladamente que comprova autorização. [Referência](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). |
| Função privilegiada pública acessível a visitante | `catalogo_e_moderador` é do catálogo legado e consulta a identidade autenticada. O advisor permanece; não foi marcado como corrigido nem teve grant removido às cegas. [Referência](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). |
| Onze funções privilegiadas públicas acessíveis a contas | Superfície do catálogo legado, distinta dos wrappers novos. Requer acompanhamento das guardas e evolução separada; nenhum aviso foi silenciado. [Referência](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). |
| Proteção contra senhas vazadas desativada | Configuração privada do provedor não foi alterada. O fluxo do portal usa link por e-mail, mas isso não resolve ou oculta o aviso global do Auth. [Referência](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). |

## Dependências

`npm audit --json` encontrou **uma advisory moderada**, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), propagada a 12 pacotes da árvore instalada por `minimatch`. Nenhum aviso alto ou crítico foi retornado nessa consulta.12 pacotes afetados não significam12 falhas independentes.

A recomendação automática incluía downgrades incompatíveis de ExcelJS/ESLint. Ela não foi aplicada. ExcelJS 4.4.0 era a versão mais recente consultada; atualizar apenas o ESLint para 10.14.0 ainda usaria minimatch 10, dentro da faixa indicada pela advisory. Não foram adicionados overrides entre versões principais sem avaliar compatibilidade.

Triagem de alcance: o app resolve ExcelJS para `dist/exceljs.min.js`, a entrada de navegador que não usa a cadeia Node de archiver/glob. Os marcadores de minimatch/globparts/readdir-glob/archiver-utils não aparecem nesse bundle; os controles de arquivos do app usam leitores de XLSX, não padrões glob enviados ao servidor. As ferramentas Node locais e o lint continuam no escopo da advisory. Essa análise de alcance não é prova de ausência de vulnerabilidades nem zera a auditoria. O acompanhamento das versões corrigidas permanece necessário; o relatório público não contém payload de exploração.

A prévia não deve ser anunciada como auditada integralmente, certificada ou livre de vulnerabilidades. O canal privado de relato permanece em [SECURITY.md](../../SECURITY.md).
