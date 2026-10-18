# Como contribuir

Obrigado pelo interesse no PCM Direto. Toda ajuda é bem-vinda, principalmente de quem trabalha com manutenção.

## Formas de ajudar

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
2. Rode `npm install`, depois `npm run lint` e `npm test` antes de enviar.
3. Escreva o código e os comentários em português, de forma simples.
4. Abra um *pull request* explicando o antes e o depois.

Ao contribuir, você concorda que sua contribuição será publicada sob a [licença MIT](LICENSE)
e que seguirá o [Código de Conduta](CODE_OF_CONDUCT.md).
