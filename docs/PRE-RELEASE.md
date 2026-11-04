# Notas — v0.1.0-preview.1

Prévia pública de um software em desenvolvimento. Versão do pacote: 0.1.0-preview.1. A tag deve apontar ao commit efetivamente integrado com CI aprovado; o SHA exato e o arquivo de divulgação ficam nas [notas da release](https://github.com/td9251156-creator/pcm-direto/releases). Não apontar para um ramo pendente nem usar estas notas como prova de validação humana.

## O que esta versão reúne

- Portal de manutenção prática como entrada do domínio e app em `/app.html`, com compatibilidade dos links antigos.
- 19 modelos gratuitos (16 Excel e 3 Word), orientação, download original sem conta, busca por necessidade e por formato.
- Quatro guias editoriais: ordens de serviço, semana, falhas/Pareto e começo do plano preventivo. Cada guia liga seu material, app e conversa correspondente.
- Índice acessível dentro dos materiais, cópia/compartilhamento do endereço público e leitura sem JavaScript.
- App local com dados/backup preservados; atualização sem forçar a troca de abas. Correção do cenário HTML novo/CSS/JS offline sob worker anterior, além de saída offline clicável.
- Conversas com moderação prévia, login por e-mail, retirada e denúncias privadas; dados da fábrica não são enviados automaticamente.
- Kit de divulgação: 16 slides PNG 1080×1350, quatro PDFs LinkedIn, legendas, alternativas de texto, perfis e roteiro de 28 dias. Nenhuma postagem foi enviada.

## Referências de integração

O portal e as capacidades vieram das entregas integradas #61–#80; #81 corrigiu atualização/offline em `eb912ddc0a8118e0f8d7afa40aa6dface400b915`. Esta preparação parte desse commit, preserva modelos R00 e backup versão3, e acrescenta documentação, guias editoriais e o kit. O SHA final pertence à integração da preparação, identificado na release e no CI correspondente.

O levantamento antigo sobre #58/#59 na base `81100416509f684e8078a988882e830fdd9adb11` era uma fotografia de propostas separadas. Seus resultados 416/417 testes e 18 roteiros são históricos e não são a conferência desta versão. Os recursos e o formulário de feedback já estão integrados; não são anunciados como futuros.

## Verificações

A correção #81 passou em lint, 539 testes/66 arquivos e 28 roteiros de navegador, com revisão independente. A preparação final passou em lint, 541 testes/66 arquivos e 28 roteiros, com os quatro guias; as execuções e o commit ficam registrados no PR; a publicação só ocorre depois do CI do commit candidato. Comandos reproduzíveis em [TESTES-NAVEGADOR](TESTES-NAVEGADOR.md).

Conferência adicional: 20 arquivos originais e19 cópias fictícias abriram/exportaram a primeira página no LibreOfficeDev 26.8.0.0.alpha0, preservando os hashes. Isso não comprova todas as páginas/fórmulas, Excel/Word ou validação humana. [Evidências por arquivo](portal/EVIDENCIAS-OFFICE.json).

## Limites conhecidos

- Versão de teste; modelos R00 em desenvolvimento. Guias são orientações editoriais, sem declaração de revisão técnica humana.
- Testes de celular são emulação de larguras no Chromium. Aparelhos, leitor de tela, BFCache real e Web Share nativo ainda precisam de conferência.
- Comunidade: funções e permissões reais conferidas somente em leitura; ciclo completo com duas contas reais comuns não foi concluído nesta sessão. Avisos legados do Supabase permanecem identificados.
- Auditoria de dependências: uma advisory moderada de minimatch propagada a 12 pacotes, sem avisos altos/críticos na consulta. Sem downgrades/overrides incompatíveis para apenas zerar o relatório. [Triagem e fontes](portal/SEGURANCA-CONFERIDA.md).
- Dados operacionais continuam somente no aparelho. Baixe backups; não limpe o navegador para atualizar.
- Redes sociais, propriedade Search Console e números de uso não foram alterados/inventados. Publicação manual e medição dependem das contas do mantenedor. A validação de uso permanece adiada.

## Atualizar e obter ajuda

Termine o trabalho, baixe um backup, feche todas as abas e a janela instalada e abra novamente. A nova proteção offline só vale após ativação normal do worker corrigido. Não apague dados para atualizar.

Erros: formulário de issue do repositório. Dúvidas: Comunidade/Discussões. Vulnerabilidades: canal privado em [SECURITY](../SECURITY.md). Sem promessa de conformidade, resultado garantido, selo ou financiamento.
