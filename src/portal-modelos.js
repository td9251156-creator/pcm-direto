import { correspondeBuscaModelo } from './logica/busca-modelos.js';
// Filtros progressivos: sem JavaScript, os 19 modelos e downloads continuam acessíveis.
const filtros = document.querySelector('[data-filtros]');
const lista = document.querySelector('#lista-modelos');
if (filtros && lista) {
  const modelos = [...lista.querySelectorAll('[data-modelo]')];
  const caminhos = [...filtros.querySelectorAll('[data-caminho]')];
  const busca = filtros.querySelector('input');
  const todos = filtros.querySelector('#todos-modelos');
  const limpar = filtros.querySelector('#limpar-modelos-publicos');
  const pedido = location.hash.replace(/^#necessidade-/, '');
  let caminho = caminhos.find(c => c.dataset.caminho === pedido) ?? caminhos.find(c => c.dataset.caminho === 'os');
  let verTodos = false;
  function renderizar() {
    const pesquisando = Boolean(busca.value.trim());
    const ordem = caminho.dataset.ordem.split(' ');
    const visiveis = pesquisando ? modelos.filter(m => correspondeBuscaModelo(m.dataset.busca, busca.value, m.dataset.siglas)) : verTodos ? modelos : ordem.map(id => modelos.find(m => m.dataset.modelo === id));
    for (const m of modelos) m.hidden = !visiveis.includes(m);
    for (const m of visiveis) lista.append(m);
    for (const c of caminhos) c.setAttribute('aria-pressed', String(!verTodos && c === caminho));
    todos.setAttribute('aria-pressed', String(verTodos));
    filtros.querySelector('[role="status"]').textContent = `${visiveis.length} ${visiveis.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}${pesquisando ? ' em toda a biblioteca' : verTodos ? ' na biblioteca' : ' para ' + caminho.textContent.toLocaleLowerCase('pt-BR')}.${visiveis.length ? '' : ' Tente outra palavra ou limpe a busca.'}`;
    limpar.hidden = !busca.value;
  }
  caminhos.forEach(c => c.addEventListener('click', () => { caminho = c; verTodos = false; busca.value = ''; renderizar(); }));
  todos.addEventListener('click', () => { verTodos = true; busca.value = ''; renderizar(); });
  busca.addEventListener('input', renderizar);
  limpar.addEventListener('click', () => { busca.value = ''; renderizar(); busca.focus(); });
  window.addEventListener('hashchange', () => {
    const escolhido = caminhos.find(c => c.dataset.caminho === location.hash.replace(/^#necessidade-/, ''));
    if (!escolhido) return;
    caminho = escolhido; verTodos = false; busca.value = ''; renderizar();
  });
  renderizar(); filtros.hidden = false;
}
