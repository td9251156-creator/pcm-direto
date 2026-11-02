> Atualização 24/10/2026: decisões atuais em [Reformulação](REFORMULACAO.md). As seções abaixo registram o histórico e não substituem essas decisões.

## Lista única de pendências — situação em 01/11/2026

Conferida contra o código e os testes do ramo `coord/pcm-man-001`. Situações: **Verificado** = implementado e
verificado; **Validação humana** = implementado, aguardando validação humana; **Bloqueado** = depende de definição
técnica; **Adiado** = fora desta rodada, com justificativa.

| # | Item | Prioridade | Situação | Depende de | Critério de aceite |
|---|---|---|---|---|---|
| P1 | Importar OS e ativos (004), falhas (008), custos e orçamento (012) | Alta | **Verificado** | — | Prévia por linha, confirmação, reimportação sem duplicar, falha mantém a base. |
| P2 | Dashboards com os dados da base local | Alta | **Verificado** (demo em `?fonte=demo`) | P1 | Mesmo cálculo em cartões, gráficos, tabelas e HTML. |
| P3 | Mês parcial e falha iniciada antes do período | Alta | **Verificado** | — | Contagem pelo início; horas recortadas ao período. |
| P4 | Orçamento do 012 | Alta | **Verificado** com escopo restrito | — | Só orçamento geral (setor vazio); sem rateio. |
| P5 | MTBF, MTTR e disponibilidade | Média | **Verificado** + **Validação humana** | — | Procedimento PCM-MAN-017 implementado no Mensal (HP digitada; HI pelas falhas do app e importadas; exemplo numérico do procedimento como teste). Dashboards apontam para o Mensal. |
| P6 | Preencher PCM-MAN-002 | Alta | **Verificado** + **Validação humana** no Office | — | Criticidade (notas 1 a 5), Plano, Cronograma e Cadastros; 100 ativos abertos no Excel sem erro. |
| P7 | Retirar todos os modelos anteriores (PCMD e "refeitos") | Alta | **Verificado** | — | Site sem arquivos PCMD/refeitos; Documentos só com v2; `#entrega-modelos` leva a Documentos; testes impedem PCMD nas telas. |
| P8 | Preencher 001, 004, 008, 018 e 019 | Alta | **Verificado** + **Validação humana** no Office | — | 004 com 3.256 OS e 008 com 1.101 falhas abertos no Excel sem erro (só os #N/D do Pareto vazio, iguais ao original). |
| P9 | "Preencher um modelo" | — | **Retirado** | — | Tudo é gerado em Documentos da revisão ativa. |
| P10 | Horas de operação e indicadores por ativo e mês | Média | **Verificado** + **Validação humana** | — | HP digitada no Mensal; HI calculada pelas falhas (procedimento 017); botão no Mensal gera o PCM-MAN-011 do ativo (12 meses) — no Excel, BMB-01 de janeiro dá MTBF 197 h e disponibilidade 98,5%, como no procedimento. |
| P11 | Janelas de parada | Baixa | **Verificado** + **Validação humana** | — | D4 opção 1 (±2 dias) em Mais → Janelas de parada: só sugere, não muda datas; segurança nunca adiada; conflito de segurança apontado. Testes + roteiro de navegador. |
| P12 | QR code, fotos e ciência | Baixa | **Verificado** + **Validação humana** | — | D5 concluído: QR por ativo (gerador próprio); fotos na falha (até 3, 1.280 px, ≤ 500 KB, sem EXIF/GPS, aviso a 20 MB, backup com tamanho); registro de ciência na execução (nome, data/hora, conteúdo confirmado; sem promessa de validade jurídica). |
| P13 | Catálogo da comunidade no banco real | Baixa | **Validação humana** | Acesso do mantenedor | Roteiro em VALIDACAO-REFORMULACAO.md. |
| P14 | Ciclo completo, 3 técnicos, celular/leitor de tela, Excel/Word/LibreOffice | Alta | **Validação humana** | Pessoas e aparelhos | LibreOffice não está instalado nesta máquina. |
| P15 | Revisões nos modelos para integrar melhor (lista abaixo) | Média | **Aguardando arquivos do mantenedor** | M1–M11 | Cada arquivo novo: hash no manifesto, testes e conferência no Excel. |
| P16 | Publicações de 01/11/2026 | — | **Publicado** | — | PRs #45 a #51: só Biblioteca v2, modelos revisados, D1, IAs, D4 e D5. |
| UX1 (item 1) | Plano Mestre recolhido por ativo, com filtros combinados | Alta | **Em validação no PR** | Revisão do mantenedor | Nove ativos em 390 px com menos de 6.000 px; setor, especialidade, sem responsável e busca; teclado e rótulos. Leitor de tela real pendente. |

### Decisões do mantenedor (01/11/2026)

- **Padrão de código:** PCM-MAN, nunca PCMD. O prefixo `PCMD` guardado em bases antigas vira `PCM-MAN` ao abrir.
  Emissões antigas de documentos PCMD aparecem no PCM-MAN-001 como **OBSOLETO**, com o substituto (registro histórico).
- **D2 — Criticidade de 1 a 5.** O app usa o método da aba Criticidade do 002: S, Q, P e frequência de 1 a 5;
  consequência = maior entre S, Q e P; classe pela matriz do modelo; S = 5 → A. Notas antigas convertidas
  1→1, 2→3, 3→5 (a nota de custo/tempo de reparo não existe no novo método) e marcadas "convertida: confira" até
  serem salvas de novo. As notas vão para a aba Criticidade do 002.
- **D3 — Histórico no PCM-MAN-004.** Cada execução vira uma OS ("APP-" + ID): CONCLUIDA ou CANCELADA; ocorrência
  prevista até a data de corte sem execução vira PROGRAMADA; tipo PREVENTIVA; abertura = data prevista (ou a da
  execução, se feita antes); prioridade em branco. OS importadas do 004 entram como vieram.
- **D6 — PCMD-01 retirado.** O mantenedor vai acrescentar ao 001 os campos que faltam (M1–M3).
- **D7 — PCMD-05 retirado.** O registro de falhas pede hora de início e hora da conclusão (opcionais); no 008,
  início = data + hora; fim = conclusão + hora; sem hora, só a data (estilo dd/mm/aaaa do modelo).
- **D8 — Manuais antigos retirados.** **D9 — Revisão dos documentos = revisão do plano.**
- **D1 — Indicadores:** o mantenedor vai revisar os procedimentos e definir o cálculo.
- **D4 — Janelas de parada: APROVADA a opção 1 (±2 dias) em 01/11/2026 e implementada como sugestão.** Regras comuns: segurança
  nunca é adiada nem fica menos frequente (se antecipada, o próximo vencimento conta da execução antecipada); data e
  capacidade da janela são conferidas à parte; o vencimento original fica guardado; conflito de segurança é apontado, não
  resolvido sozinho. Opções: (1) tolerância fixa em dias (ex.: ±2), a mais simples; (2) percentual do intervalo (ex.: 10%);
  (3) tolerância por classe de criticidade (A/B/C), que prioriza a janela quando falta tempo. Dados: tarefa, segurança,
  vencimento original, intervalo, última execução, duração, tolerância e calendário das janelas. Decisão do mantenedor:
  qual opção e quais limites.
- **D5 — QR, fotos e ciência: limites e ordem APROVADOS em 01/11/2026 (implementação em etapas).** QR: só um identificador do ativo (sem dados
  pessoais; não é controle de acesso). Fotos: lado maior 1.280 px, 150–300 KB (teto 500 KB), até 3 por falha, aviso a
  20 MB por ativo, sem localização embutida, evitando rostos, crachás e placas. Ciência: nome + confirmação + data/hora
  da versão da execução ("Declaro que tomei ciência das informações desta execução"); não prometer identidade comprovada
  nem validade jurídica garantida (pode servir como evidência; MP 2.200-2/2001, art. 10, § 2º). Backup: completo com fotos
  e tamanho estimado antes de baixar; exportação sem fotos marcada como incompleta; nunca apagar em silêncio.
  Ordem sugerida: conferir backup/restauração com anexos → QR → foto → ciência. Decisão do mantenedor: aprovar limites e ordem.

### Modelos revisados recebidos e integrados (01/11/2026)

Os 19 arquivos novos (R00, em desenvolvimento) substituíram os anteriores; manifesto e carga do banco atualizados.
- **Aplicado pelo mantenedor e integrado:** M1 e M3 (001: pessoas com função/especialidade/ativo; aba Referências),
  M2 (001: aba Organização com nome, referencial e metas), M5 (002: coluna Periodicidade, com "A cada (dias)"
  calculado), M6 (Cadastros padronizados: família em H, setor em J; 015 reorganizado), M8 (004: observação), M9 (008:
  peça e responsável). 002 passou a chamar a análise de MFMEA. M7 decidido (prioridade vazia só em preventiva).
- **Importação:** planilhas do modelo anterior, sem as colunas novas, continuam aceitas (as colunas ficam vazias).
- **Demais modelos** (003, 005–007, 009–016): em Documentos, saem com os cadastros da fábrica (ativos, pessoas,
  famílias e setores) e elaborado/aprovado, prontos para as listas ▼. O 017 (procedimento) recebe os metadados.
- **D1:** o mantenedor enviou o procedimento "PCM-MAN-017 MTBF, MTTR e Disponibilidade" (HP digitada no 011; HI
  calculada pelas falhas, cortada na virada do mês; N pelo mês de início; MTTR só com reparo completo; "sem dado" nunca
  é zero). **Implementado no Mensal** (src/logica/indicadores-017.js). Falha do app sem hora usa as horas de parada da
  própria falha (aviso); sem nenhuma hora, HI fica sem dado. O documento está no site em "Procedimentos prontos".
- Pendentes: M4 (5º critério da criticidade, opcional), M10 (orçamento por setor, opcional), M11 (resolvido pelo procedimento D1).

### Revisões sugeridas nos modelos (para o mantenedor)

Manter nomes de tabela (`tb_pcm_...`), nomes de campo da linha 4 e nomes de aba; subir a revisão no arquivo (`_R01`)
e registrar na aba Revisões. Cada arquivo novo exige atualizar o manifesto (hash) e o preenchimento.

- **M1 — 001, Pessoas:** acrescentar `funcao`, `especialidade` e `ativo` (Sim/Não).
- **M2 — 001, Organização:** `organizacao`, `referencial`, `meta_disponibilidade` (%) e `meta_aderencia` (%).
- **M3 — 001, Referências externas:** tabela própria com `referencia`, `versao`, `data`, `fonte` e `situacao`
  (hoje entram na lista de documentos como OUTRO).
- **M4 — 002:** coluna para o 5º critério (custo/tempo de reparo), se quiser mantê-lo.
- **M5 — 002:** confirmar "A cada (dias)": Diária 1, Semanal 7, Quinzenal 14, Mensal 30, Bimestral 60, Trimestral 90,
  Semestral 180, Anual 365; ou criar coluna com a periodicidade escrita.
- **M6 — Cadastros:** padronizar a ordem das colunas H/J (família/setor). 004, 013 e 014 têm setor em H e família
  em J; 012 e 015 têm outra disposição; os demais têm família em H e setor em J.
- **M7 — 004, Prioridade: decidido em 01/11/2026.** A importação aceita prioridade vazia só em OS PREVENTIVA (o app
  não inventa prioridade); corretiva, preditiva e inspeção continuam exigindo prioridade. Nenhuma mudança no modelo.
- **M8 — 004:** coluna `observacao` (hoje a observação vai junto com o serviço).
- **M9 — 008:** colunas `peca` e `responsavel` (hoje vão escritas na ação).
- **M10 — 012:** grade de orçamento por setor, se quiser comparar por setor.
- **M12 — 011, MTTR:** a fórmula do modelo divide as horas de reparo pelo nº de falhas (L = E ÷ D); o procedimento 017 divide
  pelo nº de **reparos completos**. Sugestão: acrescentar a coluna "Reparos completos" e usar L = E ÷ essa coluna. Enquanto isso,
  o app grava em E só os reparos completos (os valores coincidem quando todas as falhas do mês têm reparo completo).
- **M11 — Indicadores (D1):** origem das horas planejadas, parada digitada ou calculada pelas falhas, falha sem fim,
  e em qual modelo publicar (011?).

## Troca dos downloads pela Biblioteca PCM v2 (31/10/2026)

Pedido do mantenedor: oferecer os 19 modelos da Biblioteca PCM v2 e retirar os antigos, **em etapas,
sem perder função**. Feito nesta etapa:
- Modelos para sua rotina, Comunidade e Conheça o projeto listam somente os 19 modelos v2
  (`src/dados/modelos-v2.js`), com finalidade, abas e download; sem prévia PDF, por decisão do mantenedor.
- Retirados 50 arquivos: 6 exemplos, 12 prévias PDF dos PCMD, 18 prévias dos refeitos, 13 modelos
  manuais refeitos (05–08, K01–K09) e o COMO-USAR antigo. Manifestos e contratos ajustados.
- Ficam **escondidos** 11 arquivos do formato anterior, só para o preenchimento automático:
  6 em `public/modelos` (Documentos da revisão ativa) e 5 em `public/modelos/refeitos` (Preencher um
  modelo). As duas telas avisam que usam o formato anterior. Lista e substitutos previstos em
  `src/dados/modelos-anteriores.js`.
- Central de apoio: artigos de K02, K04/K05 e K07 trocados por PCM-MAN-004, 010 e 009. A Biblioteca v2
  não tem pedidos de compra.

Próximas etapas (uma por vez): preencher automaticamente 002 (criticidade e plano), 001, 008 e os Word
018/019; ao concluir cada uma, apagar o arquivo antigo correspondente e a linha em `modelos-anteriores.js`.
Andamento em 31/10: 002 preenchido (plano e cadastros), antigos mantidos — ver P6–P9 na lista única.

## Dashboards PCM v2 — andamento local (31/10/2026)

| Etapa | Situação | Próxima ação | Verificação |
|---|---|---|---|
| Visual (31/10) | Cartões com ícone/contexto/medidor, linhas mensais com mês parcial tracejado, barras horizontais legíveis no celular, dica ao passar o mouse | Validação humana do visual | Capturas 390–1280 px em `artifacts/` |
| Revisão independente | Concluída: sem bloqueador; itens 1–7, 9–11, 13 e parte de 14–17 corrigidos com testes | Pendentes menores: mês parcial no início do filtro, falha que começa antes do período (declarada como limitação) | 298 testes |
| Manutenção e Programação | Implementada (demonstração) | — | Controles 85 OS / 81 atrasadas / 238,5 h recalculados em teste |
| Confiabilidade | Implementada; MTBF/MTTR/disponibilidade "Definição pendente" (F-005) | Aguardar definição técnica | 124 falhas; sobreposição, recorte e falha aberta testados |
| Custos | Implementada | — | R$ 156.034 / 110.000 / 46.034; outubro marcado parcial |
| Baixar HTML | Implementado, sem scripts nem recursos externos | Aprovação da prévia | Arquivo aberto offline no Edge; prévia em `outputs/dashboards-pcm-v2/` |
| Fonte de dados real (OS/custos) | **Concluída em 31/10** (ver lista única acima): importação 004/008/012 na gestão v3, sem migração do IndexedDB | — | `testes/operacao.test.js`, `scripts/verificar-importacao-operacao.mjs` |
| Biblioteca (etapas 6–7), fluxo, qualidade | Não iniciadas | Um modelo por vez | — |

Telas em `src/telas/dashboards.js` (rota `#dashboards`, Mais → Rotina); cálculo em `src/logica/dashboards/`;
HTML em `src/saida/dashboards-*.js`. Testes: `testes/dashboards-*.test.js` e `scripts/verificar-dashboards.mjs`
(roteiro de navegador, incluído em `npm run test:navegador`). Validação em aparelho real, leitor de tela e
com técnicos continua pendente (F-004). Sem commit, PR ou publicação.

## Preparação local da Biblioteca PCM v2 — 31/10/2026

Atualização posterior: modelos 002 e Word 017–019 sincronizados com os novos
arquivos enviados, manifesto v2.0.1 e versões anteriores preservadas em backup.
Detalhes em `INTEGRACAO-BIBLIOTECA-PCM-V2.md`. Sem publicação.

19 modelos recebidos (16 XLSX e 3 DOCX), cópias integrais e manifesto separado do catálogo
anterior. Leitor de prévia de ativos, OS, falhas e custos, sem persistência ou ligação à tela.
Normalização gráfica somente em memória para leitura; nunca usada para emitir documentos.
Oito testes específicos e revisão independente aprovados no escopo de preparação.
`npm run verificar`: 37 arquivos e 265 testes aprovados, lint e build concluídos.
`npm run test:navegador` concluído com sucesso nas regressões existentes. O novo leitor
foi validado por testes de dados; ainda não existe interface operacional para ele.
Integração operacional e dashboards não implementados nesta etapa.
Detalhes em [Integração v2](INTEGRACAO-BIBLIOTECA-PCM-V2.md); próxima etapa em
[Prompt dos três dashboards](PROMPT-DASHBOARDS-PCM-V2.md).
Não confundir a grade anual de 60 posições com semanas ISO; MTBF depende de horas de operação,
e o orçamento exige escopo explícito. Nenhuma migração, push, PR ou publicação executados.

# Fila de evolução

### Orientações dos indicadores — 27/10/2026

O [PR #40](https://github.com/td9251156-creator/pcm-direto/pull/40), integrado após
revisão independente sem achados, corrigiu os textos de Cadastros, Glossário e
README que ainda descreviam os indicadores como pendentes. M5 agora dá acesso à
tela Mensal. A regressão de navegador falhou antes pela ausência do link e passou
após a correção; metas vazias e cenários anteriores permaneceram preservados.
Implementador e revisor executaram instalação, lint, 301 testes/38 arquivos,
build e navegador específico; navegador completo aprovado localmente e na CI.
Nenhuma fórmula, dado, dependência ou modelo Office foi alterado. As pendências
de T7/T8 e as limitações de validação humana abaixo continuam válidas.

## T6 — indicadores integrados e publicados — 27/10/2026

Os [PRs #37](https://github.com/td9251156-creator/pcm-direto/pull/37) e
[#38](https://github.com/td9251156-creator/pcm-direto/pull/38) entregaram a base de
cálculo e as telas Mensal/Falhas, após aprovação das fórmulas, do exemplo e das
regras pelo mantenedor. Este registro atualiza a situação histórica da T6 abaixo.

- Consulta por ativo e mês fechado; horas planejadas já excluem paradas programadas.
- Parada mensal total conferida pelo usuário, contando sobreposições uma vez;
  as durações individuais de falha não são somadas automaticamente.
- Uma falha por registro no mês da ocorrência, inclusive com parada zero;
  corrigir o mesmo registro mantém a contagem.
- Reparos entram no MTTR pelo mês da conclusão informada, com sua duração total,
  separada da parada. Dados antigos não recebem conclusão ou duração presumidas.
  Campos vazios não viram zero; reparo concluído sem duração impede MTTR parcial.
- Exemplo aprovado: 720 h planejadas, 6 h paradas, três falhas e três reparos
  concluídos com 6 h totais: 714 h operadas, MTBF 238 h, MTTR 2 h e disponibilidade
  99,17%. Quocientes sem divisor válido aparecem como não calculados.

**Evidências:** implementador e revisor independente executaram instalação,
lint, 301 testes em 38 arquivos e build. Navegador completo aprovado localmente
e na CI; roteiro específico repetido pelo revisor, com backups 1/2/3, falta de
espaço simulada, recuperação, gravação lenta, teclado e 320/1280 px. Gestão antiga
permanece aceita; dados novos usam gestão 2, recusada pelo leitor antigo, e a
sequência do IndexedDB impede sobrescrita por uma aba desatualizada. O formato
do backup completo continua 3. O revisor aprovou sem bloqueadores.

Merge autorizado ao coordenador e publicação confirmados na
[execução da main](https://github.com/td9251156-creator/pcm-direto/actions/runs/40572591819).
O pacote servido por pcmdireto.me contém a nova tela. Modelos Office e dependências
preservados. Leitor de tela, aparelhos reais e Office não foram conferidos nesta
entrega. T7 continua aguardando as fichas dos três técnicos; T8 aguarda o teste e
as regras de privacidade. A aplicação da migração do catálogo no banco real
continua sem confirmação; nenhum acesso ao Supabase real foi feito nesta tarefa.

## Rodada T0–T4 integrada — 27/10/2026

O mantenedor integrou os PRs na ordem T0 → T2 → T3 → T4 → T1. Este registro
não acrescenta funcionalidades nem substitui as decisões técnicas pendentes.

| Tarefa | Entrega integrada | PR |
|---|---|---|
| T0 | Coordenação paralela autorizada para arquivos sem sobreposição, orientações para agentes e integrador dos ramos. | [#31](https://github.com/td9251156-creator/pcm-direto/pull/31) |
| T2 | Página de apresentação com 18 modelos em seis grupos, downloads existentes e seis exemplos; botões de acesso corrigidos. | [#32](https://github.com/td9251156-creator/pcm-direto/pull/32) |
| T3 | Três artigos na trilha de modelos: ordens de serviço, estoque/compras e plano de ação 5W2H, usando as orientações existentes. | [#33](https://github.com/td9251156-creator/pcm-direto/pull/33) |
| T4 | Catálogo com sete tipos específicos e a opção Outro tipo; nova migração preservando as validações anteriores. | [#34](https://github.com/td9251156-creator/pcm-direto/pull/34) |
| T1 | Vigência anterior a hoje permitida, mantendo data válida, elaborador, resumo e a ordem das revisões; previsões vigentes anteriores a hoje e sem conclusão aparecem vencidas. | [#35](https://github.com/td9251156-creator/pcm-direto/pull/35) |

**Verificações da rodada:** houve revisão independente por agentes diferentes dos
implementadores. A última conferência conjunta aprovou lint, 272 testes em 36 arquivos
e build. As CIs dos PRs executaram a suíte completa de navegador com sucesso. Depois
de cada merge, os ramos restantes receberam a main e repetiram as verificações.
Foram usados dados fictícios; o agente executou SQL somente em banco descartável
na memória, sem acessar ou alterar o banco real.

**Pendências e limites:** a aplicação de
`supabase/migrations/20261027120000_tipos_catalogo.sql` no Supabase real ainda não
foi confirmada pelo mantenedor. Até a aplicação, o servidor pode recusar os três
tipos novos; as instruções manuais estão no PR #34. A suíte local no Windows teve
falha ao encerrar um recurso após os testes funcionais; essa execução não foi
declarada aprovada. A suíte completa passou na CI Linux, sem alterar testes ou
prazos. Leitor de tela, aparelhos reais e conferência no Office não foram refeitos
nesta rodada. Os modelos Office e as dependências não foram alterados.

### Próximos itens — aguardam o mantenedor

| Tarefa | Situação e próximo passo |
|---|---|
| T6 — MTBF, MTTR e disponibilidade | Somente diagnóstico. Aguardar fórmulas e exemplo numérico aprovados. Existem falhas com horas de parada opcionais e execuções com datas e vínculos; as horas previstas das tarefas não são horas de operação. Na base operacional do app, não foram encontrados campos de horas operacionais por período nem de início/fim de reparo. |
| T7 — Teste com três técnicos | Aguardar as fichas do teste; tratar cada assunto em PR pequeno, com reprodução do problema. |
| T8 — QR, foto e assinatura | Aguardar o resultado do teste e as regras de privacidade do mantenedor. Essas funções não foram implementadas nesta rodada. |

## Troca dos modelos pelo novo pacote do mantenedor (25/10/2026)

PCMD-Modelos.zip substitui os seis editáveis e seis exemplos, preservados byte a byte. As 12
prévias PDF e COMO-USAR acompanham o pacote; manifesto SHA256 em public/modelos/manifesto.json.
Versão de integração 2.0.0 identifica novas emissões; histórico de emissões anteriores permanece.
Downloads do Banco de modelos incluem as prévias estáticas, inclusive offline.

Contrato remapeado para dados na linha 4 e cadastros consolidados. Pessoas/requisitos do PCMD-01
e setores do PCMD-02 usam seus blocos próprios. Expansão realoca blocos inferiores, fórmulas,
validações, formatação condicional, nomes definidos e referências entre abas. Área impressa cobre
o último registro preenchido. Fórmula do nome do tipo do ativo preservada. Na cópia gerada,
ConfigD29 verifica o total exportado de pessoas, sem contar requisitos como excesso de pessoas.
Os originais recebidos não foram corrigidos nem regravados.

Hashes dos modelos são conferidos antes do preenchimento para recusar arquivo antigo em cache.
Regressão de exportação: 41 pessoas, 42 referências, 60 setores, 100 ativos, tarefas diárias,
3.101 execuções e 1.101 falhas, sem sobreposição ou truncamento. Revisão independente confirmou
os ajustes. Conferência final de recálculo e impressão no Excel/LibreOffice continua pendente.

## Conferência da revisão antes de ativar (25/10/2026)

Editar vigência, elaborador ou resumo invalida a prévia. A confirmação também verifica o
rascunho, biblioteca, responsáveis/pessoas, capacidade, histórico, programação e data local.
Mudança nesses dados exige conferir novamente; não ativa um impacto diferente do apresentado.
Comparação por IDs entre tarefas ativas da última revisão e do rascunho, com antes/depois,
horas afetadas por especialidade, capacidade semanal separada e lista expansível das previsões
substituídas. Prévia sem novas ocorrências avisa para conferir o início do ciclo.

A revisão preparada só chega ao estado operacional após salvar. Durante a gravação, outras
execuções/cancelamentos aguardam nova tentativa; demonstração e restauração esperam o término.
Emissões documentais concorrentes permanecem na cópia gravada e na memória. Trocar de tela
durante a ativação não causa navegação posterior inesperada. Sem mudança de formato ou regras técnicas.
Regressões reproduziram prévia antiga, programação provisória sob quota e emissão concorrente.
Revisão independente somente leitura confirmou as correções com provas isoladas.

## Execução e histórico consultáveis (24/10/2026)

Busca por TAG/tarefa/responsável nas ocorrências, datas brasileiras e Concluídas pela data
realizada. Listas começam com 20 ocorrências e permitem carregar mais. Histórico com busca,
intervalo da realização, situação, paginação e JSON de todos os resultados filtrados; o arquivo
de consulta não substitui o backup completo. Registros legados e de ativos removidos permanecem.

Cancelar agora usa diálogo com foco inicial em Voltar e só confirma após a transação terminar.
Falha de gravação mantém a execução anterior; bloqueia refazer o vínculo enquanto cancela e
aguarda pendências antes de entrar na demonstração ou restaurar outra base. Revisão independente
reproduziu os casos de clone concorrente e demonstração; regressões cobrem as correções.
Erro síncrono de escrita no IndexedDB também aborta a transação e chega à interface.

Critérios: verificações completas, consulta/restauração com 100 ativos, plano anual e duas revisões,
quota, cancelamento por teclado e mudança de tela, sem contas ou dados reais. Conferência manual
em celular, leitor de tela, Office e com três técnicos continua pendente. Próximo item: validar
esses fluxos de uso com o mantenedor e os técnicos antes da liberação final.

## HTML offline da mesma publicação (24/10/2026)

Uma atualização guardou HTML HTTP anterior junto de arquivos do build novo, deixando uma
referência a CSS antigo sem recurso disponível. O worker agora incorpora o HTML final do próprio
build e guarda as três entradas equivalentes; recursos são baixados com cache HTTP recarregado.
Instalação continua atômica quanto à ativação, sem skipWaiting, apagamento de dados ou recarga forçada.
Regressão simula publicação B enquanto o HTTP da página principal ainda responde A.
Uma entrada identificada pela versão, descoberta em versao-atual.json, permite recuperação online
quando até as entradas fixas estão presas no cache anterior; não é a abertura offline habitual.

## Tipografia do slogan (24/10/2026)

Ajuste solicitado pelo mantenedor: slogan sem serifa em Arial/Helvetica, peso 700 e espaçamento
leve entre letras, para aproximar o texto da assinatura visual do logo. Mantidos texto, cor,
proporção do SVG e linha laranja única. Sem fontes externas ou dependências.

## Recuperação de uma aba com versão antiga (24/10/2026)

A aba do mantenedor continuava no HTML antigo, com atualização pendente. Reabrir ativou uma
versão intermediária. Verificar explicitamente registro.update() a cada abertura, com falha de
rede tolerada. A entrada atualizar.html usa o mesmo HTML e a mesma origem/base de dados;
permite abrir a publicação atual quando o worker antigo fixa a página inicial no cache.
Nenhum skipWaiting, recarregamento automático, exclusão de cache manual ou limpeza de dados.
Teste confere entradas idênticas, verificação offline tolerada e histórico preservado ao trocar a entrada.
A entrada recupera clientes anteriores que não a tinham no cache; não é uma URL permanentemente
sem cache. Após sua instalação, aplica-se a atualização segura por fechamento das abas.
Arquivos públicos de URL fixa ainda pertencem ao worker ativo; nenhum deles mudou nesta correção.

## Correção da assinatura da marca (24/10/2026)

O SVG horizontal já contém a linha laranja. O cabeçalho acrescentava uma segunda borda e
colocava o slogan dentro do link, propagando o sublinhado. Agora usa uma única imagem horizontal
com dimensões coerentes (1140 × 235), slogan separado e legível, sem borda adicional.
Regressão no navegador confere proporção, assinatura única e ausência de sobreposição em
320, 390, 820 e 1280 px, além das rotinas existentes.

## Handoff mobile e desktop do mantenedor (24/10/2026)

Aplicação da referência HTML do ZIP sobre os dados e serviços existentes. Navegação responsiva,
visão geral, execução em painel, filtros e histórico, consulta de ativos e falhas adaptadas.
Escopo, decisões preservadas e diferenças restantes em [HANDOFF-MOBILE.md](HANDOFF-MOBILE.md).
Revisão independente identificou e orientou correções de foco e de respostas atrasadas após navegação.

## Encontrar e conferir tarefas antes do PDF (24/10/2026)

A busca da comunidade passa a consultar nomes e códigos das máquinas, descrição/ID das tarefas,
especialidade e periodicidade. Aceita palavras em qualquer ordem e termos sem acentos; não altera
rótulos, IDs ou dados. Documentos PCMD usam a mesma comparação por palavras.
Cada máquina oferece uma prévia expansível com todas as tarefas, duração, origem, versão,
observações e identificação de segurança. O PDF continua sendo o download principal.
Escopo restrito ao banco de modelos da página inicial; catálogo colaborativo não foi alterado.
Validação inclui busca por tarefa no celular, abertura pelo teclado e preservação de 0,25 hora.
Lint, 205 testes e build aprovados. Roteiro completo no Chromium aprovado e fluxo afetado repetido
após a correção de precisão. Revisão independente aprovada após a correção.

## Moderação de comentários publicados (24/10/2026)

O botão de ocultar desaparecia após a aprovação. A moderação agora pode ocultar comentários
pendentes ou já publicados, usando a mesma permissão do servidor e preservando o registro.
Comentários ocultos não recebem novos botões. Regressão no Chromium com conta e respostas
fictícias confere a decisão enviada e o estado após a atualização. Nenhuma interação real alterada.

Verificação: lint, 203 testes, build e roteiro completo no Chromium aprovados; revisão independente
somente leitura aprovada. Envio e moderação com conta real continuam como validação manual.

## Modelos de máquinas e tarefas em PDF (24/10/2026)

O mantenedor confirmou dois fluxos: baixar fichas em PDF e publicar PDFs prontos na comunidade.
Primeira entrega: quatro fichas públicas geradas da biblioteca, com tarefas, periodicidades,
origem/versão, duração e segurança preservadas; JSON secundário e download offline.
Segunda entrega: anexo PDF privado durante revisão e download após aprovação, com verificação
no servidor e proteção contra troca do arquivo após a conferência do moderador. Não confundir
os PDFs da biblioteca com o upload comunitário, que exige validação própria.

As quatro fichas foram publicadas no PR 10. O mantenedor confirmou que o acesso funcionou.
O envio comunitário foi implementado com bucket privado, parser no servidor, limite de 5 MB/
200 páginas, arquivo imutável e decisão por versão. Validação local: 201 testes e roteiro de
navegador com banco isolado/API simulada; revisão independente confirmou as correções de
permissões e retomada. Backend implantado com JWT obrigatório e bloqueios anônimos conferidos.
O upload real autenticado de um arquivo escolhido pelo mantenedor ainda requer conferência.

Complemento: gerar ficha local pelos campos do formulário/catálogo e por tipo da Biblioteca
técnica. Abre prévia em outra aba e usa Imprimir / salvar PDF, sem enviar dados. Marca funciona
offline; textos e títulos longos são preservados. Verificação: 203 testes, navegador e revisão
independente, com correções de marca offline e título sem espaços.

## Sessão da comunidade entre abas (24/10/2026)

Correção delimitada: o catálogo consulta a sessão somente ao abrir, deixando a tela antiga
desconectada após login em outra aba. Observar eventos do SDK, preservar formulário durante
renovação da mesma conta, invalidar respostas anteriores e remover a assinatura ao sair da tela.
Testes com API simulada cobrem entrada/saída, salvamento e permissão atrasados e troca de conta
durante uma saída pendente. Login real por link aguarda o mantenedor entrar e avisar; não enviar
e-mail ou criar conteúdo real para simular a validação.

## Atualização offline segura (24/10/2026)

Pendência do plano aprovado: publicar uma versão nova com aba antiga aberta, sem interromper
o trabalho. Três falhas foram reproduzidas antes da correção: ativação forçada, mistura de
HTML/arquivos e propostas substituindo o HTML principal offline.

Critérios: nova versão espera todas as abas; aviso com orientação de backup; rascunho de
formulário e recursos antigos continuam disponíveis; versão incompleta não substitui a ativa;
dados fictícios persistem e caches de outros apps não são removidos. Conferência por testes
unitários e `scripts/verificar-atualizacao.mjs`, inclusive transição do worker publicado.

## Interface — logo horizontal e comunidade (24/10/2026)

Solicitação do mantenedor: assinatura horizontal com slogan e melhor experiência de uso.
Usar os vetores originais do kit; no celular, separar o slogan em texto de 12 px para preservar
a leitura. Cabeçalho com retorno à comunidade e acessos ao PCM/apoio, mantendo menu lateral
no computador e inferior no celular. Entrada com caminhos distintos para modelos e fábrica,
busca com contagem e recuperação de resultado vazio.

Conferir em 320, 390, 820 e 1280 px: proporção da marca, ausência de rolagem horizontal,
busca/categorias, foco por teclado, áreas de toque e download. Testes e screenshots constam
do roteiro de navegador; publicar pelo PR após revisão e verificações.

Esta é a fila atual. [MELHORIAS.md](MELHORIAS.md) guarda o diagnóstico e as entregas anteriores.
O processo de trabalho está em [EVOLUCAO-CONTINUA.md](EVOLUCAO-CONTINUA.md).
Uma implementação por vez. Um item só termina com evidência e revisão independente.

| ID | Prioridade | Problema e resultado esperado | Critério de conclusão | Situação |
|---|---|---|---|---|
| F-001 | Alta | Organizar trabalho por agentes e impedir publicação manual de ramos não integrados. | Instruções, fila e revisão independente registradas; testes aprovados; execução manual fora da main pula a publicação. | [PR #18](https://github.com/td9251156-creator/pcm-direto/pull/18) integrado; revisão semanal executada e aprovada. |
| F-002 | Alta | Tornar o teste de navegador totalmente previsível: fixar a ferramenta de teste, recusar porta já ocupada e limitar a espera pelo serviço offline. | Uma porta ocupada e um serviço offline que não inicia falham com mensagem e tempo limite; ferramentas só de teste, separadas do aplicativo. | Implementado e revisado: ferramenta isolada com lockfile, oito testes de regressão e roteiro real aprovados. |
| F-003 | Média | Executar a conferência de navegador na rotina automática após F-002. | Fluxos de celular, backup, checklist e geração offline rodando em máquina limpa; falhas bloqueiam a revisão. | [PR #22](https://github.com/td9251156-creator/pcm-direto/pull/22) integrado; navegador aprovado na revisão semanal e antes da publicação. |
| F-004 | Média | Conferir leitor de tela, celular real e arquivos no Excel antigo. | Registrar aparelho/programa e versão, passos e resultado; corrigir problemas encontrados sem usar dados reais. | Aguardando acesso aos aparelhos/programas. |
| F-005 | Média | Definir cálculo de MTBF, MTTR e disponibilidade, item 14 do diagnóstico. | Mantenedor define funcionamento, falha, reparo, período e tratamento de paradas planejadas; exemplos numéricos aprovados antes de implementar. | Aguardando definição técnica. |
| F-006 | Média | Definir janelas e paradas programadas, item 15 do diagnóstico. | Mantenedor aprova exemplos e limites; nenhuma tarefa de segurança pode ser adiada fora da regra definida. | Aguardando definição técnica. |
| F-007 | Média | Preservar o foco de teclado ao ajustar a capacidade por especialidade na Revisão. O redesenho do quadro remove o campo focado após a primeira seta. | Setas consecutivas continuam ajustando o mesmo campo; Tab segue a ordem normal sem recuperar foco indevidamente; capacidade, carga e salvamento permanecem corretos; regressão coberta por teste. | Implementado e revisado; 150 testes e Chromium aprovados. |


## Interface funcional — direção atual do mantenedor

O mantenedor criará os modelos Excel e Word e os enviará depois. Não continuar os geradores
PCMD nem integrar o PR #31 como dependência desta interface. Consulte o
[guia dos modelos e da interface](INTERFACE-E-MODELOS.md).

| ID | Resultado | Situação |
|---|---|---|
| I-01 | Cadastros M1–M6, criticidade, Plano Mestre, mensal, histórico completo e falhas, com backup compatível. | Implementado e revisado: 168 testes, build e roteiro completo no Chromium aprovados. PR aguardará revisão do mantenedor. |
| I-02 | Receber modelos originais do mantenedor e mapear seus campos aos dados existentes. | Aguardando os arquivos; não há importação ou preenchimento automático de templates nesta entrega. |

Os modelos futuros precisam preservar segurança, identificação dos registros, origem dos dados e
aviso. O guia descreve o conteúdo; não determina um formato de integração antes de receber os arquivos.

## F-007 — primeira tarefa da execução por agentes

- **Evidência:** em 20/10/2026, no Chromium, abrir Revisão com o exemplo fictício e focar
  `#cap-Operação`. Após `ArrowUp`, o valor passa a `0.5`, mas `document.activeElement` passa
  de `INPUT#cap-Operação` para `BODY`. A segunda seta não ajusta o campo. O evento `change`
  em `src/telas/revisao.js` substitui todo o conteúdo de `#carga`, removendo o elemento focado.
- **Impacto:** quem usa teclado precisa localizar e focar o campo de novo a cada ajuste.
- **Resultado:** manter o foco da mesma especialidade se a atualização acontecer com o campo
  ainda focado. Não puxar o foco de volta quando a alteração tiver sido confirmada por Tab ou blur.
- **Escopo:** `src/telas/revisao.js`, eventual auxiliar JavaScript de interface e teste de regressão
  JavaScript em `testes/`; atualizar esta fila. Não mudar regras de capacidade, biblioteca técnica,
  dados salvos, dependências ou automações. Uma implementação pequena, dentro dos limites do executor.
- **Como conferir:** a partir do campo vazio, duas setas para cima devem chegar a `1.0` com foco
  no mesmo campo; uma seta para baixo retorna a `0.5`. Tab segue para o próximo controle sem
  reiniciar a navegação. Conferir atualização da carga e persistência ao reabrir a tela. Um teste
  relevante deve reproduzir a perda de foco antes e passar depois; executar também as verificações
  completas e o roteiro de navegador existentes.
- **Diagnóstico:** agente separado, somente leitura, com reprodução no Chromium. A proposta do executor recebeu correção complementar nesta sessão: aguardar a navegação do Tab
  antes de redesenhar e preservar o destino escolhido pelo navegador. Foram acrescentados testes
  de Tab e desmontagem da tela e uma regressão no roteiro real do Chromium. Os novos testes
  falharam antes da correção. Lint, 150 testes, build e roteiro de navegador aprovados localmente,
  com revisão independente. A entrega deve seguir por PR revisado e ter publicação conferida;
  testes locais sozinhos não comprovam disponibilidade no site.

## Modelo para adicionar um item

- **Problema e evidência:** o que aconteceu e como reproduzir com dados fictícios.
- **Impacto:** quem é afetado e o que deixa de conseguir fazer.
- **Resultado esperado:** comportamento observável, sem escolher uma reescrita antecipadamente.
- **Escopo:** arquivos ou parte do produto; registrar também o que fica para depois.
- **Critérios de conclusão:** verificações que podem falhar se a mudança estiver incorreta.
- **Dependências e decisões:** o que precisa existir antes de começar.
- **Responsável e revisão:** coordenador, implementador e revisor; registrar apenas quem participou.
- **Evidência:** PR, resultado dos testes e limitações reais.

Não abrir tarefas públicas com dados pessoais, segredos ou detalhes de falhas de segurança ainda sem correção.

## Evidência da primeira rodada com agentes

- Coordenação e implementação delimitada, com um agente preparando as instruções e outro fazendo revisão independente somente leitura.
- Instalação, `npm run verificar`, 133 testes e roteiro `npm run test:navegador` aprovados.
- Auditoria de dependências em 20/10/2026: nenhum alerta informado pelo serviço.
- [Execução manual fora da main](https://github.com/td9251156-creator/pcm-direto/actions/runs/39420496553): verificação aprovada e publicação pulada.
- A revisão semanal e as propostas do Dependabot estão configuradas na main. [Primeira revisão semanal](https://github.com/td9251156-creator/pcm-direto/actions/runs/39421631200) executada com sucesso; as próximas agendas dependem das condições do GitHub.

## Rodada de ativação das rotinas

- Playwright e Chromium preparados com versão fixada e lockfile separado do app. As dependências de produção não mudaram.
- 141 testes de lógica e infraestrutura aprovados; roteiro completo no navegador aprovado com a ferramenta fixada.
- Revisão independente dos workflows, prazos, fechamento de recursos e correção da espera entre rotas.
- Dependabot já gerou propostas no repositório; nenhuma atualização é integrada sem a revisão aplicável.
- Modo escolhido: tarefas do Codex com login do ChatGPT Plus. O Actions continua com testes, auditorias e publicação; o fluxo de IA por API foi desativado no GitHub e fica sem agenda, com pausa explícita no código. Veja [AGENTES-GITHUB-ACTIONS.md](AGENTES-GITHUB-ACTIONS.md).
- [Diagnóstico após cadastro da chave](https://github.com/td9251156-creator/pcm-direto/actions/runs/39499911020):
  o Actions recebeu `OPENAI_API_KEY`; modelo ausente e ativação desabilitada. Não houve chamada à IA,
  portanto validade da chave, saldo e acesso ao modelo ainda não foram testados. Tentativas de salvar
  as duas variáveis pela integração retornaram HTTP 403; precisam ser cadastradas nas configurações do GitHub.


### Integração da marca final e 18 modelos — 26/10/2026

Integração autorizada pelo mantenedor à main atual, preservando Gestão, comunidade, persistência v3, revisões, execuções, falhas e os seis documentos de gestão. Manual final e fontes locais aplicados; banco adicional de 18 modelos em pasta própria, com busca, PDF e pacote essencial/completo/personalizado do rascunho. Formulários de emissão preservados em memória ao navegar; bloqueios próximos ao botão. Nenhuma migração de dados ou alteração no catálogo online.

Verificação local inicial: npm ci sem vulnerabilidades; lint, 239 testes e build aprovados. ZIP completo dos novos modelos conferido, com cinco parcialmente preenchidos e 13 manuais intactos; seleção essencial/manual, envio único entre telas e larguras de 320 a 1366 px aprovados. Revisão independente não realizada. Publicação segue por PR e verificação do Actions.


### Assinatura oficial do modelo — 26/10/2026

Correção solicitada pelo mantenedor: cabeçalho usa o SVG oficial horizontal com barra laranja e slogan incorporado, sem reconstrução em HTML. Página de apresentação e endpoints de logo alinhados. Fichas PDF públicas usam a imagem original extraída do modelo Excel e fontes Archivo locais. Modelos Office recebidos preservados. Contraste dos passos da apresentação corrigido. A publicação anterior foi autorizada; esta correção segue pelo mesmo fluxo de PR e CI.


### Revisão das imagens públicas da marca — 26/10/2026

Atualizadas a imagem social e as quatro capturas da página de apresentação. Assinatura oficial incorporada, fontes locais e capturas reais da demonstração isolada, apenas com dados fictícios. Metadados sociais ajustados para 1200×630 e endereço versionado para renovação da imagem compartilhada. Nenhuma mudança funcional ou nos dados de usuários.


### Logo oficial nos templates de gestão — 26/10/2026

Atualizados os seis modelos de gestão e seus seis exemplos: 44 imagens antigas substituídas pela assinatura oficial do modelo, mantendo a proporção. Versão 2.0.1-marca; contratos e manifesto atualizados com hashes de origem preservados. Comparação por partes OOXML comprova preservação de fórmulas, células, estilos, validações, proteção, gráficos e textos Word. Oito planilhas abertas e recalculadas no Excel sem erros, antes e depois. Prévia Excel regenerada no Excel; prévias Word recebem somente a nova imagem e sua matriz, com textos e páginas comparados e renderizados. A conversão PDF do Word nativo travou neste ambiente e não foi declarada aprovada. Os 18 modelos adicionais e seu ZIP já usavam o logo novo. Detalhes em REVISAO-LOGOS-TEMPLATES.md. Sem revisão independente.


### Assistente seguro e acessos por rotina — 26/10/2026

Reproduzido o envio duplicado: dois cliques em Guardar e continuar enfileiravam duas gravações. A etapa agora é preparada na cópia persistida e só chega ao estado visível após salvar. Avanço repetido é recusado também no estado; demonstração e restauração aguardam a operação pendente. Falha conserva etapa e campos, com acesso ao backup. Navegação durante a gravação não sofre substituição pela resposta antiga. Organização aceita Enter e mantém rascunho em memória por base de dados, sem misturar com demonstração/restauração.

Mais organizado em quatro grupos com busca por finalidade e acesso direto aos documentos da revisão e do rascunho. Nenhuma regra técnica, formato de backup, template Office ou biblioteca de tarefas alterado. Regressões específicas cobrem gravação lenta, falha, envio duplicado, teclado, busca e celular. Próximas entregas e validações humanas em PLANO-DESENVOLVIMENTO.md. Sem revisão independente nesta rodada.


## Documentos individuais e referências internas (26/10/2026)

O mantenedor definiu que o manual e o Design System orientam o padrão interno e não devem ser oferecidos a usuários. A tela da marca foi retirada; o endereço antigo leva ao catálogo de modelos. Os PPTX, ZIP da identidade e modelos-base Word/Excel foram preservados em PCM-Direto-Marca/Referencias-internas, fora do checkout e da publicação. Logos e fontes usados pelo produto permanecem.

Os modelos são baixados individualmente em Excel ou Word, com finalidade, orientação inicial e prévia PDF. Busca por palavras e filtro de finalidade reduzem a lista e permanecem na sessão ao navegar. O arquivo ZIP dos 18 modelos foi preservado em Templates/Arquivos-originais e retirado da distribuição. A importação futura não volta a copiá-lo para public.

Preencher um modelo gera um único arquivo com os equipamentos em edição; controles manuais dispensam cadastro. Documentos da revisão ativa também gera um arquivo por escolha, com data de corte e aprovação explícita. O histórico registra somente o documento emitido. Formulários mantêm envio único durante geração e navegação. A confirmação de aprovação fica expandida quando já marcada; falha de geração preserva os campos.

Foram removidos o download combinado antigo e o aviso ultrapassado de modelos “aguardando”. Revisão focada na experiência de documentos: não altera tarefas, critérios técnicos, templates Office, formato de backup ou esquema dos dados. Revisão independente e validação com usuários/aparelhos reais continuam pendentes. Ver docs/REVISAO-EXPERIENCIA-DOCUMENTOS.md (caminho a partir da raiz).

## Identidade do Figma e orientação de navegação — 26/10/2026

Pedido: aplicar e publicar melhorias do site; templates ficam para uma rodada futura.
Referência interna: https://www.figma.com/design/OCnoDOYbcfe1rfOJw0dvZM.
Foram consultados fundamentos, ações, formulários, navegação e feedback; a referência não é oferecida aos usuários.

A interface mantém o logo oficial e as fontes locais. Controles usam altura mínima de 48 px,
campos de texto com 16 px, raios de 4 px, cores de entrada/cálculo/erro e foco laranja texto.
Preservada a navegação inferior existente no celular. Subtelas destacam seu acesso de origem:
Cadastros e Plano Mestre em Planejar; modelos em Documentos; histórico em Executar.
Mais preserva a busca durante a sessão e permite limpar resultados vazios com foco no campo.

Escopo: nenhuma alteração em templates, geradores, biblioteca técnica, dados salvos, dependências
ou regras de manutenção. O teste de navegador reproduziu a ausência de localização em Cadastros
antes da correção. Regressões cobrem localização, troca de largura, busca, foco e estados dos campos.
Validação em aparelhos reais e leitor de tela permanece pendente.

Validação da rodada: npm ci concluído sem vulnerabilidades informadas; lint, 257 testes
em 36 arquivos e build aprovados. Revisão independente somente leitura identificou conflito de
especificidade na borda de erro e hover de botão secundário desabilitado; ambos corrigidos e
conferidos pelo revisor no Chromium com os CSS reais. Nenhum bloqueador restante no escopo.
O roteiro específico também confere os dois estados e aguarda o evento de mudança de largura
antes de verificar a navegação. Evidências locais em artifacts/identidade-figma-*.png.
