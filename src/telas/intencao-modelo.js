import { esc } from '../ui.js';
import { destinoDoModelo } from '../logica/intencao-modelo.js';
export function mostrarIntencaoModelo(main, modelo, estado, demonstracao, dispensar) {
  document.getElementById('intencao-modelo')?.remove();
  if (!modelo) return;
  const destino = destinoDoModelo(modelo, estado);
  const painel = document.createElement('aside');
  painel.id = 'intencao-modelo'; painel.className = 'cartao intencao-modelo';
  painel.setAttribute('aria-label', 'Material que você escolheu'); painel.setAttribute('aria-live', 'polite');
  painel.innerHTML = `<p class="sobretitulo">Seu material · ${esc(modelo.codigo)}${demonstracao ? ' · Exemplo isolado' : ''}</p><h2>${esc(modelo.titulo)}</h2><p>${esc(destino.texto)}</p><p>O link não gera arquivos nem acrescenta registros à sua base.</p><div class="acoes"><a class="botao" href="#${destino.rota}">${esc(destino.acao)}</a><a href="./modelos/${modelo.codigo.toLowerCase()}/">Voltar ao material</a><button type="button" class="secundario" data-dispensar-modelo>Dispensar orientação</button></div>`;
  painel.querySelector('button').onclick = dispensar;
  main.before(painel);
}
