# Biblioteca técnica

Todas as tarefas de manutenção ficam em **um único arquivo**: [`src/dados/biblioteca.json`](src/dados/biblioteca.json).
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
<!-- Checklist gerado a partir da biblioteca versão 0.1.0 -->

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
