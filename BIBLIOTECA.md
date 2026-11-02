# Biblioteca técnica

Todas as tarefas de manutenção ficam em **um único arquivo**: [`src/dados/biblioteca.json`](src/dados/biblioteca.json).

Na comunidade, “Máquinas e tarefas” oferece fichas em PDF para leitura e impressão.
Os dados JSON continuam em “Outros formatos”. Os 47 PDFs são gerados diretamente da
biblioteca, sem mudar tarefas, periodicidades ou avisos, por `scripts/gerar-modelos-pdf.py`
(Python 3 e ReportLab 4.4.9). Depois de editar a biblioteca, regenere os PDFs e confira
todas as páginas. Os testes detectam PDFs cuja fonte não corresponde à biblioteca atual.
Você pode editar esse arquivo no VS Code (ou no próprio site do GitHub) sem programar.

Outra forma: no app, abra **Biblioteca técnica** (link na tela Início). Lá dá para editar tarefas, criar
tipos e baixar o arquivo `biblioteca.json` pronto para substituir o do projeto. As tarefas de segurança que
vêm com o app continuam travadas: só aceitam periodicidade igual ou mais frequente e não podem ser apagadas.

> **Aviso:** O material apoia a organização do PCM e não substitui a avaliação de profissional habilitado nem o
> texto oficial das normas. As periodicidades são base genérica e devem ser confirmadas com o manual do fabricante.

## Como o arquivo é organizado

```text
biblioteca
├── nome, versao, data, aviso      ← dados da biblioteca inteira
└── tipos                          ← um bloco por tipo de equipamento
    ├── id, nome, sigla
    └── tarefas                    ← uma linha por tarefa
```

### Campos do tipo de equipamento

| Campo   | O que é                                         | Exemplo            |
|---------|-------------------------------------------------|--------------------|
| `id`    | Código interno, minúsculo, sem acento nem espaço | `compressor_ar`    |
| `nome`  | Nome que aparece nas telas e planilhas           | `Compressor de ar` |
| `sigla` | 3 letras maiúsculas, usadas na TAG               | `CMP`              |

### Campos de cada tarefa

| Campo           | O que é                                                    | Exemplo |
|-----------------|------------------------------------------------------------|---------|
| `id`            | Código único da tarefa (sigla + número)                    | `CMP-06` |
| `descricao`     | O que fazer, em linguagem de chão de fábrica               | `Testar o funcionamento da válvula de segurança` |
| `periodicidade` | Uma destas palavras, exatamente assim: `Diária`, `Semanal`, `Quinzenal`, `Mensal`, `Bimestral`, `Trimestral`, `Semestral`, `Anual` | `Mensal` |
| `especialidade` | Quem executa                                               | `Mecânica`, `Elétrica`, `Lubrificação`, `Preditiva`, `Operação`, `Instrumentação` |
| `duracao_horas` | Tempo estimado por execução, em horas (use ponto: `0.5`)   | `0.5` |
| `seguranca`     | `true` se a tarefa é de segurança, `false` se não é         | `true` |
| `origem`        | De onde veio a regra                                       | `base genérica a validar com manual do fabricante` |
| `versao`        | Versão da regra; aumente quando mudar a tarefa             | `0.1.0` |
| `observacao`    | Cuidado, exceção ou ponto a verificar (pode ficar `""`)    | `Executar com o equipamento desenergizado e bloqueado.` |

### Regras importantes

- **Tarefa de segurança (`"seguranca": true`)**: no app, o usuário só pode manter ou aumentar a frequência
  (ex.: de Mensal para Semanal) e não pode retirar a tarefa do plano.
- **Origem**: ao confirmar uma tarefa em um manual, troque a origem por algo como
  `"manual do fabricante <modelo>, rev. <número>, <data>"`. Não escreva número de norma sem a fonte oficial,
  a versão e a data em mãos. Na dúvida, escreva `"verificar na fonte oficial"` na observação.
- **Sem acento no `id`**, sem vírgula sobrando no fim das listas e com aspas duplas em todos os textos
  (o formato JSON é rígido). Se algo quebrar, o comando `npm test` aponta o erro.
- **Códigos únicos:** o `id` do tipo aceita letras minúsculas, números e sublinhado (`_`);
  o da tarefa aceita letras sem acento, números, hífen (`-`) e sublinhado. Não repita códigos de tipos
  nem códigos de tarefas. `tipos` e `tarefas` devem ser listas, mesmo quando vazias.
- **Duração numérica:** escreva `0.5`, sem aspas, e sempre maior que zero. Descrição, especialidade,
  origem e versão devem ser textos preenchidos. Ao importar um arquivo inválido pelo app, a biblioteca
  em uso é mantida e a mensagem indica o primeiro problema.
- O cronograma usa semanas. Tarefa `Diária` aparece em todas as semanas, contando 5 dias úteis por semana
  nas horas (ex.: 0,25 h por dia = 1,25 h na semana).

### Como adicionar um novo tipo de equipamento

1. Copie um bloco de tipo inteiro (de `{` até `}`) e cole depois do último, separando com vírgula.
2. Troque `id`, `nome` e `sigla` (a sigla não pode repetir).
3. Ajuste as tarefas, com `id` novos.
4. Rode `npm test` para conferir o arquivo.

## Checklist de revisão, tarefa por tarefa

Para cada tarefa, confira com o manual do fabricante e a sua experiência de PCM:

1. A tarefa se aplica a este tipo de equipamento (ou só a alguns modelos)?
2. A descrição está clara para quem vai executar?
3. A periodicidade bate com o manual e com o regime real de uso (horas, turnos, ambiente)?
4. A especialidade e o tempo estimado estão corretos?
5. A marcação de segurança está certa? (Na dúvida, mantenha como segurança.)
6. Há exigência legal ou normativa? Se sim, registre a fonte oficial, a versão e a data; se não tiver a fonte, escreva "verificar na fonte oficial".
7. Atualize `origem` e `versao` da tarefa depois de revisar.

Marque `[x]` na coluna OK quando a tarefa estiver revisada.
<!-- Checklist gerado a partir da biblioteca versão 0.3.0 -->

### Motor elétrico (MOT)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | MOT-01 | Inspeção visual e limpeza externa da carcaça, aletas e entrada de ventilação | Mensal | Elétrica | 0.5 | Não |  |
| [ ] | MOT-02 | Verificar ruído e vibração anormal (sensitiva ou com coletor de vibração) | Mensal | Preditiva | 0.5 | Não |  |
| [ ] | MOT-03 | Medir corrente nas três fases e comparar com a corrente nominal da placa | Trimestral | Elétrica | 0.5 | Não |  |
| [ ] | MOT-04 | Medir temperatura da carcaça e dos mancais (termômetro ou termografia) | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | MOT-05 | Lubrificar rolamentos com o tipo e a quantidade de graxa indicados pelo fabricante | Trimestral | Lubrificação | 0.5 | Não |  |
| [ ] | MOT-06 | Reapertar conexões da caixa de ligação e verificar estado dos cabos e prensa-cabos | Semestral | Elétrica | 1 | **Sim** |  |
| [ ] | MOT-07 | Verificar continuidade do aterramento da carcaça | Anual | Elétrica | 0.5 | **Sim** |  |
| [ ] | MOT-08 | Medir resistência de isolamento dos enrolamentos (megômetro) e registrar o valor | Anual | Elétrica | 1 | Não |  |

### Compressor de ar (CMP)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | CMP-01 | Drenar condensado do reservatório e dos filtros (ou verificar o dreno automático) | Semanal | Operação | 0.25 | Não |  |
| [ ] | CMP-02 | Verificar nível de óleo do compressor | Semanal | Lubrificação | 0.25 | Não |  |
| [ ] | CMP-03 | Limpar ou trocar o filtro de ar de admissão | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CMP-04 | Verificar vazamentos de ar em conexões, mangueiras e linha próxima | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CMP-05 | Inspecionar correias (tensão e desgaste) e fixação das proteções de partes móveis | Mensal | Mecânica | 0.5 | **Sim** |  |
| [ ] | CMP-06 | Testar o funcionamento da válvula de segurança (alívio de pressão) | Mensal | Mecânica | 0.25 | **Sim** |  |
| [ ] | CMP-07 | Conferir manômetros e pressostato (pressões de carga e alívio) | Trimestral | Instrumentação | 0.5 | **Sim** |  |
| [ ] | CMP-08 | Trocar óleo e filtro de óleo | Semestral | Lubrificação | 2 | Não |  |
| [ ] | CMP-09 | Trocar elemento separador ar/óleo (compressor de parafuso) | Anual | Mecânica | 2 | Não |  |
| [ ] | CMP-10 | Inspecionar externamente o reservatório: corrosão, suportes, identificação e acessórios | Anual | Mecânica | 1 | **Sim** |  |
| [ ] | CMP-11 | Inspecionar a linha de descarga e os pontos de travamento de pressão | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CMP-12 | Conferir termografia e vibração das partes móveis do conjunto compressor | Trimestral | Preditiva | 1 | Não |  |
| [ ] | CMP-13 | Verificar funcionamento do secador de ar e o estado do filtro de separação | Mensal | Operação | 0.5 | Não |  |

### Bomba centrífuga (BCF)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | BCF-01 | Verificar vazamento na vedação (selo mecânico ou gaxeta) | Semanal | Operação | 0.25 | Não |  |
| [ ] | BCF-02 | Registrar pressões de sucção e recalque e comparar com o ponto de operação | Mensal | Operação | 0.25 | Não |  |
| [ ] | BCF-03 | Verificar ruído, vibração e temperatura dos mancais | Mensal | Preditiva | 0.5 | Não |  |
| [ ] | BCF-04 | Verificar fixação e estado da proteção do acoplamento | Mensal | Mecânica | 0.25 | **Sim** |  |
| [ ] | BCF-05 | Lubrificar mancais ou verificar nível de óleo do suporte de mancais | Trimestral | Lubrificação | 0.5 | Não |  |
| [ ] | BCF-06 | Inspecionar acoplamento e elemento elástico | Semestral | Mecânica | 1 | Não |  |
| [ ] | BCF-07 | Verificar alinhamento entre motor e bomba | Semestral | Mecânica | 2 | Não |  |
| [ ] | BCF-08 | Reapertar base, chumbadores e flanges | Anual | Mecânica | 1 | Não |  |
| [ ] | BCF-09 | Inspeção interna: rotor, anéis de desgaste e folgas | Anual | Mecânica | 4 | Não |  |

### Ponte rolante (PRL)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | PRL-11 | Verificação antes do uso pelo operador: freios, fim de curso, botoeira, gancho e trava, ruídos anormais | Diária | Operação | 0.25 | **Sim** |  |
| [ ] | PRL-01 | Testar freios de elevação, carro e ponte (sem carga) | Semanal | Mecânica | 0.5 | **Sim** |  |
| [ ] | PRL-02 | Testar limites de fim de curso de elevação, carro e ponte | Semanal | Elétrica | 0.5 | **Sim** |  |
| [ ] | PRL-03 | Testar botoeira ou controle remoto, incluindo o botão de emergência | Semanal | Elétrica | 0.25 | **Sim** |  |
| [ ] | PRL-04 | Inspecionar cabo de aço: fios rompidos, amassamentos, corrosão e lubrificação | Mensal | Mecânica | 1 | **Sim** |  |
| [ ] | PRL-05 | Inspecionar gancho, trava de segurança e moitão (trincas, deformação, abertura) | Mensal | Mecânica | 0.5 | **Sim** |  |
| [ ] | PRL-06 | Verificar nível de óleo e vazamentos dos redutores | Mensal | Lubrificação | 0.5 | Não |  |
| [ ] | PRL-07 | Lubrificar cabo de aço, rodas, mancais e engrenagens abertas | Trimestral | Lubrificação | 2 | Não |  |
| [ ] | PRL-08 | Inspecionar barramento ou festoon, coletores de corrente e painel elétrico | Trimestral | Elétrica | 1 | **Sim** |  |
| [ ] | PRL-09 | Inspecionar trilhos, rodas, batentes e para-choques | Semestral | Mecânica | 3 | **Sim** |  |
| [ ] | PRL-10 | Inspeção geral da estrutura, fixações e placa de capacidade, por profissional habilitado | Anual | Mecânica | 4 | **Sim** |  |

### Transportador de correia (TRC)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | TRC-01 | Testar os dispositivos de parada de emergência (botoeiras e cabo de emergência) | Semanal | Operação | 0.25 | **Sim** |  |
| [ ] | TRC-02 | Verificar alinhamento da correia (desvio lateral) e estado dos raspadores | Semanal | Operação | 0.25 | Não |  |
| [ ] | TRC-03 | Inspecionar fixação e estado das proteções de polias, tambores e pontos de agarramento | Mensal | Mecânica | 0.5 | **Sim** |  |
| [ ] | TRC-04 | Verificar tensão e desgaste da correia e das emendas | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRC-05 | Verificar rolos de carga e de retorno: giro livre, ruído e desgaste | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRC-06 | Verificar nível de óleo e vazamentos do redutor de acionamento | Mensal | Lubrificação | 0.25 | Não |  |
| [ ] | TRC-07 | Lubrificar mancais dos tambores com o tipo e a quantidade de graxa indicados pelo fabricante | Trimestral | Lubrificação | 0.5 | Não |  |
| [ ] | TRC-08 | Verificar ruído, vibração e temperatura do conjunto motor e redutor | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | TRC-09 | Trocar o óleo do redutor de acionamento | Anual | Lubrificação | 1 | Não |  |

### Ventilador ou exaustor industrial (VEN)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | VEN-01 | Verificar ruído e vibração anormal | Mensal | Preditiva | 0.25 | Não |  |
| [ ] | VEN-02 | Inspecionar fixação e estado das proteções e telas na entrada e na saída de ar | Mensal | Mecânica | 0.25 | **Sim** |  |
| [ ] | VEN-03 | Inspecionar correias (tensão e desgaste) e polias | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | VEN-04 | Limpar rotor e carcaça, removendo acúmulo de pó ou gordura | Trimestral | Mecânica | 1 | Não |  |
| [ ] | VEN-05 | Lubrificar mancais com o tipo e a quantidade de graxa indicados pelo fabricante | Trimestral | Lubrificação | 0.5 | Não |  |
| [ ] | VEN-06 | Medir a temperatura dos mancais | Trimestral | Preditiva | 0.25 | Não |  |
| [ ] | VEN-07 | Verificar fixação da base, chumbadores e amortecedores | Semestral | Mecânica | 0.5 | Não |  |
| [ ] | VEN-08 | Verificar estado de dutos, juntas flexíveis e dampers | Semestral | Mecânica | 1 | Não |  |

### Unidade hidráulica (UHD)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | UHD-01 | Verificar nível e aspecto do óleo no reservatório | Semanal | Operação | 0.25 | Não |  |
| [ ] | UHD-02 | Verificar vazamentos em mangueiras, conexões e cilindros | Semanal | Operação | 0.25 | Não |  |
| [ ] | UHD-03 | Registrar pressão de trabalho e temperatura do óleo e comparar com os valores de referência | Semanal | Operação | 0.25 | Não |  |
| [ ] | UHD-04 | Verificar o indicador de saturação do filtro de retorno | Mensal | Mecânica | 0.25 | Não |  |
| [ ] | UHD-05 | Inspecionar mangueiras: ressecamento, abrasão, dobras e fixação | Mensal | Mecânica | 0.5 | **Sim** |  |
| [ ] | UHD-06 | Verificar funcionamento da válvula de alívio e dos manômetros | Trimestral | Instrumentação | 0.5 | **Sim** |  |
| [ ] | UHD-07 | Limpar o trocador de calor (radiador ou resfriador de óleo) | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | UHD-08 | Trocar os elementos filtrantes de retorno e de respiro | Semestral | Mecânica | 1 | Não |  |
| [ ] | UHD-09 | Coletar amostra de óleo para análise ou trocar o óleo conforme o fabricante | Anual | Lubrificação | 2 | Não |  |

### Bobinadeira de filme (BOB)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | BOB-01 | Inspecionar visualmente a bobinadeira de filme | Diária | Operação | 0.25 | Não |  |
| [ ] | BOB-02 | Verificar limpeza, fixação e sinais de desgaste da bobinadeira de filme | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | BOB-03 | Avaliar ruído, vibração e aquecimento anormal da bobinadeira de filme | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | BOB-04 | Inspecionar o rolo, o eixo e o mandril quanto a fixação, desgaste e condição de contato | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | BOB-05 | Verificar a resposta do controle de tensão e o estado do conjunto de corte | Trimestral | Operação | 0.5 | Não |  |
| [ ] | BOB-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | BOB-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Bomba de vácuo (BDV)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | BDV-01 | Inspecionar visualmente a bomba de vácuo | Diária | Operação | 0.25 | Não |  |
| [ ] | BDV-02 | Verificar limpeza, fixação e sinais de desgaste da bomba de vácuo | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | BDV-03 | Avaliar ruído, vibração e aquecimento anormal da bomba de vácuo | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | BDV-04 | Inspecionar a bomba, o acoplamento e a base quanto a vazamento, fixação e desgaste | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | BDV-05 | Verificar filtro, conexões e tubulação quanto a obstrução e entrada de ar | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | BDV-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | BDV-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Calandra de borracha (CDB)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | CDB-01 | Inspecionar visualmente a calandra de borracha | Diária | Operação | 0.25 | Não |  |
| [ ] | CDB-02 | Verificar limpeza, fixação e sinais de desgaste da calandra de borracha | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CDB-03 | Avaliar ruído, vibração e aquecimento anormal da calandra de borracha | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | CDB-04 | Inspecionar rolos, mancais e raspadores quanto a desgaste, fixação e condição superficial | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CDB-05 | Verificar o ajuste de abertura e a uniformidade do aquecimento dos rolos | Trimestral | Operação | 0.5 | Não |  |
| [ ] | CDB-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CDB-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Calibrador e tanque de vácuo (CAL)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | CAL-01 | Inspecionar visualmente o calibrador e tanque de vácuo | Diária | Operação | 0.25 | Não |  |
| [ ] | CAL-02 | Verificar limpeza, fixação e sinais de desgaste do calibrador e tanque de vácuo | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CAL-03 | Avaliar ruído, vibração e aquecimento anormal do calibrador e tanque de vácuo | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | CAL-04 | Inspecionar o calibrador, a camisa e os pontos de contato quanto a desgaste e obstrução | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CAL-05 | Verificar vácuo, circulação de água e conexões do tanque | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | CAL-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CAL-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Resfriador de água (chiller) (CHI)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | CHI-01 | Inspecionar visualmente o resfriador de água (chiller) | Diária | Operação | 0.25 | Não |  |
| [ ] | CHI-02 | Verificar limpeza, fixação e sinais de desgaste do resfriador de água (chiller) | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CHI-03 | Avaliar ruído, vibração e aquecimento anormal do resfriador de água (chiller) | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | CHI-04 | Inspecionar conexões, trocador e circuito de água quanto a vazamento e sujeira | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CHI-05 | Verificar funcionamento do compressor, ventilação e indicação de temperatura | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | CHI-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CHI-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |
| [ ] | CHI-08 | Limpar a unidade de água gelada e os compressores | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CHI-09 | Verificar vazamentos no circuito de água gelada | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CHI-10 | Verificar o nível de óleo conforme o manual | Mensal | Lubrificação | 0.5 | Não |  |

### Máquina de corte de borracha (CDR)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | CDR-01 | Inspecionar visualmente a máquina de corte de borracha | Diária | Operação | 0.25 | Não |  |
| [ ] | CDR-02 | Verificar limpeza, fixação e sinais de desgaste da máquina de corte de borracha | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CDR-03 | Avaliar ruído, vibração e aquecimento anormal da máquina de corte de borracha | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | CDR-04 | Inspecionar lâmina, porta-lâmina e fixações quanto a desgaste e dano | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CDR-05 | Verificar mesa, guias e acionamento do corte quanto a alinhamento e funcionamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | CDR-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | CDR-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Dosador gravimétrico (DOS)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | DOS-01 | Inspecionar visualmente o dosador gravimétrico | Diária | Operação | 0.25 | Não |  |
| [ ] | DOS-02 | Verificar limpeza, fixação e sinais de desgaste do dosador gravimétrico | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | DOS-03 | Avaliar ruído, vibração e aquecimento anormal do dosador gravimétrico | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | DOS-04 | Verificar células de carga, balança e fixações quanto a sujeira, dano e estabilidade da leitura | Mensal | Instrumentação | 0.5 | Não |  |
| [ ] | DOS-05 | Inspecionar alimentadores, válvulas e conexões quanto a obstrução e vazamento de material | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | DOS-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | DOS-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Extrusora de dupla rosca (EDD)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | EDD-01 | Inspecionar visualmente a extrusora de dupla rosca | Diária | Operação | 0.25 | Não |  |
| [ ] | EDD-02 | Verificar limpeza, fixação e sinais de desgaste da extrusora de dupla rosca | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | EDD-03 | Avaliar ruído, vibração e aquecimento anormal da extrusora de dupla rosca | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | EDD-04 | Inspecionar roscas, cilindro e pontos de aquecimento quanto a desgaste e condição superficial | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | EDD-05 | Verificar alimentação, degasagem e conexões quanto a obstrução e vazamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | EDD-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | EDD-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Extrusora monorrosca (EXT)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | EXT-01 | Inspecionar visualmente a extrusora monorrosca | Diária | Operação | 0.25 | Não |  |
| [ ] | EXT-02 | Verificar limpeza, fixação e sinais de desgaste da extrusora monorrosca | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | EXT-03 | Avaliar ruído, vibração e aquecimento anormal da extrusora monorrosca | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | EXT-04 | Inspecionar rosca, cilindro e pontos de aquecimento quanto a desgaste e condição superficial | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | EXT-05 | Verificar alimentação, matriz e conexões quanto a obstrução e vazamento de material | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | EXT-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | EXT-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Gerador de nitrogênio (GDN)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | GDN-01 | Inspecionar visualmente o gerador de nitrogênio | Diária | Operação | 0.25 | Não |  |
| [ ] | GDN-02 | Verificar limpeza, fixação e sinais de desgaste do gerador de nitrogênio | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | GDN-03 | Avaliar ruído, vibração e aquecimento anormal do gerador de nitrogênio | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | GDN-04 | Inspecionar o gerador e os módulos de separação quanto a alarmes, sujeira e condição externa | Mensal | Operação | 0.5 | Não |  |
| [ ] | GDN-05 | Verificar filtros, conexões e pressão da rede de nitrogênio quanto a vazamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | GDN-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | GDN-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Granulador (moinho de facas) (GRA)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | GRA-01 | Inspecionar visualmente o granulador (moinho de facas) | Diária | Operação | 0.25 | Não |  |
| [ ] | GRA-02 | Verificar limpeza, fixação e sinais de desgaste do granulador (moinho de facas) | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | GRA-03 | Avaliar ruído, vibração e aquecimento anormal do granulador (moinho de facas) | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | GRA-04 | Inspecionar facas, rotor e fixações quanto a desgaste, folga e dano | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | GRA-05 | Verificar peneira, câmara e descarga quanto a obstrução e integridade | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | GRA-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | GRA-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Impressora flexográfica (IMP)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | IMP-01 | Inspecionar visualmente a impressora flexográfica | Diária | Operação | 0.25 | Não |  |
| [ ] | IMP-02 | Verificar limpeza, fixação e sinais de desgaste da impressora flexográfica | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IMP-03 | Avaliar ruído, vibração e aquecimento anormal da impressora flexográfica | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | IMP-04 | Inspecionar cilindros, clichês e rolos quanto a desgaste, sujeira e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IMP-05 | Verificar circuito de tinta e sistema de secagem quanto a vazamento e funcionamento | Trimestral | Operação | 0.5 | Não |  |
| [ ] | IMP-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IMP-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Injetora elétrica (servoacionada) (IEL)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | IEL-01 | Inspecionar visualmente cabos, conectores e sinais de aquecimento no painel elétrico | Diária | Elétrica | 0.25 | Não |  |
| [ ] | IEL-02 | Verificar ruídos, vibração e aquecimento anormal nos servomotores e redutores | Mensal | Preditiva | 0.5 | Não |  |
| [ ] | IEL-03 | Conferir a lubrificação das guias, fusos e articulações do conjunto de fechamento | Mensal | Lubrificação | 0.5 | Não |  |
| [ ] | IEL-04 | Limpar filtros de ventilação do painel e verificar a circulação de ar | Mensal | Elétrica | 0.5 | **Sim** |  |
| [ ] | IEL-05 | Verificar o funcionamento das proteções móveis, intertravamentos e parada de emergência | Mensal | Elétrica | 0.5 | **Sim** |  |
| [ ] | IEL-06 | Inspecionar alinhamento e folgas do mecanismo de fechamento e do conjunto de extração | Trimestral | Mecânica | 1 | Não |  |
| [ ] | IEL-07 | Lubrificar os pontos previstos do mecanismo de fechamento | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IEL-08 | Verificar nível do óleo hidráulico | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IEL-09 | Inspecionar vazamentos de óleo no circuito hidráulico | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | IEL-10 | Verificar a temperatura do óleo hidráulico | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | IEL-11 | Inspecionar mangueiras hidráulicas e pneumáticas | Bimestral | Mecânica | 0.5 | Não |  |
| [ ] | IEL-12 | Limpar o trocador de calor e verificar sua condição | Bimestral | Mecânica | 0.5 | Não |  |
| [ ] | IEL-13 | Limpar ou substituir o filtro de óleo conforme a condição | Semestral | Mecânica | 0.5 | Não |  |
| [ ] | IEL-14 | Avaliar a troca do óleo hidráulico conforme condição e manual | Anual | Lubrificação | 0.5 | Não |  |
| [ ] | IEL-15 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IEL-16 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Injetora híbrida (IHY)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | IHY-01 | Inspecionar visualmente vazamentos no circuito hidráulico e o estado dos acionamentos elétricos | Diária | Mecânica | 0.25 | Não |  |
| [ ] | IHY-02 | Conferir nível e condição do óleo hidráulico e registrar ruídos ou vibração anormal | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IHY-03 | Verificar a lubrificação das guias, fusos e articulações do conjunto de fechamento | Mensal | Lubrificação | 0.5 | Não |  |
| [ ] | IHY-04 | Limpar filtros de ventilação do painel e verificar o resfriamento da unidade hidráulica | Mensal | Elétrica | 0.5 | **Sim** |  |
| [ ] | IHY-05 | Testar as proteções móveis, intertravamentos e parada de emergência | Mensal | Elétrica | 0.5 | **Sim** |  |
| [ ] | IHY-06 | Inspecionar alinhamento, folgas e sincronismo entre os acionamentos hidráulico e elétrico | Trimestral | Mecânica | 1 | Não |  |
| [ ] | IHY-07 | Lubrificar os pontos previstos do mecanismo de fechamento | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IHY-08 | Verificar nível do óleo hidráulico | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IHY-09 | Inspecionar vazamentos de óleo no circuito hidráulico | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | IHY-10 | Verificar a temperatura do óleo hidráulico | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | IHY-11 | Inspecionar mangueiras hidráulicas e pneumáticas | Bimestral | Mecânica | 0.5 | Não |  |
| [ ] | IHY-12 | Limpar o trocador de calor e verificar sua condição | Bimestral | Mecânica | 0.5 | Não |  |
| [ ] | IHY-13 | Limpar ou substituir o filtro de óleo conforme a condição | Semestral | Mecânica | 0.5 | Não |  |
| [ ] | IHY-14 | Avaliar a troca do óleo hidráulico conforme condição e manual | Anual | Lubrificação | 0.5 | Não |  |
| [ ] | IHY-15 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IHY-16 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Injetora hidráulica (IHD)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | IHD-01 | Inspecionar visualmente vazamentos no circuito hidráulico, mangueiras e conexões | Diária | Mecânica | 0.25 | Não |  |
| [ ] | IHD-02 | Conferir nível, aspecto e temperatura do óleo hidráulico | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IHD-03 | Limpar o filtro de ar e verificar a ventilação do painel e do conjunto hidráulico | Mensal | Elétrica | 0.5 | **Sim** |  |
| [ ] | IHD-04 | Verificar o funcionamento das proteções móveis, intertravamentos e parada de emergência | Mensal | Elétrica | 0.5 | **Sim** |  |
| [ ] | IHD-05 | Inspecionar desgaste e alinhamento do conjunto de fechamento e dos tirantes | Trimestral | Mecânica | 1 | Não |  |
| [ ] | IHD-06 | Lubrificar guias, articulações e pontos indicados do mecanismo de fechamento | Mensal | Lubrificação | 0.5 | Não |  |
| [ ] | IHD-07 | Lubrificar os pontos previstos do mecanismo de fechamento | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IHD-08 | Verificar nível do óleo hidráulico | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | IHD-09 | Inspecionar vazamentos de óleo no circuito hidráulico | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | IHD-10 | Verificar a temperatura do óleo hidráulico | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | IHD-11 | Inspecionar mangueiras hidráulicas e pneumáticas | Bimestral | Mecânica | 0.5 | Não |  |
| [ ] | IHD-12 | Limpar o trocador de calor e verificar sua condição | Bimestral | Mecânica | 0.5 | Não |  |
| [ ] | IHD-13 | Limpar ou substituir o filtro de óleo conforme a condição | Semestral | Mecânica | 0.5 | Não |  |
| [ ] | IHD-14 | Avaliar a troca do óleo hidráulico conforme condição e manual | Anual | Lubrificação | 0.5 | Não |  |
| [ ] | IHD-15 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IHD-16 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Injetora de borracha (IDB)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | IDB-01 | Inspecionar visualmente a injetora de borracha | Diária | Operação | 0.25 | Não |  |
| [ ] | IDB-02 | Verificar limpeza, fixação e sinais de desgaste da injetora de borracha | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IDB-03 | Avaliar ruído, vibração e aquecimento anormal da injetora de borracha | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | IDB-04 | Inspecionar molde, bico e unidade de injeção quanto a desgaste, sujeira e vazamento | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IDB-05 | Verificar zonas de aquecimento, sensores e indicação de temperatura | Trimestral | Instrumentação | 0.5 | Não |  |
| [ ] | IDB-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | IDB-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Linha de extrusão de chapas (LDC)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | LDC-01 | Inspecionar visualmente a linha de extrusão de chapas | Diária | Operação | 0.25 | Não |  |
| [ ] | LDC-02 | Verificar limpeza, fixação e sinais de desgaste da linha de extrusão de chapas | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDC-03 | Avaliar ruído, vibração e aquecimento anormal da linha de extrusão de chapas | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | LDC-04 | Inspecionar extrusora, matriz plana e aquecimento quanto a desgaste e vazamento | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDC-05 | Verificar calandra, rolos e circulação de água quanto a alinhamento e vazamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | LDC-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDC-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Linha de filme soprado (LDF)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | LDF-01 | Inspecionar visualmente a linha de filme soprado | Diária | Operação | 0.25 | Não |  |
| [ ] | LDF-02 | Verificar limpeza, fixação e sinais de desgaste da linha de filme soprado | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDF-03 | Avaliar ruído, vibração e aquecimento anormal da linha de filme soprado | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | LDF-04 | Inspecionar matriz, anel de ar e aquecimento quanto a obstrução e condição | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDF-05 | Verificar bolha, rolos de colapso e guias quanto a alinhamento e estabilidade | Trimestral | Operação | 0.5 | Não |  |
| [ ] | LDF-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDF-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Linha de extrusão de perfis e tubos (LDP)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | LDP-01 | Inspecionar visualmente a linha de extrusão de perfis e tubos | Diária | Operação | 0.25 | Não |  |
| [ ] | LDP-02 | Verificar limpeza, fixação e sinais de desgaste da linha de extrusão de perfis e tubos | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDP-03 | Avaliar ruído, vibração e aquecimento anormal da linha de extrusão de perfis e tubos | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | LDP-04 | Inspecionar matriz, calibrador e pontos de aquecimento quanto a desgaste e obstrução | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDP-05 | Verificar tanque, circulação de água e puxador quanto a alinhamento e vazamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | LDP-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | LDP-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Misturador interno tipo Banbury (MDB)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | MDB-01 | Inspecionar visualmente o misturador interno tipo banbury | Diária | Operação | 0.25 | Não |  |
| [ ] | MDB-02 | Verificar limpeza, fixação e sinais de desgaste do misturador interno tipo banbury | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDB-03 | Avaliar ruído, vibração e aquecimento anormal do misturador interno tipo banbury | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | MDB-04 | Inspecionar câmara, rotores e revestimentos quanto a desgaste, fixação e acúmulo de material | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDB-05 | Verificar descarga, acionamento e transmissão quanto a obstrução e ruído anormal | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | MDB-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDB-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Misturador de cor (masterbatch) (MDC)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | MDC-01 | Inspecionar visualmente o misturador de cor (masterbatch) | Diária | Operação | 0.25 | Não |  |
| [ ] | MDC-02 | Verificar limpeza, fixação e sinais de desgaste do misturador de cor (masterbatch) | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDC-03 | Avaliar ruído, vibração e aquecimento anormal do misturador de cor (masterbatch) | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | MDC-04 | Inspecionar câmara, hélice e revestimentos quanto a desgaste e acúmulo de material | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDC-05 | Verificar dosagem, descarga e conexões quanto a obstrução e funcionamento | Trimestral | Operação | 0.5 | Não |  |
| [ ] | MDC-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDC-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Moinho de dois rolos (MDR)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | MDR-01 | Inspecionar visualmente o moinho de dois rolos | Diária | Operação | 0.25 | Não |  |
| [ ] | MDR-02 | Verificar limpeza, fixação e sinais de desgaste do moinho de dois rolos | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDR-03 | Avaliar ruído, vibração e aquecimento anormal do moinho de dois rolos | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | MDR-04 | Inspecionar rolos, raspadores e mancais quanto a desgaste, fixação e condição superficial | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDR-05 | Verificar ajuste entre rolos, transmissão e acionamento quanto a alinhamento e ruído | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | MDR-06 | Lubrificar mancais, articulações e pontos indicados | Semanal | Lubrificação | 0.5 | Não |  |
| [ ] | MDR-07 | Inspecionar o desgaste e a fixação das facas ou navalhas | Semanal | Mecânica | 0.5 | Não |  |
| [ ] | MDR-08 | Inspecionar correias, polias e transmissão quanto a desgaste e fixação | Anual | Mecânica | 0.5 | Não |  |
| [ ] | MDR-09 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | MDR-10 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Sistema de peletização (PEL)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | PEL-01 | Inspecionar visualmente o sistema de peletização | Diária | Operação | 0.25 | Não |  |
| [ ] | PEL-02 | Verificar limpeza, fixação e sinais de desgaste do sistema de peletização | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PEL-03 | Avaliar ruído, vibração e aquecimento anormal do sistema de peletização | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | PEL-04 | Inspecionar matriz, facas e sistema de corte quanto a desgaste e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PEL-05 | Verificar resfriamento, peneira e transporte dos pellets quanto a obstrução | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | PEL-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PEL-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Prensa de compressão (PDC)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | PDC-01 | Inspecionar visualmente a prensa de compressão | Diária | Operação | 0.25 | Não |  |
| [ ] | PDC-02 | Verificar limpeza, fixação e sinais de desgaste da prensa de compressão | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PDC-03 | Avaliar ruído, vibração e aquecimento anormal da prensa de compressão | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | PDC-04 | Inspecionar placas, molde e superfícies de contato quanto a desgaste e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PDC-05 | Verificar aquecimento, indicação de temperatura e sistema de pressão | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | PDC-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PDC-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Prensa de vulcanização (PDV)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | PDV-01 | Inspecionar visualmente a prensa de vulcanização | Diária | Operação | 0.25 | Não |  |
| [ ] | PDV-02 | Verificar limpeza, fixação e sinais de desgaste da prensa de vulcanização | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PDV-03 | Avaliar ruído, vibração e aquecimento anormal da prensa de vulcanização | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | PDV-04 | Inspecionar placas, molde e superfícies de contato quanto a desgaste e condição | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PDV-05 | Verificar aquecimento, sensores e indicação do ciclo de vulcanização | Trimestral | Instrumentação | 0.5 | Não |  |
| [ ] | PDV-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PDV-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Puxador (PUX)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | PUX-01 | Inspecionar visualmente o puxador | Diária | Operação | 0.25 | Não |  |
| [ ] | PUX-02 | Verificar limpeza, fixação e sinais de desgaste do puxador | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PUX-03 | Avaliar ruído, vibração e aquecimento anormal do puxador | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | PUX-04 | Inspecionar rolos, revestimentos e mancais quanto a desgaste, alinhamento e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PUX-05 | Verificar acionamento, transmissão e controle de velocidade quanto a ruído e resposta | Trimestral | Elétrica | 0.5 | Não |  |
| [ ] | PUX-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | PUX-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Manipulador robotizado (REM)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | REM-01 | Inspecionar visualmente o manipulador robotizado | Diária | Operação | 0.25 | Não |  |
| [ ] | REM-02 | Verificar limpeza, fixação e sinais de desgaste do manipulador robotizado | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | REM-03 | Avaliar ruído, vibração e aquecimento anormal do manipulador robotizado | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | REM-04 | Inspecionar eixos, guias e garras quanto a folga, desgaste e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | REM-05 | Verificar controlador, cabos móveis e sinais de alarme do manipulador | Trimestral | Elétrica | 0.5 | Não |  |
| [ ] | REM-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | REM-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Rotomoldadora (ROT)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | ROT-01 | Inspecionar visualmente a rotomoldadora | Diária | Operação | 0.25 | Não |  |
| [ ] | ROT-02 | Verificar limpeza, fixação e sinais de desgaste da rotomoldadora | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | ROT-03 | Avaliar ruído, vibração e aquecimento anormal da rotomoldadora | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | ROT-04 | Inspecionar braços, estações e fixações de molde quanto a desgaste e alinhamento | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | ROT-05 | Verificar aquecimento, circulação de ar e indicação de temperatura | Trimestral | Operação | 0.5 | Não |  |
| [ ] | ROT-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | ROT-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Secador de ar comprimido (SDA)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SDA-01 | Inspecionar visualmente o secador de ar comprimido | Diária | Operação | 0.25 | Não |  |
| [ ] | SDA-02 | Verificar limpeza, fixação e sinais de desgaste do secador de ar comprimido | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDA-03 | Avaliar ruído, vibração e aquecimento anormal do secador de ar comprimido | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SDA-04 | Inspecionar trocador, drenos e conexões do circuito de secagem quanto a vazamento e sujeira | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDA-05 | Verificar filtros, drenos e indicação do ponto de orvalho | Trimestral | Operação | 0.5 | Não |  |
| [ ] | SDA-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDA-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Secador dessecante de resinas (SEC)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SEC-01 | Inspecionar visualmente o secador dessecante de resinas | Diária | Operação | 0.25 | Não |  |
| [ ] | SEC-02 | Verificar limpeza, fixação e sinais de desgaste do secador dessecante de resinas | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SEC-03 | Avaliar ruído, vibração e aquecimento anormal do secador dessecante de resinas | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SEC-04 | Inspecionar leito dessecante, válvulas e conexões quanto a saturação, vazamento e desgaste | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SEC-05 | Verificar aquecimento, ventilação e indicação de temperatura do secador | Trimestral | Elétrica | 0.5 | Não |  |
| [ ] | SEC-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SEC-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Máquina de corte e solda de filme (SDF)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SDF-01 | Inspecionar visualmente a máquina de corte e solda de filme | Diária | Operação | 0.25 | Não |  |
| [ ] | SDF-02 | Verificar limpeza, fixação e sinais de desgaste da máquina de corte e solda de filme | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDF-03 | Avaliar ruído, vibração e aquecimento anormal da máquina de corte e solda de filme | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SDF-04 | Inspecionar barras, resistências e superfícies de solda quanto a desgaste e sujeira | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDF-05 | Verificar controle de temperatura, tração e alinhamento do filme | Trimestral | Instrumentação | 0.5 | Não |  |
| [ ] | SDF-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDF-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Serra de corte de perfis e tubos (SDC)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SDC-01 | Inspecionar visualmente a serra de corte de perfis e tubos | Diária | Operação | 0.25 | Não |  |
| [ ] | SDC-02 | Verificar limpeza, fixação e sinais de desgaste da serra de corte de perfis e tubos | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDC-03 | Avaliar ruído, vibração e aquecimento anormal da serra de corte de perfis e tubos | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SDC-04 | Inspecionar lâmina, eixo e fixações quanto a desgaste, trincas e alinhamento | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDC-05 | Verificar guias, grampos e alimentação do perfil quanto a alinhamento e funcionamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | SDC-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SDC-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Silo de armazenagem de resina (SIL)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SIL-01 | Inspecionar visualmente o silo de armazenagem de resina | Diária | Operação | 0.25 | Não |  |
| [ ] | SIL-02 | Verificar limpeza, fixação e sinais de desgaste do silo de armazenagem de resina | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SIL-03 | Avaliar ruído, vibração e aquecimento anormal do silo de armazenagem de resina | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SIL-04 | Inspecionar silo, tampa, conexões e suportes quanto a vazamento, dano e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SIL-05 | Verificar descarga, válvulas e indicação de nível quanto a obstrução e funcionamento | Trimestral | Operação | 0.5 | Não |  |
| [ ] | SIL-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SIL-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Sistema de aspiração de pó (ASP)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | ASP-01 | Inspecionar visualmente o sistema de aspiração de pó | Diária | Operação | 0.25 | Não |  |
| [ ] | ASP-02 | Verificar limpeza, fixação e sinais de desgaste do sistema de aspiração de pó | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | ASP-03 | Avaliar ruído, vibração e aquecimento anormal do sistema de aspiração de pó | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | ASP-04 | Inspecionar dutos, mangueiras e pontos de captação quanto a vazamento e obstrução | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | ASP-05 | Verificar filtro, coletor e descarga de pó quanto a saturação e integridade | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | ASP-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | ASP-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Sopradora PET (injeção-sopro) (SOP)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SOP-01 | Inspecionar visualmente a sopradora pet (injeção-sopro) | Diária | Operação | 0.25 | Não |  |
| [ ] | SOP-02 | Verificar limpeza, fixação e sinais de desgaste da sopradora pet (injeção-sopro) | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SOP-03 | Avaliar ruído, vibração e aquecimento anormal da sopradora pet (injeção-sopro) | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SOP-04 | Inspecionar molde, bicos e unidade de sopro quanto a desgaste, sujeira e vazamento | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SOP-05 | Verificar aquecimento, estiramento e indicação de temperatura | Trimestral | Operação | 0.5 | Não |  |
| [ ] | SOP-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SOP-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Sopradora por extrusão (SPE)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | SPE-01 | Inspecionar visualmente a sopradora por extrusão | Diária | Operação | 0.25 | Não |  |
| [ ] | SPE-02 | Verificar limpeza, fixação e sinais de desgaste da sopradora por extrusão | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SPE-03 | Avaliar ruído, vibração e aquecimento anormal da sopradora por extrusão | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | SPE-04 | Inspecionar matriz, cabeçote e aquecimento quanto a obstrução, desgaste e vazamento | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SPE-05 | Verificar molde, circuito de sopro e conexões quanto a alinhamento e vazamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | SPE-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | SPE-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Máquina de tampografia (TAM)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | TAM-01 | Inspecionar visualmente a máquina de tampografia | Diária | Operação | 0.25 | Não |  |
| [ ] | TAM-02 | Verificar limpeza, fixação e sinais de desgaste da máquina de tampografia | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TAM-03 | Avaliar ruído, vibração e aquecimento anormal da máquina de tampografia | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | TAM-04 | Inspecionar clichê, tinteiro e reservatório quanto a desgaste, sujeira e vazamento | Mensal | Operação | 0.5 | Não |  |
| [ ] | TAM-05 | Verificar tampóo, guias e acionamento quanto a desgaste e repetibilidade do movimento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | TAM-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TAM-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Termoformadora a vácuo e pressão (TER)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | TER-01 | Inspecionar visualmente a termoformadora a vácuo e pressão | Diária | Operação | 0.25 | Não |  |
| [ ] | TER-02 | Verificar limpeza, fixação e sinais de desgaste da termoformadora a vácuo e pressão | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TER-03 | Avaliar ruído, vibração e aquecimento anormal da termoformadora a vácuo e pressão | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | TER-04 | Inspecionar resistências, molde e superfícies de conformação quanto a desgaste e sujeira | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TER-05 | Verificar circuitos de vácuo, pressão e corte quanto a vazamento e funcionamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | TER-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TER-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Unidade termorreguladora de molde (TRM)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | TRM-01 | Inspecionar visualmente a unidade termorreguladora de molde | Diária | Operação | 0.25 | Não |  |
| [ ] | TRM-02 | Verificar limpeza, fixação e sinais de desgaste da unidade termorreguladora de molde | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRM-03 | Avaliar ruído, vibração e aquecimento anormal da unidade termorreguladora de molde | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | TRM-04 | Inspecionar circuito, bomba, mangueiras e conexões quanto a vazamento e fixação | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRM-05 | Verificar aquecimento, sensores e indicação de temperatura | Trimestral | Instrumentação | 0.5 | Não |  |
| [ ] | TRM-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRM-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

### Transportador pneumático de resina (TRA)

| OK | ID | Tarefa | Periodicidade | Especialidade | Horas | Segurança | Ajuste proposto / fonte consultada |
|---|---|---|---|---|---|---|---|
| [ ] | TRA-01 | Inspecionar visualmente o transportador pneumático de resina | Diária | Operação | 0.25 | Não |  |
| [ ] | TRA-02 | Verificar limpeza, fixação e sinais de desgaste do transportador pneumático de resina | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRA-03 | Avaliar ruído, vibração e aquecimento anormal do transportador pneumático de resina | Trimestral | Preditiva | 0.5 | Não |  |
| [ ] | TRA-04 | Inspecionar tubulação, mangueiras e conexões quanto a vazamento, desgaste e obstrução | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRA-05 | Verificar soprador, filtro e descarga quanto a ruído, saturação e funcionamento | Trimestral | Mecânica | 0.5 | Não |  |
| [ ] | TRA-06 | Inspecionar fixações, estrutura e sinais de ruído ou vibração anormal do conjunto principal | Mensal | Mecânica | 0.5 | Não |  |
| [ ] | TRA-07 | Verificar limpeza e condição do painel e do acionamento elétrico, quando existentes | Semestral | Elétrica | 0.5 | Não |  |

## Publicação do lote de 01/11/2026

Publicação autorizada pelo mantenedor em 02/11/2026: 41 propostas, 40 tipos novos e 316 tarefas adicionais (incluindo duas do compressor). As propostas originais estão em `propostas-maquinas/`. Todas permanecem como base genérica, sem validação por fabricante. Seis tarefas novas de segurança usam essa mesma origem; autorização de publicação não equivale a aprovação técnica para execução.

Bibliotecas personalizadas 0.2.0 recebem somente os acréscimos sem conflito; ajustes anteriores e revisões congeladas são preservados. Havendo conflito de código ou sigla, a biblioteca anterior válida continua operável e sem acréscimos parciais quando não há ambiguidade com tarefas novas de segurança; a tela Biblioteca técnica informa que os códigos precisam ser conciliados para editar ou atualizar. Arquivos inválidos continuam no fluxo de recuperação. A versão 0.2.0 em `src/dados/biblioteca-0.2.0.json` é uma referência de compatibilidade, não o catálogo ativo.

Se uma máquina personalizada antiga coincide com a identidade ou os códigos de tarefas de uma máquina nova com segurança obrigatória, o arquivo pode exigir conciliação manual antes da abertura/restauração. As proteções novas não são ignoradas para resolver essa ambiguidade; os dados originais permanecem disponíveis na recuperação.
