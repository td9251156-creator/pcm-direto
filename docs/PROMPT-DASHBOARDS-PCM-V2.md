# Prompt — três dashboards integrados do PCM Direto

Você desenvolverá os dashboards do PCM Direto no repositório existente.
Trabalhe localmente e publique somente depois de minha aprovação explícita
da versão concreta apresentada. Não interpretar “continuar” como autorização
de deploy, push, PR ou merge. Preserve dados, templates, backups e alterações.

## Começar

Configuração desta entrega:
- Raiz: `raiz do projeto local`.
- Aplicação: pasta `app` dessa raiz; preserve a branch e as alterações existentes.
- Templates recebidos: `NEW/Biblioteca-PCM-v2`, relativos à raiz.
- Prévia HTML: `outputs/dashboards-pcm-v2/PCM-Direto_Dashboards_DEMO.html`, relativa à raiz.
- Referência da demonstração: `2026-10-29`; período `2025-01-01` a `2026-10-29`.
- Idioma: português brasileiro; moeda: BRL; fuso: America/Sao_Paulo.

Leia AGENTS.md, o plano atual, a fila e INTEGRACAO-BIBLIOTECA-PCM-V2.md.
Use src/dados/biblioteca-pcm-v2.json e src/integracao/biblioteca-pcm-v2.js.
Não reinicie o projeto nem substitua o catálogo antigo por correspondência numérica.
São 19 modelos recebidos (16 XLSX e 3 DOCX), não os 26 do planejamento anterior.
Fontes integrais estão em public/modelos/biblioteca-v2; originais em NEW/Biblioteca-PCM-v2.
Os novos códigos têm significados próprios: 004 OS; 008 Falhas; 012 Custos.
Considere a atualização local `biblioteca-pcm-v2.0.1`: modelos 002 e Word 017–019
recebidos em 31/10/2026. Use as cópias sincronizadas no projeto e o manifesto atual.
O 002 tem sete abas. Os Word possuem controles de metadados, mas ainda não há
preenchimento automático implementado. As fontes dos dashboards não mudaram.

## Escopo

Criar apenas:
1. Manutenção e Programação.
2. Confiabilidade.
3. Custos.

Estoque/Compras fica fora. Não gerar planilhas ou Word novos. Não mudar fórmulas
dos templates para fazer indicadores parecerem completos.

## Dados e entrada

Use tabelas estruturadas: tb_pcm_os no 004, tb_pcm_falhas no 008 e tb_pcm_custos no 012.
Use TAG e cadastro tb_pcm_ativos para equipamento, família e setor.
Nomes e intervalos estão no manifesto. O leitor já retorna prévia e erros, sem gravar.
Antes de gravar, validar referências cruzadas, conflitos e reimportação idempotente;
mostrar o resumo e pedir confirmação. Erro não pode substituir a base anterior.
No uso diário, consultar dados locais da aplicação, sem exigir CSV intermediário.
Não gerar OS artificiais a partir das ocorrências do app sem contrato explícito.
Manter demonstração isolada e identificar procedência de cada base.

Dados fictícios adaptados e validados para esta biblioteca:
`outputs\pcm-dados-demo-biblioteca-v2-20261031\PCM_Dados_DEMO_Biblioteca_v2`.
Para o HTML, priorize `dados_demo.json` (tipado) e consulte `contrato_integracao_v2.json`,
`compatibilidade.json` e `LEIA-ME.md`. São 1.893 registros em seis bases. Os CSVs são
alternativa da mesma base, nunca outra fonte para somar. Operação e orçamento são
complementos explícitos; o leitor XLSX atual não é importador JSON/CSV automático.

O JSON contém `metadados` e `bases`. Confira as seis bases: ativos (12),
ordens_servico (440), falhas (124), custos_manutencao (701), operacao_ativos (264)
e orcamento_manutencao (352). Não cruzar todas em uma tabela única que multiplique
linhas: preservar a granularidade de cada base e agregar antes dos cruzamentos.
Padronizar categorias por mapa explícito; preservar os valores originais e relatar
ambiguidades. Nunca corrigir silenciosamente os arquivos de origem.

## Limitações obrigatórias

- Planner 003 usa grades; não é lista de eventos. Anual contém 60 posições (5 por mês),
  não semanas ISO. Não converter marcações em datas realizadas por suposição.
- Formulário avulso de OS não é outro registro se a OS já consta na tabela.
- Indicadores 011 são consolidados manuais sem TAG estruturada; não somar a eventos.
- Não há horas de operação por TAG nos templates. MTBF deve ficar indisponível até
  existir fonte e regra aprovadas, sem substituir operação por horas do calendário.
- Orçamento 012 é matriz B8:M11 com ano A4. Setor B4 é filtro do realizado: não atribuir
  o orçamento ao setor automaticamente. Definir escopo e normalizar sem inventar rateio.
- Cópia de leitura do ExcelJS não contém desenhos; nunca usá-la para exportar documentos.

## Indicadores e regras

Manutenção: OS abertas, atrasadas, cumprimento e backlog em horas restantes.
Usar abertura, prazo e conclusão conforme o indicador. Sem horas restantes, sinalizar
backlog incompleto. Sem prazo, mostrar “Sem programação”. Não reconstruir backlog
histórico ou prazo original sem histórico. Documentar população e cancelamentos.

Confiabilidade: falhas, indisponibilidade, tempo de reparo e MTTR quando aprovado.
Mostrar MTBF como pendente se faltar operação. Unir sobreposições por TAG, recortar
intervalos ao período e separar reparo de indisponibilidade. Indicar ocorrências abertas.
As fórmulas do 011 são referência, não aprovação automática da metodologia.

Custos: realizado, orçamento, desvio e consumo quando o escopo orçamentário permitir.
Sem orçamento comparável, mostrar realizado e a pendência. Não somar total de OS aos
seus componentes. Usar setor histórico do lançamento. Desvio=realizado−orçado;
consumo=realizado/orçado com denominador positivo. Não misturar compromissos e gastos.

Para cada indicador, definir fonte, fórmula, data, população, exclusões e ausência de dados.
Zero real, campo vazio, resultado parcial e cálculo indefinido são situações distintas.

## Interface e integração

Tema claro e identidade PCM Direto; logo oficial, azul e laranja; celular e teclado.
Até 4 cartões, 2 gráficos e tabela curta por visão. Filtros de período, setor, família e
TAG somente quando suportados. Detalhes devem mostrar a origem dos totais.
Até 3 prioridades sustentadas pelos registros. Sem economia inventada ou causalidade presumida.
Comparar períodos equivalentes e identificar meses parciais.

Antes de construir, investigar gargalos, concentração de falhas e desvios de custos.
Cada descoberta deve trazer número, período, população, evidência e ação possível.
Separar associação de causa comprovada e declarar quando a evidência for fraca.
Usar datas de abertura, programação e conclusão; não inventar marcos de execução
que não foram registrados. Não aplicar funil comercial, CAC ou ROAS à manutenção.

Adicionar uma frase curta sob cada gráfico, calculada conforme os filtros, explicando
o significado do resultado. Criar “Onde agir agora” com até três ações apoiadas nos
dados disponíveis. Sem evidência suficiente, mostrar a pendência. Impacto financeiro
somente quando calculável com premissas visíveis; caso contrário usar horas, atrasos
ou ocorrências, sem converter indisponibilidade em prejuízo por suposição.

Reutilizar navegação, acesso a dados e lógica existente. Sem framework, serviço externo,
telemetria ou dependência nova desnecessária. CSS isolado; não reestilizar o aplicativo.
Módulo deve permitir montar, atualizar e desmontar sem eventos duplicados. Usar a mesma
função de cálculo nos cartões, gráficos, detalhes e exportação. Não modificar dados ao calcular.

## Ver no site e baixar

Dentro do app: dashboard atualiza com os dados locais.
Botão Baixar HTML: gerar arquivo autônomo, offline e aberto por duplo clique, com os
dados e filtros escolhidos. Mostrar antes do download o conteúdo incluído.
O arquivo é um retrato, sem atualização automática. Incluir período, referência,
data da exportação e indicação de demonstração quando aplicável. Incorporar recursos,
sem CDN, APIs ou fontes externas. Nunca publicar dados privados junto do código.
Textos importados não podem ser executados como HTML/script.

## Fases e aceite

1. Diagnóstico e fontes reais.
2. Manutenção e Programação com validação.
3. Confiabilidade, preservando indicadores pendentes.
4. Custos e escopo orçamentário.
5. Download HTML e revisão integrada.
6. Prévia local para minha aprovação.

Em cada fase, apresentar brevemente o que foi concluído e seguir com o trabalho
local independente. Ao terminar a primeira versão, revisar criticamente clareza,
contraste, redundâncias, escala dos gráficos, denominadores e comparações; corrigir
o que puder induzir interpretação errada antes de apresentar a prévia final.

Controles da demonstração sem filtros, na referência de 29/10/2026: 85 OS abertas,
81 atrasadas, backlog de 238,5 h, 124 falhas, realizado de R$ 156.034, orçamento de
R$ 110.000 e desvio de R$ 46.034. Recalcular a partir das bases, nunca fixar esses
valores nos cartões. Outubro tem realizado parcial e orçamento mensal completo:
identificar essa diferença e não apresentar como comparação de meses completos.

Avance no trabalho local independente sem pedir confirmação de rotina.
Teste duplicidades, códigos com zeros, datas/fusos, filtros, intervalos sobrepostos,
reimportação, base vazia, parcialidade, ausência de dados, exportação offline,
abrir/fechar telas e preservação de backups. Execute npm run verificar e testes
de navegador aplicáveis. Faça revisão independente conforme AGENTS.md.
Não diga “sem bugs” nem declare testes que não executou.

Documentar a atualização recorrente nos documentos existentes: fontes, campos,
mapas de categorias, fórmulas, testes, limitações e como atualizar o período.
Não criar outro arquivo CLAUDE.md nem regras concorrentes. A atualização mensal
deve reutilizar o mesmo fluxo validado, preservar a base anterior em caso de erro
e manter separados demonstração e dados reais. Relatório PDF fica fora desta entrega.

Apresente resultado, limitações, verificações e instrução de acesso à prévia.
Pare antes da publicação. Somente após minha autorização explícita da versão
apresentada execute o fluxo autorizado e confira a publicação real.
