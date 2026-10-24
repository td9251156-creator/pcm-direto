# Política de segurança

## Versões cobertas

Apenas a versão mais recente publicada no GitHub Pages recebe correções.

## Como relatar uma vulnerabilidade

Envie um e-mail para **pcmdireto@gmail.com** com:

- descrição do problema;
- passos para reproduzir;
- impacto possível.

Não abra *issue* pública para vulnerabilidades antes de uma correção estar disponível.
O projeto é mantido de forma voluntária: a resposta é feita assim que possível, sem prazo garantido.

## Escopo

A operação da fábrica roda no navegador, com dados em IndexedDB e backups locais.
A comunidade usa Supabase para conta e conteúdo explicitamente publicado. TAGs, pessoas,
falhas e histórico operacional não são enviados automaticamente. O cliente usa apenas chave pública;
a autorização depende de RLS e funções que conferem auth.uid(). Comentários aguardam moderação;
denúncias são privadas. Dependências também fazem parte do escopo.
