# Primeiras contribuições — rascunhos para issues

Estas são propostas delimitadas, não issues publicadas nem tarefas já concluídas. Combine uma com o mantenedor antes de começar. Só aplicar `good first issue` depois de confirmar reprodução, escopo e disponibilidade para revisão. Uma contribuição externa em acompanhamento por vez.

## 1. Conferir navegação por teclado

Reprodução: abrir a Comunidade, usar Tab/Shift+Tab para chegar à busca e às ações dos modelos. Quando o PR #58 estiver integrado, incluir Como usar, Escape e retorno de foco.

Arquivos permitidos: roteiro específico em `scripts/` e, se necessário para um erro reproduzido, a tela de Comunidade e seu CSS; nenhum arquivo protegido. Entrega: cenário que falhe antes de eventual correção e passe depois. Aceite: foco visível, ordem compreensível, retorno ao acionador, ausência de rolagem horizontal em 390/1280 px e verificações aplicáveis aprovadas. Leitor de tela só pode ser declarado se usado.

## 2. Melhorar a orientação de um modelo

Reprodução: escolher um PCM-MAN do catálogo e anotar qual instrução de primeiro uso ficou ambígua. Usar apenas arquivo e exemplo fictícios.

Arquivos permitidos: texto da orientação de uso e documentação correspondente; não alterar modelos Office, manifesto protegido, fórmulas ou tarefas técnicas. Entrega: texto antes/depois, fonte consultada e exemplo de leitura. Aceite: finalidade, campo/aba real e próximo passo claros, sem promessa de conformidade ou regra nova. O mantenedor confere o conteúdo de manutenção.

## 3. Conferir instalação e contribuição manual

Reprodução: usar checkout limpo, Node.js 24 e seguir CONTRIBUTING em PT ou EN, sem conta de IA. Registrar sistema, comandos, saídas e onde houve dúvida, sem dados privados.

Arquivos permitidos: CONTRIBUTING e seu guia em inglês; documentação de preparação de navegador se houver erro demonstrado. Não alterar lockfile ou instalar dependências novas no produto. Aceite: instalação pelo lockfile, dev, lint/testes/build e preparação de navegador reproduzíveis; distinguir dependências ausentes de falha do app. Correções de texto devem funcionar nos dois guias.

Relatos e revisão usam o [fluxo de contribuição](../CONTRIBUTING.md). Não abrir PRs automáticos de ortografia em massa nem reservar várias tarefas simultaneamente. Crédito é oferecido com consentimento após a contribuição aceita.
