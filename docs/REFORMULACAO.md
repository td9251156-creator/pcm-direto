# Reformulação aprovada — 24/10/2026

## Decisões do mantenedor

Uma fábrica, até 100 ativos. HTML, CSS, JavaScript e Vite; licença MIT; GitHub Pages.
Direção visual B **Gestão**, marca preservada, **comunidade como página inicial e tema claro fixo**.
Os dados da fábrica permanecem locais. Somente modelos técnicos explicitamente propostos são
enviados à comunidade Supabase; conta online não é necessária para a operação da fábrica.

Comunidade: baixar modelos, criar propostas, curtir, comentar e denunciar. Modelos e comentários
passam por moderação. Não publicar TAGs, nomes, falhas ou documentos privados da fábrica.

## Contratos

- IndexedDB contém uma base atômica de formato 3 com sequência para detectar abas concorrentes.
  Migração conserva as chaves antigas; erro de quota, versão ou corrupção não autoriza apagá-las.
- Backup completo em versão 3; aceitar 1 e 2. Restaurar exige prévia e confirmação e guarda
  o registro anterior na mesma transação. Reverter código não autoriza reduzir o formato salvo.
- Rascunho separado das revisões; revisão contém vigência, elaborador, resumo e retratos do plano,
  equipamentos, responsáveis e parâmetros. IDs são vínculos; rótulos históricos são preservados.
- Revisão substitui somente previsões futuras pendentes. Passado e ocorrências realizadas ficam
  preservados. A prévia informa substituições e efeito na carga.
- Execução por ocorrência, data local, responsável opcional. Toque repetido não duplica.
  Correção por cancelamento preservado e novo registro. Legado não recebe vínculo inferido.
- Realizado mensal conta ocorrências distintas no mês previsto. Sem previsão não equivale a 0%.
- Falha preserva identificação do ativo. Parada vazia é desconhecida, não zero.
- Criticidade: cinco notas; limites iniciais A=12/B=9; incompleto fica pendente; segurança=3 é A.
  Classificação não muda periodicidades. Travas técnicas de segurança permanecem.

## Experiência e documentos

Assistente em quatro passos retomáveis; visão geral, planejar, executar, documentos e mais.
Exemplo isolado da base operacional. Seis artigos locais. Backup com data e lembrete.

Modelos originais em `public/modelos`. Inventário em `docs/modelos-inventario.json`, contrato
em `src/dados/contrato-modelos.json` e mapeamento de preenchimento em `src/saida/pcmd.js`.
Preencher cópias OOXML, conservar fórmulas, imagens e demais partes. Ampliar linhas e intervalos;
nunca truncar. Substituir marcadores Word divididos entre runs. Campos indefinidos: A definir.
Uma emissão usa o mesmo retrato e corte nos seis arquivos; aprovação exige registro explícito.
Exportações anteriores ficam em Outros formatos durante a transição.

## Marcos e critérios ainda obrigatórios

1. Base e ramo anterior conferidos; inventário dos arquivos reais.
2. Propostas comparáveis e escolha visual. Escolhida Gestão pelo mantenedor; Figma editável
   continua pendente por limite de chamadas da conta. Protótipos locais em `/propostas/index.html`.
3. Persistência, migrações, falhas, backup e revisões validados.
4. Cadastros, planejamento, semana, execução e falhas offline.
5. Seis documentos preenchidos e conferidos visualmente em LibreOffice e Excel 2010 ou posterior.
6. Revisão independente, teclado, leitor de tela, celular real, 100 ativos com histórico anual,
   múltiplas revisões, atualização da PWA com aba antiga e teste com três técnicos.

Codex implementa; Claude Code foi solicitado para revisão independente, mas não estava disponível
neste ambiente. Revisão complementar de Codex não deve ser apresentada como revisão de Claude.
Notion acompanha decisões; documentação canônica fica neste repositório. Protótipo no Sites
e arquivo Figma editável não podem ser declarados entregues sem artefato verificável.

O repositório foi recriado em 24/10: integrar por PR baseado no novo commit inicial
`afeab55d7a0907edbff5e542e58a67da5b532294`, preservando a cópia local anterior, sem force push.

## Posterior

QR por ativo, indicadores, paradas e ampliação da biblioteca. MTBF, MTTR e disponibilidade
dependem de exemplos numéricos aprovados e regras técnicas próprias. Não implementar por inferência.
