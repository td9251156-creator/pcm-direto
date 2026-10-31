# Biblioteca PCM v2 — preparação para integração

Fonte recebida: `NEW/Biblioteca-PCM-v2`. Inventário: 16 XLSX e 3 DOCX.
Os 19 arquivos foram copiados byte a byte para `public/modelos/biblioteca-v2`;
seus hashes, abas e tabelas estão em `src/dados/biblioteca-pcm-v2.json`.
Não substituem o catálogo PCMD anterior e não estão ligados à tela de downloads.
Nenhum arquivo original foi modificado. Nenhuma publicação ou migração foi executada.

## Identidade e compatibilidade

Identifique modelos por versão da biblioteca + código + revisão/hash.
Não relacione pelo número: nesta coleção 004 é OS, 008 é Falhas e 012 é Custos.
O antigo roteiro de 26 documentos não representa os 19 arquivos recebidos.
Não migrar códigos antigos automaticamente.

## Fontes para os três dashboards

| Visão | Fonte de registros | Situação |
|---|---|---|
| Manutenção e Programação | 004 / Ordens de Serviço / `tb_pcm_os` | Leitor de prévia disponível |
| Confiabilidade | 008 / Registro de falhas / `tb_pcm_falhas` | Leitor de prévia disponível; MTBF depende de horas de operação |
| Custos | 012 / Lançamentos / `tb_pcm_custos` | Leitor de prévia disponível; orçamento exige adaptador e escopo explícito |
| Cadastro de ativos | 004 / Cadastros / `tb_pcm_ativos` | Leitor de prévia disponível |

`src/integracao/biblioteca-pcm-v2.js` recebe arquivo, código explícito e ExcelJS
do carregamento existente: `lerBibliotecaV2(buffer, codigo, ExcelJS)`.
Retorna `{versao, codigo, bases, erros, avisos, apto}`. `apto` significa estrutura
e regras locais válidas para prévia, não autorização de gravação ou integridade
referencial completa com a base operacional. Não grava nem altera estado.
Antes de persistir: conferir TAGs, OS relacionadas, conflitos com dados existentes,
duplicidades entre arquivos e apresentar confirmação ao usuário.

As descrições `equipamento` são fórmulas; não viram chaves nem registros.
Descrição é resolvida depois pelo cadastro de ativos e TAG, sem depender de cache.
As linhas reais são obtidas do intervalo da tabela, não de capacidade fixa.
Ao ampliar templates, deslocar rodapés mesclados e ampliar fórmulas/validações;
não escrever simplesmente abaixo da tabela. O leitor não amplia ou exporta arquivos.

O ExcelJS não reconciliou os desenhos/comentários e relações absolutas destes
templates. A leitura usa uma cópia ZIP somente em memória, sem relações gráficas,
e normaliza os destinos das tabelas. Essa cópia serve apenas à análise de dados;
nunca exportá-la como documento. Para emissão, preencher a cópia OOXML integral
do original, preservando imagens, comentários, fórmulas, estilos e proteção.

## Limitações de interpretação

- 003: planners são grades, não uma lista de eventos com datas de execução.
  O anual tem 5 posições por mês (60), não 52/53 semanas ISO. Não somar as três
  grades. No mensal, validar dias inexistentes antes de qualquer análise.
- 004: formulário avulso e tabela de OS não têm sincronização presumida.
  A tabela é a fonte principal; não duplicar registros do formulário.
- 008: intervalos permitem indisponibilidade e reparo. Não há horas efetivas de
  operação por TAG nesta coleção. Não inferir funcionamento contínuo nem MTBF.
- 011: consolidado mensal manual, sem TAG estruturada. Não somar com eventos.
  Fórmulas da planilha não substituem aprovação técnica das definições.
- 012: orçamento está em B8:M11, ano A4. B4 filtra o realizado por setor; não
  define a titularidade dos valores orçados. Confirmar escopo antes de desdobrar.
- DOCX017–019 atualizados: possuem controles Word para `titulo`, `codigo`,
  `organizacao`, `elaborado`, `aprovado`, `data` e `revisao`, distribuídos pelo
  corpo, cabeçalho e rodapé. O corpo também contém orientações entre colchetes,
  sem contrato completo de preenchimento. Emissão automática não implementada.

## Atualização recebida em 31/10/2026

Os modelos 002, 017, 018 e 019 foram substituídos pelas cópias integrais enviadas
em `envio do mantenedor (Biblioteca-PCM-v2)` (Word na subpasta `Word`).
As cópias de referência em `NEW/Biblioteca-PCM-v2` e as cópias públicas locais
foram sincronizadas; as versões anteriores estão em
`outputs/backup-biblioteca-v2-20261031-004828`, na raiz do projeto.
Manifesto atualizado para `biblioteca-pcm-v2.0.1`, com novos hashes e tamanhos.
O 002 agora possui sete abas; as abas separadas de notas da criticidade e FMECA
foram removidas. As cinco tabelas de cadastro/revisões mantêm campos e intervalos.
Os metadados dos controles Word estão registrados no manifesto, sem ativar emissão.
As fontes 004, 008 e 012 não mudaram: os dados fictícios continuam compatíveis
com essas fontes. O pacote de demonstração anterior não foi reescrito.
Esta atualização não valida fórmulas técnicas, conteúdo normativo ou layout dos
arquivos recebidos; preserva os documentos sem edição e confere sua estrutura.
Verificação desta atualização: `npm run verificar` aprovado (lint, 265 testes
em 37 arquivos e build). Revisão independente estrutural concluída sem achados.
Testes de navegador não repetidos: não houve alteração de interface, lógica de
importação, persistência ou exportação; apenas cópias de referência e metadados.

## Dashboards implementados com a demonstração (31/10/2026)

Desde 31/10 os dashboards leem por padrão a base local (`src/logica/dashboards/fonte-operacao.js`); a demonstração
(`src/dados/demo-dashboards.json`, fictícia) abre só em `#dashboards?fonte=demo`, com selo. As duas passam pela mesma
normalização (`src/logica/dashboards/fonte.js`). Ver "Dados reais" abaixo.

Regras de cálculo (mesma função para cartões, gráficos, tabela, frases e exportação):
- **Manutenção:** abertas = sem conclusão e sem status Concluída/Cancelada, abertas até a referência; atrasadas = abertas
  com data prevista anterior à referência; sem prazo = "Sem programação"; backlog = soma das horas restantes (incompleto
  se faltar); cumprimento = concluídas no período dentro do prazo ÷ concluídas no período com prazo (prazo atual, não o original).
- **Confiabilidade:** falhas contadas pelo início da falha no período; indisponibilidade e reparo = união dos intervalos por
  TAG recortada ao período; falhas abertas ficam fora das horas e sinalizadas. MTBF, MTTR e disponibilidade não são calculados.
- **Custos:** realizado por data do lançamento; orçado = soma das competências do período (setor × categoria × mês, repetidos
  ignorados); desvio = realizado − orçado; consumo = realizado ÷ orçado com orçado > 0. Mês parcial é sinalizado.
  Filtros: período e setor (família/TAG não existem no orçamento).
- Mapas de categoria: rótulos MATERIAL, MAO_OBRA, TERCEIROS e OUTROS; valores originais preservados.

Como atualizar o período: a referência e o período vêm de `metadados`; o usuário pode restringir por datas na tela.
HTML exportado: retrato com resultados calculados, sem registros brutos, scripts ou recursos externos.

## Dados reais: importação, armazenamento e dashboards (31/10/2026)

**Onde:** Mais → Dados e apoio → Importar dados da operação (`#importar-operacao`). Lógica pura em
`src/logica/operacao.js`; gravação em `importarOperacao` (`src/estado.js`); leitor em `src/integracao/biblioteca-pcm-v2.js`.

**Fontes e chaves estáveis:** ativos (004, aba Cadastros, `tag`), OS (004, `numero_os`), falhas (008, `referencia_falha`),
custos (012, `referencia_lancamento`), orçamento (012, grade "Orçamento anual": competência + categoria).

**Antes de gravar:** estrutura da tabela (bloqueia o arquivo inteiro), tipos, datas reais do calendário, códigos padronizados,
obrigatórios, limites (chave 120, texto 2000), TAG cadastrada (no 004 ou no plano; custo pode ser sem TAG), duplicidade no
arquivo, conflito com o salvo. Falha citando OS inexistente entra com aviso. Linha com erro é recusada com linha e motivo.

**Reimportação:** mesma chave e mesmo conteúdo = ignorado; conteúdo diferente = conflito mantido como está, salvo se o
usuário marcar "substituir" (a versão anterior fica em `importacoes[].substituidos`); nada é apagado por importação.
A confirmação é recusada se a base ou as TAGs do plano mudaram depois da prévia, ou se outra aba gravou antes.

**Armazenamento:** sem migração do IndexedDB (continua formato 3). A gestão passa à **versão 3** só ao importar, com
`gestao.operacao = {versao:1, ativos, ordens_servico, falhas, custos_manutencao, orcamento, importacoes}`, validada por
`validarOperacao`. Backups 1, 2 e 3 sem operação continuam válidos; versões antigas do app recusam uma base v3 sem descartá-la.
O backup completo inclui a operação. Gravação única: em falha, a memória volta ao estado anterior e a base não muda.

**Orçamento:** a grade só é aceita com setor vazio (B4) e ano em A4; vira orçamento geral (`setor: null`), comparado só sem
filtro de setor. Célula vazia = ausente (não zero); meses do período sem orçamento deixam orçado/desvio/consumo parciais.

**Confiabilidade:** contagem pelo dia de início; horas = trecho de cada intervalo dentro do período (inclui falhas iniciadas
antes, que não contam como evento). Falhas registradas no app (só data) não entram nos dashboards e geram aviso.

**Período padrão real:** do registro mais antigo até hoje; mês inicial e final incompletos marcados como parciais.

## PCM-MAN-002 preenchido (31/10/2026)

Gerador `src/saida/biblioteca-v2-xlsx.js` (edita só o XML das células de uma cópia integral; hash conferido) e dados em
`src/logica/biblioteca-v2-dados.js`. Mapeamento: Leia-me D13/D14 (elaborado/aprovado, aprovado só se confirmado);
Cadastros A–D (ativos da revisão ativa), F (pessoas), H (famílias = tipo da biblioteca), J (setores); Plano a partir da linha 21
(TAG, atividade — com "(tarefa de segurança)" quando for —, A cada (dias), responsável, duração, 1ª execução); Cronograma
A4 = ano da data de corte. Periodicidade → dias: Diária 1, Semanal 7, Quinzenal 14, Mensal 30, Bimestral 60, Trimestral 90,
Semestral 180, Anual 365 (convenção a confirmar). Em branco: Criticidade, FMECA, componente, tipo de tarefa, exige parada.
Ampliação: linhas abaixo deslocadas; fórmulas de todas as abas, nomes, impressão, tabelas, validações, formatação condicional
e mesclagens ajustadas. Conferência: teste com 100 ativos e Excel local (940 atividades, 0 erro de fórmula).

## Próxima implementação

Dados fictícios adaptados em
`outputs/pcm-dados-demo-biblioteca-v2-20261031/PCM_Dados_DEMO_Biblioteca_v2`
na raiz do projeto. Há 1.893 registros em seis bases, JSON tipado e CSVs equivalentes.
Família, equipamento e campos adicionais de falhas foram adaptados ao contrato novo.
Operação e orçamento continuam fontes complementares, com escopo explícito.
Os 12 ativos, 440 OS, 124 falhas e 701 custos foram testados no leitor real de prévia
usando buffers XLSX em memória com os schemas da biblioteca; nenhum template foi alterado.
Não há importação operacional automática desses CSVs/JSON.

Histórico: a ligação da prévia ao fluxo real foi feita em 31/10 (seção acima). Próximo: preencher 001, 008, 018 e 019,
um por vez, e as decisões D1–D3 de `FILA.md`. Operação permanece local; nenhum registro privado vai para o repositório.

Publicação depende da aprovação explícita do mantenedor da versão apresentada.

## Verificações desta preparação

- 19 originais e cópias conferidos por SHA256.
- 8 testes específicos: leitura dos arquivos reais, datas, zeros, ausência de horas,
  duplicidades, domínios, expansão de intervalo e intervalos de reparo.
- Revisão independente aprovada no escopo de preparação/prévia.
- `npm run verificar`: lint, 265 testes em 37 arquivos e build aprovados.
- `npm run test:navegador`: regressões existentes aprovadas; não representa teste
  de uma nova interface de importação, que não foi implementada.
