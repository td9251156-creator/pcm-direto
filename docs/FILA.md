# Fila de evolução

Esta é a fila atual. [MELHORIAS.md](MELHORIAS.md) guarda o diagnóstico e as entregas anteriores.
O processo de trabalho está em [EVOLUCAO-CONTINUA.md](EVOLUCAO-CONTINUA.md).
Uma implementação por vez. Um item só termina com evidência e revisão independente.

| ID | Prioridade | Problema e resultado esperado | Critério de conclusão | Situação |
|---|---|---|---|---|
| F-001 | Alta | Organizar trabalho por agentes e impedir publicação manual de ramos não integrados. | Instruções, fila e revisão independente registradas; testes aprovados; execução manual fora da main pula a publicação. | [PR #18](https://github.com/td9251156-creator/pcm-direto/pull/18) integrado; revisão semanal executada e aprovada. |
| F-002 | Alta | Tornar o teste de navegador totalmente previsível: fixar a ferramenta de teste, recusar porta já ocupada e limitar a espera pelo serviço offline. | Uma porta ocupada e um serviço offline que não inicia falham com mensagem e tempo limite; ferramentas só de teste, separadas do aplicativo. | Implementado e revisado: ferramenta isolada com lockfile, oito testes de regressão e roteiro real aprovados. |
| F-003 | Média | Executar a conferência de navegador na rotina automática após F-002. | Fluxos de celular, backup, checklist e geração offline rodando em máquina limpa; falhas bloqueiam a revisão. | Configurado em PRs, publicação e revisão semanal; validação no GitHub faz parte da entrega. |
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
- A implementação contínua por IA ainda depende de identificar, conectar e testar um executor permanente autorizado.
