# Como contribuir

Obrigado pelo interesse no PCM Direto. Toda ajuda é bem-vinda, principalmente de quem trabalha com manutenção.

## Sem programar

A maior ajuda vem de quem está no chão de fábrica. Escolha uma tarefa de 10 a 30 minutos:

| Quanto tempo | O que fazer | Como enviar |
|---|---|---|
| 10 min | Abrir o app, clicar em **Explorar o exemplo** e contar o que confundiu | E-mail para pcmdireto@gmail.com ou formulário [Ideia ou melhoria](https://github.com/td9251156-creator/pcm-direto/issues/new/choose) |
| 15 min | Conferir as tarefas de **uma máquina** da biblioteca com o manual que você tem em mãos | Formulário "Sugerir tarefa de manutenção", com a fonte consultada |
| 15 min | Sugerir uma máquina que falta na biblioteca, com 5 a 10 tarefas | Formulário "Sugerir tarefa de manutenção" |
| 20 min | Propor ou revisar um guia da Central de apoio | Formulário "Sugerir artigo para a Central de apoio" |
| 30 min | Usar o app numa semana real e anotar o que travou | E-mail ou formulário "Relatar um erro" |

Para revisar tarefas, use o checklist de [BIBLIOTECA.md](BIBLIOTECA.md#checklist-de-revisão-tarefa-por-tarefa).
Informe sempre a origem: manual (modelo e edição), experiência própria ou norma com versão e data.
Não envie dados, fotos ou documentos da sua empresa.

Dúvidas e conversas sobre o app ficam nas [Discussões da comunidade](https://github.com/td9251156-creator/pcm-direto/discussions).

Quem contribui entra em [CREDITOS.md](CREDITOS.md), com nome, apelido ou como anônimo, à sua escolha.

## Formas de ajudar com arquivos e código

- **Biblioteca técnica:** sugerir, corrigir ou detalhar tarefas em `src/dados/biblioteca.json`.
  Siga o formato descrito em [BIBLIOTECA.md](BIBLIOTECA.md).
- **Problemas:** abrir uma *issue* descrevendo o que aconteceu, o que era esperado e como repetir.
- **Código:** corrigir erros ou melhorar telas, mantendo o projeto simples.

## Regras que não mudam

1. Tudo continua rodando só no navegador: sem servidor, login ou banco de dados.
2. Nenhuma referência a norma sem fonte oficial, com versão e data. Na dúvida, escreva "verificar na fonte oficial".
3. Nenhuma promessa de conformidade, de aprovação em auditoria ou de ganho.
4. O aviso permanente continua visível em todas as telas.
5. Tarefas de segurança não podem ser afrouxadas pelo usuário.
6. Use apenas dados fictícios. Nunca envie dados, planilhas ou documentos de empresas.

## Passo a passo para código

1. Faça um *fork* e crie um ramo: `git checkout -b minha-melhoria`.
2. Rode `npm ci`, depois `npm run verificar` antes de enviar.
3. Escreva o código e os comentários em português, de forma simples.
4. Abra um *pull request* explicando o antes e o depois.

Para desenvolvimento com agentes, siga [AGENTS.md](AGENTS.md), a
[estratégia de evolução](docs/EVOLUCAO-CONTINUA.md) e a [fila atual](docs/FILA.md).

Ao contribuir, você concorda que sua contribuição será publicada sob a [licença MIT](LICENSE)
e que seguirá o [Código de Conduta](CODE_OF_CONDUCT.md).
