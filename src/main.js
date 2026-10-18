// Ponto de entrada: carrega o rascunho, troca de tela pelo endereço (#inicio, #equipamentos...)
// e registra o service worker para funcionar como aplicativo e sem internet.
import { carregar } from './estado.js';
import { telaInicio } from './telas/inicio.js';
import { telaEquipamentos } from './telas/equipamentos.js';
import { telaRevisao } from './telas/revisao.js';
import { telaEntrega } from './telas/entrega.js';

const TELAS = {
  inicio: { titulo: 'Início', desenhar: telaInicio },
  equipamentos: { titulo: 'Equipamentos', desenhar: telaEquipamentos },
  revisao: { titulo: 'Revisão', desenhar: telaRevisao },
  entrega: { titulo: 'Entrega', desenhar: telaEntrega },
};

const main = document.getElementById('conteudo');

/** Vai para outra tela. */
function ir(nome) {
  if (location.hash === '#' + nome) mostrar();
  else location.hash = nome;
}

/** Desenha a tela indicada no endereço. */
function mostrar() {
  const nome = location.hash.slice(1);
  const tela = TELAS[nome] ?? TELAS.inicio;
  const atual = TELAS[nome] ? nome : 'inicio';
  document.querySelectorAll('.etapas a').forEach((a) => {
    if (a.dataset.tela === atual) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${tela.titulo} · PCM Direto`;
  tela.desenhar(main, ir);
  // Leva o foco para o conteúdo novo (ajuda quem navega por teclado ou leitor de tela)
  main.focus();
  window.scrollTo(0, 0);
}

carregar();
window.addEventListener('hashchange', mostrar);
mostrar();

// Service worker só na versão publicada (no modo de desenvolvimento ele atrapalharia)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
