# Entrada direta no app

Problema reproduzido no site: os três botões de `conheca.html` usavam `./#inicio`. A navegação passava por `/`, e a ponte de compatibilidade executava como módulo depois do HTML do portal, permitindo uma tela intermediária visível.

Correção: os botões usam `./app.html#inicio`. Para links antigos e instalações que iniciam na raiz, a decisão é incorporada ao início do HTML, antes dos estilos externos e do corpo. A página pública não é exibida durante essa transição. Query, fragmento e caminho relativo permanecem intactos; âncoras públicas continuam no portal. `contribuir` e `feedback` também fazem parte da compatibilidade.

Não altera IndexedDB, backups, biblioteca técnica, arquivos Office, identidade do PWA ou regra de esperar fechar abas para ativar uma atualização. Não força recarregamento em trabalho aberto.

Verificação: reprodução antes/depois, teste de navegador dos três CTAs e da entrada legada com app atrasado, contrato de todas as telas válidas, âncoras públicas, standalone e publicação em subpasta. A conferência completa do projeto permanece obrigatória antes da integração.

Escopo da conclusão: navegação descrita e regressões verificadas, sem promessa de ausência absoluta de defeitos no software. Links antigos de fora do site continuam usando a ponte, porque o fragmento não é enviado ao servidor. Instalações que ainda usam um cache anterior precisam concluir a atualização normal; falhas de rede fora do cache seguem o comportamento de navegação do navegador.
