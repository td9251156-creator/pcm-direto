# Roteiro (Roadmap)

## Etapa 1 — MVP (atual)

- Entrada de equipamentos: cadastro manual, colar do Excel e importar CSV.
- TAGs padronizadas (setor + tipo + número) e validação ao vivo com sugestão de correção.
- Biblioteca técnica inicial em um único JSON: motor elétrico, compressor de ar, bomba centrífuga e ponte rolante.
- Plano preventivo e cronograma anual com carga balanceada por semana, com datas a partir do início do plano.
- Tarefas diárias (ex.: verificação antes do uso pelo operador).
- Carga semanal por especialidade.
- Bloqueio de afrouxamento de tarefas de segurança.
- Ficha de falha mínima para iniciar o histórico.
- Pacote final: planilha .xlsx (6 abas) e resumo .docx.
- PWA instalável, lista salva no navegador, modo escuro.
- Capacidade de horas por especialidade respeitada no cronograma.
- Edição da biblioteca técnica no app (com as tarefas de segurança travadas).
- Cronograma para imprimir em A4 deitado.
- Importação de equipamentos direto de planilha .xlsx.
- Backup completo e restauração de equipamentos, biblioteca, ajustes e marcações de execução em JSON.

## Próximas etapas

Antes das funções novas, corrigir os erros e riscos e reforçar os testes na ordem registrada em
[docs/MELHORIAS.md](docs/MELHORIAS.md). A primeira correção valida arquivos de biblioteca antes da importação.

### Etapa 2 — Checklists com evidência
Primeira versão: marcação da última execução, data e observação técnica, sem dados pessoais,
com download em JSON. Fotos, assinatura e histórico completo ainda não foram implementados.

Checklists de execução por tarefa, com campo para registro de evidência (foto, medição, assinatura).

### Etapa 3 — Normas com fonte oficial
Vincular tarefas a requisitos normativos somente com fonte oficial, versão e data registradas,
e revisão por profissional habilitado.

### Etapa 4 — Indicadores
MTBF, MTTR e disponibilidade a partir do histórico de falhas.

### Etapa 5 — Planejamento avançado
Paradas programadas e agrupamento de tarefas por janela.

Sugestões são bem-vindas por *issue*.
