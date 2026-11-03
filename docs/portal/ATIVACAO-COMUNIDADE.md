# Conversas por material — implantação pendente

## Estado desta entrega

Interface integrada no PR #68. Migração aplicada ao projeto real após autorização do mantenedor: 19 assuntos conferidos, quatro tabelas com RLS e sem SELECT direto para `anon`/`authenticated`; RPC público de configuração respondeu `false` como visitante. **Participação permanece desativada.** Allowlist do Auth, entrega de e-mail e moderação entre contas reais ainda não foram conferidas.

Os advisors após a migração indicaram quatro avisos informativos de RLS sem políticas no esquema privado: comportamento intencional, com acesso direto revogado e projeções/autorização feitas por RPC. Os avisos sobre funções privilegiadas públicas do catálogo antigo e proteção contra senhas vazadas permanecem separados; não foram silenciados nem declarados corrigidos.

A revisão dos advisors do projeto real foi somente leitura e não equivale a uma aprovação da migração nova. Há avisos legados a triar separadamente; nenhuma alteração automática foi feita para silenciá-los.

## Estruturas e autorização

- Migração `supabase/migrations/20261102225245_comunidade_materiais.sql`, criada pelo Supabase CLI 3.0.0.
- Esquema privado `comunidade_pcm`: assuntos, comentários, denúncias e configuração. Não expor esse esquema no Data API.
- Nenhuma dependência das tabelas da Biblioteca v2 ausentes em produção. Os assuntos usam os códigos PCM-MAN-001 a 019; revisão do arquivo não muda a conversa.
- RLS habilitado e acesso direto às tabelas revogado. Os RPCs públicos são `SECURITY INVOKER`; funções privilegiadas ficam no esquema privado, com `search_path` vazio, guards de conta/autoria/moderação e projeções explícitas. Isso permite serializar quotas e ocultar identificadores de conta, sem expor funções privilegiadas diretamente no schema público.
- Nenhuma consulta pública retorna e-mail, `autor_id` ou nonce. A sessão é a do login existente; a moderação usa `catalogo_moderadores`, sem confiar em metadados editáveis do usuário.
- Conta com e-mail confirmado para enviar. Comentários: 5 por hora e 20 por dia por conta; até 2.000 caracteres, apelido até 60, 50 respostas por pergunta e um nível de resposta. Denúncias: até 10 por dia e motivo de até 500 caracteres.
- Envios idempotentes por conta/nonce. Retirar a mensagem apaga texto/apelido e preserva o registro privado mínimo para quotas e vínculos. Ocultar ou retirar uma pergunta também impede a leitura pública de suas respostas.
- Escrever em conversa não envia TAGs, inventário ou backups automaticamente. Somente campos digitados no formulário são enviados.

## Verificações locais

`node scripts/verificar-comunidade-materiais-banco.mjs`: PostgreSQL em memória, contas fictícias, visitante, proprietário, outra conta, moderador e e-mail não confirmado; testa grants, autoria, moderação, limites horários/diários, máximo de respostas, retry idempotente, retirada, denúncias privadas e paginação.

O roteiro de navegador usa o SDK real com respostas de rede simuladas. Testa formulário, retorno ao assunto, troca/renovação de sessão, refresh com envio pendente, ciclo `pagehide/pageshow` simulado, moderação, denúncia, retirada e falha online sem bloquear downloads. Não envia e-mails reais nem valida o provedor de e-mail em produção.

Não foi realizado teste de carga concorrente em PostgreSQL hospedado. O código serializa quotas com advisory lock por conta e respostas com bloqueio da pergunta; essa construção foi revisada, mas não apresentada como benchmark de produção.

## Procedimento após aprovação da implantação

1. Migração adicional já aplicada; ela não altera o catálogo antigo e permanece com `ativo=false`. Conferir novamente a configuração antes da ativação.
2. Conferir grants/RLS e assinaturas das funções realmente instaladas. Executar os advisors e triar os resultados; não adicionar o esquema privado à API nem conceder SELECT direto às tabelas para resolver erros.
3. Autorizar no Auth as URLs exatas de retorno em `https://pcmdireto.me/comunidade/acesso/`, incluindo os parâmetros `assunto` previstos. A lista está em `retornos-auth.txt`. Evitar globstar amplo em produção, conforme a documentação oficial de redirect URLs.
4. Conferir login e retorno ao material, e testar duas contas e a moderação em ambiente autorizado. Não criar contas ou disparar e-mails reais sem instrução do mantenedor. Verificar que não há leitura de pendências, retirada ou decisão de outra conta.
5. Somente após a conferência, ativar explicitamente como administrador:

```sql
update comunidade_pcm.configuracao set ativo=true where id=true;
```

Para pausar novas conversas, definir `ativo=false`. Páginas recém-abertas deixam de carregar a participação; leitura/downloads dos materiais continuam. Os RPCs de retirada e moderação continuam autorizados para seus papéis durante a pausa, mas a interface inicial não oferece login enquanto pausada. Solicitações de remoção também podem ser encaminhadas a pcmdireto@gmail.com.

## Pendências humanas

Entrega real do e-mail/PKCE, allowlist do Auth, moderação com contas reais e comportamento BFCache em aparelhos reais. A validação de uso com pessoas segue adiada. Não anunciar conversas como ativas antes dessas verificações.

Fontes oficiais consultadas: https://supabase.com/changelog.md , https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/docs/guides/auth/redirect-urls .
