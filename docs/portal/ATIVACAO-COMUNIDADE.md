# Conversas por material — implantação e verificação

## Estado desta entrega

Interface integrada nos PRs #68 e #74. Migração aplicada ao projeto real após autorização do mantenedor: 19 assuntos conferidos, quatro tabelas com RLS e sem SELECT direto para `anon`/`authenticated`. **Participação ativa (`ativo=true`) com revisão prévia.**

Evidências separadas:

- **Conferência do servidor:** as dez funções privadas correspondem ao código testado; permissões diretas das tabelas continuam revogadas para visitantes/contas e novos comentários começam como `pendente`.
- **Informado pelo mantenedor:** cadastrou os Redirect URLs, recebeu o link e concluiu a entrada/retorno ao material, visualizou Fila de moderação e confirmou envio, aprovação e retirada da mensagem de teste.
- **Conferência pública sem login:** uma mensagem aprovada disponível no PCM-MAN-004; resposta sem os campos `email`, `autor_id` e `nonce`, sem abertura da base operacional nem envio de e-mail. Download original, teclado e larguras 320/390/820/1280 aprovados, sem erros JavaScript capturados nesses fluxos. Após a retirada informada pelo mantenedor, uma consulta com papel anônimo retornou zero mensagens públicas no material.
- **Ainda não conferido com contas/aparelhos reais:** autorização entre duas contas autenticadas distintas, ciclo BFCache e leitor de tela. Os cenários automáticos de autoria, moderação e retirada continuam sendo evidências separadas desses testes humanos.

A ativação foi realizada para a conferência do fluxo real pelo mantenedor após confirmar login e acesso à moderação. Não representa conclusão dos testes entre contas reais, validação de uso com pessoas ou garantia de ausência de falhas.

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

## Procedimento para futuras implantações e retomadas

1. A migração adicional já está aplicada e o serviço atual está ativo. Em uma implantação futura, a configuração nasce com `ativo=false`; conferir o código, as permissões e a configuração antes de ativar ou retomar.
2. Conferir grants/RLS e assinaturas das funções realmente instaladas. Executar os advisors e triar os resultados; não adicionar o esquema privado à API nem conceder SELECT direto às tabelas para resolver erros.
3. Autorizar no Auth as URLs exatas de retorno em `https://pcmdireto.me/comunidade/acesso/`, incluindo os parâmetros `assunto` previstos. A lista está em `retornos-auth.txt`. Evitar globstar amplo em produção, conforme a documentação oficial de redirect URLs.
4. Conferir login e retorno ao material, e testar duas contas e a moderação em ambiente autorizado. Não criar contas ou disparar e-mails reais sem instrução do mantenedor. Verificar que não há leitura de pendências, retirada ou decisão de outra conta.
5. Em uma implantação futura ou retomada, registrar o que foi efetivamente conferido e o que continua pendente antes de ativar explicitamente como administrador:

```sql
update comunidade_pcm.configuracao set ativo=true where id=true;
```

Para pausar novas conversas, definir `ativo=false`. Páginas recém-abertas mostram o aviso de novos envios pausados. O acesso por e-mail, Minhas mensagens, retirada e moderação permanecem disponíveis para seus respectivos papéis; formulários de envio, denúncia e a vista pública não são oferecidos. A pausa não substitui a autorização do servidor. Leitura/downloads dos materiais continuam. Solicitações de remoção também podem ser encaminhadas a pcmdireto@gmail.com.

## Conferir o acesso enquanto a participação está pausada

Roteiro para quando o serviço estiver pausado; não descreve o estado ativo atual.

1. No painel Supabase → Authentication → URL Configuration, mantenha as URLs existentes e acrescente as 20 linhas de `retornos-auth.txt` em Redirect URLs. Não use globstar amplo nem compartilhe chaves.
2. Abra `https://pcmdireto.me/modelos/pcm-man-004/#conversa`, clique em **Ver conversas** e use **Acessar minhas mensagens**. O aviso de pausa deve continuar visível; não deve haver formulário para publicar comentário.
3. Digite seu e-mail e peça o link. Abra-o no mesmo navegador. Após voltar ao material, clique em **Ver conversas** novamente: deve aparecer **Conta conectada**. Não envie senha, código ou link de autenticação ao mantenedor/agente.
4. Confira a própria lista e a opção de sair; só a conta moderadora deve ver a fila de moderação. Os testes automáticos usam contas fictícias e não comprovam entrega real de e-mail ou configuração do Auth.
5. Continue a conferência entre contas e da moderação prevista acima. A participação continua `ativo=false` até concluir as verificações; permitir login durante a pausa não a ativa.

A configuração do Auth exige acesso ao painel: o conector disponível nesta rodada permite consultas e migrações do banco, mas não altera Redirect URLs. O mantenedor informou que concluiu o cadastro dos retornos e confirmou o login real; não houve leitura automatizada da configuração privada do Auth.

## Retorno do link e conferência da segunda conta

O retorno da Comunidade exige a troca bem-sucedida do código daquele link pelo SDK. Uma sessão anterior não confirma um novo acesso. Código, identificador do fluxo e erros do provedor são retirados da URL; apenas o assunto válido permanece. O identificador do fluxo é preservado para a troca explícita. Um erro informa que é necessário solicitar outro link e abri-lo no contexto correto; não há logout automático de uma sessão já aberta.

Para testar uma conta participante, use outro e-mail seu em uma janela anônima. Se já houver uma conta conectada nessa janela, use **Sair desta conta** antes de pedir o novo link. Copie o link recebido e abra **nessa mesma janela anônima**, sem enviá-lo ao mantenedor/agente. As janelas normais compartilham a sessão do mesmo perfil; abrir o link na janela normal não testa a conta anônima.

O mantenedor relatou ver a fila ao testar outra conta. As consultas administrativas agregadas mostraram um único moderador e nenhuma permissão de escrita direta na lista para contas comuns. Isso não identifica qual sessão estava sendo usada no navegador nem conclui a causa específica do relato. O defeito reproduzido foi o callback aceitar uma sessão já aberta quando a confirmação do novo link falhava. O teste real da segunda conta continua pendente após a correção.

A verificação do perfil no portal também exige o booleano `true` do servidor, usa o token da conta conferida e ignora resultados de uma consulta que deixou de pertencer à tela/conta atual. As permissões do servidor não foram ampliadas nem substituídas por controles da interface.

## Pendências humanas

Autorização entre duas contas reais distintas; comportamento BFCache, aparelhos reais e leitor de tela. Entrega do e-mail/retorno e envio/aprovação/retirada foram confirmados pelo mantenedor, sem declarar auditoria completa da configuração do provedor. A validação de uso com pessoas segue adiada.

Fontes oficiais consultadas: https://supabase.com/changelog.md , https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/docs/guides/auth/redirect-urls .
