# Experiência dos documentos — 26/10/2026

> **Nota (01/11/2026):** a tela "Preencher um modelo" e os modelos "refeitos" foram retirados; consulte `docs/FILA.md`. O restante permanece como histórico.

Pedido do mantenedor: identidade como referência interna; modelos separados, explicados e fáceis de usar.

## Achados e mudanças

| Problema observado | Mudança para quem usa |
|---|---|
| Manual da marca no rodapé, em Mais e em uma tela própria | Acessos e tela retirados. O endereço antigo encaminha ao catálogo de modelos. |
| Manual, Design System e modelos-base copiados para a distribuição offline | Referências preservadas localmente fora do checkout e retiradas de `public`. Logos e fontes oficiais continuam no produto. |
| Download de 18 modelos juntos e geração em ZIP | Cada ação entrega um único Excel ou Word, tanto nos modelos quanto na emissão da revisão ativa. |
| Termos internos como “refeitos” e “pacote do rascunho” | “Modelos para sua rotina”, “Preencher um modelo” e “Documentos da revisão ativa”, com origem dos dados explícita. |
| Lista longa sem orientação suficiente | Cada modelo informa finalidade, primeiro passo, formato, prévia PDF e forma de preenchimento. Busca por palavras e filtro de finalidade. |
| Busca perdida ao navegar | Busca e finalidade permanecem durante a sessão. Sem resultados, há ação para limpar filtros e voltar ao campo. |
| Ação de preenchimento exigia localizar o modelo novamente | Link do catálogo abre o modelo já escolhido. |
| Cadastro exigido mesmo para controles manuais | Modelos manuais podem ser baixados sem equipamento e sem elaborador. |
| Vários botões com o mesmo nome acessível | Downloads e geração identificam o documento para leitores de tela; prévias informam a nova aba. |
| Aviso antigo sobre modelos “aguardando” e download combinado anterior | Aviso e ação combinada retirados. Exportações anteriores continuam individuais e explicam suas limitações. |
| Formulário de aprovação podia ser recolhido com campo obrigatório inválido | Abre a identificação de aprovação ao validar e mantém expandida quando a confirmação já está marcada. |

Os arquivos internos foram preservados com comparação integral de bytes em `../PCM-Direto-Marca/Referencias-internas`; o arquivo recebido com os 18 modelos está em `../Templates/Arquivos-originais`. Essas pastas não fazem parte do deploy nem são necessárias para executar os testes em outra máquina. As referências já constaram de versões anteriores do repositório; a retirada da distribuição atual não apaga o histórico do Git.

## Escopo e riscos

Não houve alteração no conteúdo dos modelos Office, fórmulas, proteção, tarefas, regras de manutenção ou formato dos backups. O preenchimento usa os mesmos contratos e verificações de integridade. Cada emissão da revisão ativa registra somente o documento escolhido. Durante a geração, uma segunda solicitação é bloqueada, inclusive ao sair e voltar à tela; falha mantém os campos para tentar novamente.

Quem usava os ZIPs deve escolher os arquivos necessários. As edições já baixadas continuam válidas; não há sincronização entre elas e o aplicativo. O novo serviço offline entra após fechar as abas da versão anterior, sem apagar dados operacionais.

## Evidências e limites

Os dois testes iniciais reproduziram a distribuição indevida dos materiais internos e a oferta pública dos ZIPs. Novos casos verificam download manual sem dados, integridade dos bytes, código desconhecido e arquivo indisponível/incompatível. O roteiro de navegador verifica filtros, seleção direta, envio repetido, navegação durante a geração, erro recuperável e larguras de 320 a 1280 px. A regressão dos seis documentos verifica geração individual offline, mídia, conteúdo e registro individual de emissão. A dos 18 modelos verifica cinco preenchimentos parciais, 13 manuais intactos, fórmulas e proteção.

Verificação local concluída: `npm run verificar` (254 testes, lint e build) e `npm run test:navegador` completos. A primeira execução local teve timeout ao carregar ExcelJS no Windows; a repetição completa passou sem alterar o teste nem o limite. Prévias desktop e celular inspecionadas; a imagem de apresentação de Documentos foi atualizada.

Revisão independente não realizada. Validação com usuários, leitor de tela, aparelhos reais e a conferência documental final do Word continuam na fila; os testes automatizados não substituem essas etapas.
