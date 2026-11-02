// Compatibilidade de endereços e instalações anteriores, sem consultar a base local.
const rotas = new Set(['comunidade','catalogo','inicio','dados','assistente','semana','planejar','executar','mais','apoio','ativos','equipamentos','revisao','entrega','biblioteca','impressao','execucao','cadastros','criticidade','janelas','plano','mensal','falhas','dashboards','importar-operacao','modelos','marca','entrega-modelos']);
const rota=location.hash.slice(1).split('?')[0];
if(rotas.has(rota)||matchMedia('(display-mode: standalone)').matches||navigator.standalone){location.replace(new URL('./app.html'+location.search+location.hash,location.href));}
