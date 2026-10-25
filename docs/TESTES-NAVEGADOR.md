# Conferência no navegador

Os testes de lógica continuam em `npm test`. O roteiro abaixo usa uma cópia de teste do navegador,
dados fictícios e um servidor local que encerra ao terminar. Não acessa os dados do navegador pessoal.

A ferramenta fica em `ferramentas/navegador`, com versão exata e arquivo de versões próprio.
Não é carregada pelo aplicativo nem acrescenta dependências à versão publicada. Prepare e execute:

```bash
npm ci
npm ci --prefix ferramentas/navegador
node ferramentas/navegador/node_modules/playwright/cli.js install chromium
npm run verificar
npm run test:navegador
```

No GitHub Actions, a instalação usa `install --with-deps chromium` para preparar também as bibliotecas
do sistema. O roteiro roda em PRs, antes de publicar na main e na revisão semanal. Uma falha bloqueia
a publicação. A instalação e a auditoria da ferramenta são separadas das dependências do app.

Em máquina com outro Chromium, `PCM_CHROMIUM` permite selecionar seu caminho. `PCM_PLAYWRIGHT`
permite selecionar outra instalação da ferramenta para diagnóstico; a CI usa sempre a versão fixada.
Em contêiner que já isola o processo e exige execução sem a sandbox interna do Chromium, use
`PCM_SEM_SANDBOX=1` apenas para estes testes locais. Não use essa opção para sites desconhecidos.

Neste ambiente em nuvem, o cache do npm e o diretório de navegadores precisam ser graváveis:

```bash
npm ci --cache /workspace/.npm-cache
npm ci --prefix ferramentas/navegador --cache /workspace/.npm-cache
export PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/pcm-playwright
node ferramentas/navegador/node_modules/playwright/cli.js install chromium
npm run verificar
npm run test:navegador
```

O servidor é criado pela API do Vite com porta exclusiva: se outro processo já ocupar a porta 4175,
o roteiro falha, em vez de testar um servidor antigo. Navegação, prontidão do serviço offline e
execução completa têm limites de tempo. O navegador e o servidor são fechados também após falhas.

O roteiro Gestão confere a comunidade inicial, tema claro, proporções da marca e ausência de
rolagem horizontal em 320/390/820/1280 px, busca e teclado, cadastros, criticidade e capacidade.
Inclui migração v1, exemplo isolado, revisões, execução/cancelamento, falha com parada desconhecida,
backup v3 e restauração antiga sem herdar execuções, concorrência, corrupção e quota simulada.
Gera os seis documentos PCMD sem rede e compara imagens e desenhos com os modelos originais.

Em seguida, `scripts/verificar-atualizacao.mjs` cria servidor próprio na porta 4176 e testa
duas versões do worker com duas abas abertas. A versão em uso mantém HTML, recursos offline
e texto de formulário; a nova só ativa depois de fechar as abas. Confere ainda uma instalação
incompleta, o isolamento das propostas, caches de outro aplicativo e a transição do worker
anterior publicado. As páginas são fictícias; não escreve na base pessoal nem usa Supabase.
O snapshot histórico em `testes/fixtures/sw-71e0b87.txt` é usado somente no teste.

Por último, `scripts/verificar-sessao.mjs` usa a porta 4177, bloqueia service workers e
intercepta as chamadas Supabase com respostas fictícias. O SDK recebe eventos por seu canal
entre duas abas: entrada, renovação sem perder campos e saída. Respostas atrasadas de salvar
e conferir moderação não devem reabrir conteúdo da sessão anterior. Um caso isolado da tela
confere que concluir uma saída antiga não substitui a conta que entrou depois. Não envia
e-mails, não acessa contas reais e não comprova a entrega do link de autenticação.

Leitor de tela, aparelhos reais, conteúdo e impressão no Excel/LibreOffice continuam exigindo
conferência manual. O cenário especializado de atualização não testa migrações de esquema.

O roteiro também executa `verificar-pdfs-banco.mjs`, com PostgreSQL em memória (PGlite) e
substitutos de auth/storage sem rede, e `verificar-pdfs-comunidade.mjs`, com API simulada
no servidor local 4178. Este último usa tela de 390 px, SDK real e eventos fictícios de sessão:
seleção sem envio automático, arquivo falso recusado antes de salvar, upload sem upsert,
validação, download e confirmação de revisão com a versão lida. Não escreve no Supabase real.
O pacote isolado de ferramentas inclui PGlite e pdf-lib; eles não entram no site publicado.

`verificar-historico.mjs` usa a porta 4181 e uma base fictícia de 100 motores, plano anual,
duas revisões e 76 registros. Restaura pela interface e confere IndexedDB, busca, datas,
ordenação por realização, filtros, paginação e download de todas as páginas. Inclui legado de
ativo removido, texto escapado, intervalo inválido, Escape/foco na confirmação, troca de tela
e quota simulada sem alterar o registro persistido nem gerar exceção não tratada.
O cenário grande também confere a prévia de revisão com 100 ativos, invalidação por edição de
vigência/elaborador/resumo e retorno ao rascunho sem ativação. O roteiro Gestão ativa a primeira
revisão após reconferir os campos, verifica foco e testa Voltar ao rascunho.

`verificar-modelos.mjs` usa Vite na porta 4182 e Chromium isolado, sem chamadas externas.
Executa o gerador real em cópias dos modelos recebidos em 25/10/2026. Confere expansão de blocos
consolidados, 41 pessoas, 42 referências, 60 setores, 100 ativos com tarefa diária, mais de 5.000
ocorrências, 3.101 execuções e 1.101 falhas. Os arquivos baixados são lidos como XML no navegador:
fórmulas, validações, impressão, primeiro/último registro e diferença entre parada vazia e zero.
Compara imagens/desenhos com os originais e recusa modelo de outra versão pelo hash.
ExcelJS não abre nem o original fornecido com drawing Target absoluto; isso não foi tratado como
prova de arquivo inválido nem motivou regravação dos originais. XML válido não prova recálculo.
O roteiro Gestão lê as 12 prévias PDF sem internet, compara os bytes com os fornecidos e confere um download por clique. Evita uma rajada artificial de downloads automáticos.
