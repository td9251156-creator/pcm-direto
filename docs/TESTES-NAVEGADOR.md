# Conferência no navegador

Os testes de lógica continuam em `npm test`. O roteiro abaixo é complementar: usa uma cópia de
teste do navegador, dados fictícios e um servidor local que encerra ao terminar. Não acessa os dados
do navegador pessoal. Primeiro rode `npm run build`.

O script `scripts/verificar-navegador.mjs` usa Playwright e Chromium disponíveis na máquina de teste,
sem adicionar bibliotecas ao aplicativo. Se necessário, instale a ferramenta em uma pasta separada:

```bash
npm install --prefix /tmp/pcm-ferramentas --no-save --package-lock=false playwright
PCM_PLAYWRIGHT=/tmp/pcm-ferramentas/node_modules/playwright/index.mjs \
PCM_CHROMIUM=/usr/bin/chromium node scripts/verificar-navegador.mjs
```

Informe em `PCM_CHROMIUM` o caminho do Chromium instalado. Em contêiner que já isola o processo e
exige execução sem a sandbox interna do Chromium, acrescente `PCM_SEM_SANDBOX=1` ao comando.
Não use essa opção para navegar em sites desconhecidos.

O roteiro confere navegação por teclado, largura de celular, importação inválida sem perda da
biblioteca, abertura sem conexão, geração de XLSX e DOCX sem internet e preservação de rascunho
danificado. Leitor de tela, aparelhos reais e Excel antigo ainda exigem conferência manual.
