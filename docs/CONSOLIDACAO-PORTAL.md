# Consolidação do portal — 04/11/2026

Direção: encontrar um modelo, entender, aplicar na rotina e conversar sobre o assunto. Software e biblioteca continuam gratuitos e públicos, sob MIT. Dados operacionais, identificação do IndexedDB, backups e revisões R00 dos arquivos foram preservados.

## Situação dos seis pontos

| Ponto | Realizado | Limite ou próximo passo |
|---|---|---|
| Percurso completo | Catálogo, busca consistente, orientação, download, contexto no app, índice e compartilhamento; falha real de atualização/offline corrigida no PR #81 | Chromium em quatro larguras e teclado são testes automáticos; celular físico, leitor de tela e instalação pelo sistema ainda precisam de conferência humana. |
| Comunidade | Conferência somente leitura do servidor, dez funções iguais ao código testado, nove wrappers invoker,19 assuntos, tabelas sem acesso direto e moderador único | Entrada/envio/aprovação/retirada já confirmados pelo mantenedor. Isolamento completo entre contas reais comuns ainda não comprovado. [Relatório](portal/SEGURANCA-CONFERIDA.md). |
| Guias | OS, semana, falhas/Pareto e plano preventivo incluídos como orientações editoriais; textos conferidos contra o catálogo e funções do app | A publicação autorizada não é validação técnica humana. [Textos para conferência](portal/REVISAO-GUIAS.md). |
| Versão de referência | Versão 0.1.0-preview.1, changelog e notas preparados; release deve apontar ao commit integrado com CI aprovado | O estado efetivo, SHA e arquivos publicados ficam em [Versões](https://github.com/td9251156-creator/pcm-direto/releases). Não é versão estável/certificada. |
| Divulgação | 16 slides PNG 1080×1350, quatro PDFs LinkedIn, legendas, textos alternativos, perfis e kit ZIP preparados | Nenhuma postagem ou alteração dos perfis foi feita: esta sessão não tem acesso conectado a LinkedIn/Instagram. [Kit e roteiro](../divulgacao/portal/README.md). |
| Medição | CSV sem números inventados, agenda por D0/D7/D14/D21/D28 e instrução de Search Console | Propriedade/verificação e estatísticas dependem da conta do mantenedor. Sem rastreamento acrescentado ao app. [Medição](../divulgacao/portal/MEDICAO-28-DIAS.md). |

## Evidências e distinções

A correção offline parte de `c355ad5dc17c319c3928b1d8f1c50c5988ca889c` e foi integrada em `eb912ddc0a8118e0f8d7afa40aa6dface400b915` pelo PR #81. O cenário de duas publicações falhou antes por falta do JS novo offline; passou após a correção. Novos testes cobrem ausência de cache, quota, limite, Authorization fora, rascunho e ativação normal.539 testes/66 arquivos e 28 roteiros passaram nessa entrega; a conferência final da prévia deve ser registrada no PR da release, associada ao seu commit.

O LibreOffice disponível é **LibreOfficeDev 26.8.0.0.alpha0**. Os 20 arquivos originais (19 modelos + procedimento) e 19 cópias preenchidas com dados fictícios abriram e exportaram a primeira página. Os arquivos de entrada mantiveram seus hashes. Duas capturas de originais (004 e 018) foram inspecionadas. Isso não comprova todas as páginas, fórmulas, editores ou revisão humana. [Evidências por arquivo](portal/EVIDENCIAS-OFFICE.json). Não foram introduzidas prévias PDF na biblioteca pública.

A tentativa adicional de WebKit não foi executada: o download do navegador completou, mas faltaram bibliotecas do sistema e a instalação não tinha permissão administrativa. Não foi apresentada como teste Safari/iPhone. Não foram solicitadas senhas ou alterações de permissão do usuário.

## Atualizar sem perder trabalho

Termine o trabalho, baixe um backup e feche todas as abas e a janela instalada do PCM Direto. Abra novamente. Não limpe dados do navegador. A correção só passa a valer após ativar o novo worker normalmente; não modifica retroativamente um worker antigo ainda ativo. Os limites de 20 páginas públicas e 80 assets de atualização são deliberados; conteúdo removido precisa de conexão para voltar a ser guardado.

## O que não foi declarado concluído

- Testes em aparelhos físicos, leitor de tela, BFCache real e Excel/Word.
- Auditoria completa de autenticação com duas contas reais comuns. Comparar funções e permissões não substitui esse fluxo.
- Atualização de perfis, postagem nas redes, propriedade Search Console ou coleta de estatísticas.
- Validação de uso com pessoas, que continua adiada, ou comprovação de crescimento/retorno.
- Selo OpenSSF, elegibilidade em programas ou ausência absoluta de falhas.

Os avisos de dependências e do Supabase estão identificados no relatório de segurança. Não foram silenciados para produzir um resultado “limpo”.

## Verificação da preparação final

`npm run verificar` aprovado com `VITEST_MAX_WORKERS=1`: lint, 540 testes em 66 arquivos e build. Os 28 roteiros de `npm run test:navegador` passaram com os quatro guias; regressão específica de portal também passou após o ajuste para futuros rascunhos. Revisões independentes somente leitura do portal e da documentação/kit sem bloqueadores após ajustes. A correção #81 foi conferida no domínio publicado: modelo offline e saída clicável para o app, sem erros JavaScript nesses fluxos. O CI do commit final e a conferência da publicação são registrados no PR da preparação e nas notas da release.
