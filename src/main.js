import { telaMarca } from './telas/marca.js';
import { telaModelos } from './telas/modelos.js';
import { telaEntregaModelos } from './telas/entrega-modelos.js';
// Ponto de entrada: carrega o rascunho, troca de tela pelo endereço (#inicio, #equipamentos...)
// e registra o service worker para funcionar como aplicativo e sem internet.
import { inicializarPersistencia, recuperacao, estado } from './estado.js';
import { baixar, atualizarAvisoArmazenamento } from './ui.js';
import { telaAtivos } from './telas/ativos.js';
import { telaEquipamentos } from './telas/equipamentos.js';
import { telaRevisao } from './telas/revisao.js';
import { telaDocumentos } from './telas/documentos.js';
import { telaBiblioteca } from './telas/biblioteca.js';
import { telaImpressao } from './telas/impressao.js';
import { telaExecucao } from './telas/execucao.js';
import { telaCadastros } from './telas/cadastros.js';
import { telaCriticidade } from './telas/criticidade.js';
import { telaPlano, telaMensal } from './telas/planejamento.js';
import { telaFalhas } from './telas/falhas.js';
import { telaBoasVindas,telaAssistente,telaPlanejar,telaSemana,telaOcorrencias,telaMais,telaMeusDados } from './telas/gestao-diaria.js';
import { telaApoio } from './telas/apoio.js';
import { telaComunidade } from './telas/comunidade.js';
import { telaCatalogo } from './telas/catalogo.js';
import { registrarAtualizacao } from './servicos/atualizacao.js';

const TELAS = {
  marca: { titulo: 'Manual da marca', desenhar: telaMarca },
  modelos: { titulo: '18 modelos refeitos', desenhar: telaModelos },
  'entrega-modelos': { titulo: 'Modelos do rascunho', desenhar: telaEntregaModelos },
  comunidade: { titulo: 'Comunidade e modelos', desenhar: telaComunidade },
  catalogo: { titulo: 'Catálogo colaborativo', desenhar: telaCatalogo },
  inicio: { titulo: 'Início', desenhar: telaBoasVindas },
  dados: { titulo: 'Meus dados', desenhar: telaMeusDados },
  assistente: { titulo: 'Primeiros passos', desenhar: telaAssistente },
  semana: { titulo: 'Visão geral', desenhar: telaSemana },
  planejar: { titulo: 'Planejar', desenhar: telaPlanejar },
  executar: { titulo: 'Executar', desenhar: telaOcorrencias },
  mais: { titulo: 'Mais', desenhar: telaMais },
  apoio: { titulo: 'Central de apoio', desenhar: telaApoio },
  ativos: { titulo: 'Ativos', desenhar: telaAtivos },
  equipamentos: { titulo: 'Equipamentos', desenhar: telaEquipamentos },
  revisao: { titulo: 'Revisão', desenhar: telaRevisao },
  entrega: { titulo: 'Documentos', desenhar: telaDocumentos },
  biblioteca: { titulo: 'Biblioteca técnica', desenhar: telaBiblioteca }, // fora das 4 etapas
  impressao: { titulo: 'Cronograma para imprimir', desenhar: telaImpressao },
  execucao: { titulo: 'Checklist de execução', desenhar: telaExecucao },
  cadastros: { titulo: 'Cadastros mestre', desenhar: telaCadastros },
  criticidade: { titulo: 'Criticidade', desenhar: telaCriticidade },
  plano: { titulo: 'Plano Mestre', desenhar: telaPlano },
  mensal: { titulo: 'Planejamento mensal', desenhar: telaMensal },
  falhas: { titulo: 'Registro de falhas', desenhar: telaFalhas },
};

const main = document.getElementById('conteudo');
document.querySelector('.pular').addEventListener('click', (e) => {
  e.preventDefault();
  main.focus();
  main.scrollIntoView();
});

/** Vai para outra tela. */
function ir(nome) {
  if (location.hash === '#' + nome) mostrar();
  else location.hash = nome;
}

let encerrarTela;

function marcarNavegacao(atual) {
  const mobile = matchMedia('(max-width:1023px)').matches;
  const emMais = !['semana','executar','ativos','falhas'].includes(atual);
  document.querySelectorAll('nav a[data-tela]').forEach(a=>{
    const ativa = mobile ? a.dataset.tela === (emMais?'mais':atual) : a.dataset.tela === atual;
    if(ativa)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
}
matchMedia('(max-width:1023px)').addEventListener('change',()=>marcarNavegacao(location.hash.slice(1).split('?')[0]||'comunidade'));

/** Desenha a tela indicada no endereço. */
function mostrar() {
  const nome = location.hash.slice(1).split('?')[0];
  document.body.dataset.tela = nome;
  main.classList.remove('ativo-aberto');
  document.querySelectorAll('dialog.painel-execucao, dialog[data-dialogo-app]').forEach(d=>d.close());
  const tela = TELAS[nome] ?? TELAS.comunidade;
  const atual = TELAS[nome] ? nome : 'comunidade';
  marcarNavegacao(atual);
  document.title = `${tela.titulo} · PCM Direto`;
  encerrarTela?.();
  encerrarTela = tela.desenhar(main, ir);
  document.getElementById('lembrete-backup')?.remove();
  const { ultimoBackup, alteradoEm } = estado.metadados;
  if (!estado.exemplo && alteradoEm && (!ultimoBackup ||
    (Date.now() - Date.parse(ultimoBackup) >= 7 * 86400000 && alteradoEm > ultimoBackup))) {
    const lembrete = document.createElement('aside');
    lembrete.id = 'lembrete-backup'; lembrete.className = 'cartao aviso';
    lembrete.innerHTML = 'Há alterações locais para guardar. <a href="#dados">Baixar backup completo</a>.';
    main.before(lembrete);
  }
  // Leva o foco para o conteúdo novo (ajuda quem navega por teclado ou leitor de tela)
  main.focus();
  window.scrollTo(0, 0);
  if(nome==='falhas'&&location.hash.includes('?ativo='))main.querySelector('#g-sintoma')?.focus();
}

// Direção aprovada: tema claro fixo, inclusive em aparelhos com tema escuro.
document.documentElement.dataset.tema = 'claro';

await inicializarPersistencia();
if (!location.hash) location.hash = 'comunidade';
atualizarAvisoArmazenamento();
if (recuperacao.length) {
  const aviso = document.createElement('section');
  aviso.className = 'cartao erro';
  aviso.setAttribute('role', 'alert');
  const texto = document.createElement('p');
  texto.textContent = 'Alguns dados salvos não puderam ser abertos. Os originais foram mantidos. Baixe uma cópia antes de continuar; a lista exibida pode estar vazia ou usar a biblioteca original.';
  const botao = document.createElement('button');
  botao.textContent = 'Baixar dados originais para recuperação';
  botao.addEventListener('click', () => baixar(JSON.stringify(recuperacao, null, 2), 'pcm-direto-recuperacao.json', 'application/json'));
  aviso.append(texto, botao);
  main.before(aviso);
}
window.addEventListener('hashchange', mostrar);
mostrar();

// Service worker só na versão publicada (no modo de desenvolvimento ele atrapalharia)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registrar = () => registrarAtualizacao().catch(() => {});
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}
