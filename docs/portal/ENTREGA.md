# Portal de manutenção prática — implementação consolidada

Direção: encontrar um modelo, entender como usar, aplicar na rotina e trocar experiências sobre o assunto. Continuação da fundação e do catálogo do PR #67, já integrado à main. Esta entrega acrescenta guias, continuidade no app, conversas e distribuição no ramo `coord/completar-portal-manutencao`; **não significa integração, publicação ou ativação automática dessas novas partes**.

| Área | Implementado | Verificação / pendência |
|---|---|---|
| Portal e catálogo | Quatro necessidades, busca completa e páginas dos 19 modelos, com originais intactos | Leitura sem JS, teclado, quatro larguras, zero abertura de base e offline com cache pronto |
| Orientação | Primeiro preenchimento e exemplo fictício em cada material | Conteúdo editorial; revisão técnica humana permanece separada |
| Aprender | Índice público e guia aprofundado de OS | Outros três guias completos como rascunhos `publicado:false`, sem páginas/links públicos até revisão técnica |
| Aplicar | Capacidades específicas para 002/004/008/011; outros arquivos distinguem cadastros/texto da equipe | Parâmetro `modelo` validado pelo catálogo, intenção em memória e retorno ao material, sem gerar/alterar por abrir link |
| Comunidade — servidor | Assuntos por código, moderação prévia, contas confirmadas, respostas em um nível, retirada, denúncias e limites | Migração local testada; **produção não migrada nem ativada** |
| Comunidade — interface | Leitura pública sob demanda, login contextual, participação, “minhas”, moderação e denúncias privadas | SDK com API simulada; e-mail e permissões reais dependem de implantação autorizada |
| Privacidade | Projeções sem IDs privados/e-mail; sem anexos, mensagens privadas, notificações, pontos ou tracking | Conta/rascunho limpos ao trocar usuário ou sair/retornar; token fixado por operação privada |
| Descoberta | Títulos, descrições, canonical, prévias sociais, sitemap, robots e 404; app/recuperação/callback fora do sitemap e com noindex | Indexação no Google não foi confirmada nem sitemap enviado pelo mantenedor |
| Distribuição | Perfis, fixada, quatro conjuntos de conteúdo, quatro carrosséis com 16 slides e base de métricas | Rascunhos; nenhuma alteração/postagem nas redes, valores não medidos não são zero |

## Continuidade e limites

A intenção do modelo não entra na base ou no backup; o usuário continua o assistente no passo existente e escolhe executar as ações. Existe qualquer revisão, inclusive futura: o acesso aponta para a capacidade correspondente. A demonstração permanece isolada e a saída recalcula a orientação usando os dados reais.

Biblioteca de máquinas, dados, revisões, arquivos Office e backend do catálogo legado preservados. As novas conversas não dependem da Biblioteca v2 do servidor; indisponibilidade da comunidade não impede conteúdo, download ou operação local.

O cache obrigatório mantém o núcleo do app e os pequenos assets versionados. O crescimento de páginas editoriais fica no cache público visitado, limitado a 20 navegações. Callback e respostas de autenticação não entram nesse cache. Atualização continua esperando liberar as abas antigas.

## Verificado nesta entrega

Lint, 495 testes/64 arquivos e build aprovados. Os 24 roteiros de navegador/banco passaram, incluindo a simulação das APIs de comunidade e dos eventos de retorno de página. Revisão independente de código concluída sem bloqueadores após as correções. Nenhuma dessas evidências é apresentada como teste de Auth ou de permissões novas em produção.

## Como conferir

- `npm run verificar` para lint, testes e build.
- `node scripts/conferir-entrega-ia.mjs`.
- `npm run test:navegador`, incluindo os dois roteiros novos de banco e portal completo.
- `npm run preview`: `/modelos/`, `/guias/`, `/comunidade/`, páginas de materiais e `app.html?modelo=PCM-MAN-004#inicio`.
- Revisão visual e editorial dos rascunhos de divulgação em `divulgacao/portal/`.

O teste de lifecycle usa eventos BFCache simulados, sem afirmar conferência em todos os aparelhos reais. Os testes de comunidade não validam entrega real de e-mail ou configuração de produção. Consulte [Ativação da comunidade](ATIVACAO-COMUNIDADE.md).

## Próximas decisões após revisão

Autorizar integração/publicação e, separadamente, a migração/ativação da comunidade; revisar os três guias em rascunho para publicação gradual. Em seguida, o mantenedor poderá publicar o conteúdo orgânico preparado e iniciar uma comparação de 28 dias. Sem métricas confirmadas ou validação de uso, não há alegação de aumento de público ou retorno ao app.
