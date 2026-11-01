# Logo oficial nos templates

> **Nota (01/11/2026):** os seis modelos de gestão (PCMD) e os 18 modelos adicionais ("refeitos") foram retirados; consulte `docs/FILA.md`. Este documento permanece como histórico.

Atualização autorizada pelo mantenedor em 26/10/2026. Versão publicada dos seis modelos de gestão: 2.0.1-marca.

## Escopo

Oito XLSX e quatro DOCX (modelos e exemplos) continham 44 imagens da marca antiga. Foram substituídas pela imagem original do modelo padrão, SHA256 d83fc1ed2ef7fc1a1db158b6e3cd32e20e66684228548c70b1dea50db82e1f63. As alturas foram preservadas e as larguras ajustadas à proporção nativa 1230×356. Os 18 modelos adicionais, seu ZIP e os modelos padrão da marca já continham essa assinatura.

## Preservação e rastreabilidade

Nenhuma planilha foi regravada por um importador. A intervenção nos pacotes OOXML alterou somente as imagens e as extensões dos desenhos correspondentes. Cada outra parte possui seu hash de origem registrado em integridade-logos-templates.json. Cabeçalhos/desenhos são comparados após neutralizar apenas as dimensões das imagens identificadas; as posições, textos, gráficos e outros atributos continuam protegidos pela comparação. Os testes verificam também a proporção e o logo nos 32 arquivos Office públicos.

O manifesto conserva os hashes de origem e recebe os novos hashes dos arquivos publicados. O contrato de preenchimento usa os hashes atualizados. Os arquivos originais continuam recuperáveis no histórico Git; não se declara que os arquivos modificados são idênticos aos recebidos.

## Conferência

- Oito planilhas abertas no Excel, recalculadas e verificadas: zero erros de fórmula antes e depois. Prévias da primeira página regeneradas no Excel.
- Um manual abriu no Word em leitura; as tentativas de conversão PDF não concluíram e foram encerradas. A conversão nativa completa do Word permanece sem validação nesta rodada.
- As quatro prévias Word estáticas receberam somente a imagem e a matriz de exibição. Todas as páginas, dimensões e textos extraídos foram comparados antes/depois. Relatório em integridade-previas-word-logo.json. As prévias não são apresentadas como uma nova exportação do Word.
- As 12 prévias foram renderizadas; cabeçalhos foram inspecionados. Fórmulas e conteúdo técnico não foram alterados.
- Não houve revisão humana independente. A publicação segue o fluxo de PR e CI já autorizado.
