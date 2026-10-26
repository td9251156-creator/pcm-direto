# Continuidade do desenvolvimento do PCM Direto

Direção: uma fábrica com até 100 ativos, interface Gestão, dados operacionais locais, uso simples no celular e identidade visual do manual final. A publicação continua pelo fluxo de PR e CI autorizado pelo mantenedor. Este plano registra o que existe e o que ainda precisa ser comprovado; não é uma declaração de homologação.

## Base já implementada

| Frente | Resultado disponível |
|---|---|
| Cadastro e planejamento | Equipamentos por cadastro/importação, biblioteca com origem, capacidade, criticidade e revisões com prévia de impacto. |
| Rotina | Visão geral, ocorrências, conclusão/cancelamento preservando histórico, consulta de ativos e registro de falhas. |
| Documentos | Seis documentos ligados à revisão ativa, com corte e aprovação explícita; 18 modelos adicionais por finalidade e pacote do rascunho. Logo oficial nos editáveis, exemplos, prévias e arquivos gerados. |
| Dados | IndexedDB v3, migração, compatibilidade de backups, restauração com prévia, concorrência entre abas e recuperação. |
| Apoio | Comunidade, biblioteca de tarefas, guias locais e manual da marca. |
| Qualidade | Testes unitários, fluxos de navegador, geração offline, atualização da PWA e integridade dos templates. |

## Rodada de uso diário

1. Corrigir o avanço do assistente: uma gravação por etapa, confirmação após persistir, falha mantendo os campos e navegação sem resposta atrasada substituindo a tela.
2. Preservar o rascunho da organização durante a navegação na mesma sessão e permitir continuar por teclado.
3. Organizar Mais por Rotina, Planejamento, Documentos e Dados e apoio; busca por finalidade e distinção entre documentos da revisão e modelos do rascunho.
4. Verificar regressões, publicar por PR e conferir o resultado no site público.

Escopo desta rodada: sem migração, dependência nova, alteração de regras técnicas, edição de templates ou envio de dados da fábrica.

## Próximos critérios para a validação final

| Critério | Situação e próximo passo |
|---|---|
| Fluxo completo com o mantenedor | Executar do cadastro ao backup com uma base fictícia; registrar pontos de dúvida e corrigir em entregas pequenas. |
| Celular e leitor de tela | Os testes automatizados não substituem aparelho real e avaliação com leitor de tela. Conferir foco, leitura de mensagens e uso das tabelas. |
| Documentos no Office | Excel recalculado em rodadas anteriores. A conversão PDF nativa do Word ficou sem conclusão no ambiente; conferir Word, impressão e editor alternativo. Ver REVISAO-LOGOS-TEMPLATES.md. |
| Revisão independente | Solicitar revisão delimitada quando houver revisor disponível; não confundir testes do implementador com revisão independente. |
| Três técnicos | Testar a rotina com três profissionais, sem cadastrar informações privadas no ambiente de teste. Registrar critérios observáveis de aceitação. |

## Ampliações que dependem de definições

MTBF, MTTR, disponibilidade e novas regras técnicas precisam de definições e exemplos numéricos aprovados pelo mantenedor. QR, fotos, assinaturas e integrações adicionais devem ter escopo, privacidade e evidências definidos antes da implementação. Não estão incluídos implicitamente nesta rodada.

Nenhuma atividade é prometida após o fim da sessão sem um executor persistente configurado. As próximas rodadas devem usar esta fila e os resultados observados, preservando as autorizações existentes e os dados antigos.
