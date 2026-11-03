// Compatibilidade executada no início do HTML, sem consultar a base local.
(() => {
  const rotas = new Set(['contribuir','feedback','comunidade','catalogo','inicio','dados','assistente','semana','planejar','executar','mais','apoio','ativos','equipamentos','revisao','entrega','biblioteca','impressao','execucao','cadastros','criticidade','janelas','plano','mensal','falhas','dashboards','importar-operacao','modelos','marca','entrega-modelos']);
  function encaminhar() {
    const rota = location.hash.slice(1).split('?')[0];
    const instalado = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (!rotas.has(rota) && !instalado) { delete document.documentElement.dataset.entrada; return; }
    document.documentElement.dataset.entrada = 'app';
    try { location.replace(new URL('./app.html' + location.search + location.hash, location.href)); }
    catch { delete document.documentElement.dataset.entrada; }
  }
  addEventListener('hashchange', encaminhar);
  encaminhar();
})();
