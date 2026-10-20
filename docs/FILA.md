# Fila de evolução

Esta é a fila atual. [MELHORIAS.md](MELHORIAS.md) guarda o diagnóstico e as entregas anteriores.
O processo de trabalho está em [EVOLUCAO-CONTINUA.md](EVOLUCAO-CONTINUA.md).
Uma implementação por vez. Um item só termina com evidência e revisão independente.

| ID | Prioridade | Problema e resultado esperado | Critério de conclusão | Situação |
|---|---|---|---|---|
| F-001 | Alta | Organizar trabalho por agentes e impedir publicação manual de ramos não integrados. | Instruções, fila e revisão independente registradas; testes aprovados; execução manual fora da main pula a publicação. | Implementado; aguardando validação no GitHub e integração. |
| F-002 | Alta | Tornar o teste de navegador totalmente previsível: fixar a ferramenta de teste, recusar porta já ocupada e limitar a espera pelo serviço offline. | Uma porta ocupada e um serviço offline que não inicia falham com mensagem e tempo limite; ferramentas só de teste, separadas do aplicativo. | Pronto para a próxima rodada. |
| F-003 | Média | Executar a conferência de navegador na rotina automática após F-002. | Fluxos de celular, backup, checklist e geração offline rodando em máquina limpa; falhas bloqueiam a revisão. | Depende de F-002. |
| F-004 | Média | Conferir leitor de tela, celular real e arquivos no Excel antigo. | Registrar aparelho/programa e versão, passos e resultado; corrigir problemas encontrados sem usar dados reais. | Aguardando acesso aos aparelhos/programas. |
| F-005 | Média | Definir cálculo de MTBF, MTTR e disponibilidade, item 14 do diagnóstico. | Mantenedor define funcionamento, falha, reparo, período e tratamento de paradas planejadas; exemplos numéricos aprovados antes de implementar. | Aguardando definição técnica. |
| F-006 | Média | Definir janelas e paradas programadas, item 15 do diagnóstico. | Mantenedor aprova exemplos e limites; nenhuma tarefa de segurança pode ser adiada fora da regra definida. | Aguardando definição técnica. |

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
