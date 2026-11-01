import {esc} from '../ui.js';
import {correspondeBusca} from '../logica/texto.js';

const grupos=[
  ['Rotina',[
    ['semana','Visão geral','Semana, carga e pendências'],
    ['executar','Executar','Registrar tarefas realizadas e consultar o histórico'],
    ['ativos','Ativos','Consultar equipamentos e suas tarefas'],
    ['falhas','Falhas','Registrar sintoma, causa, ação e parada'],
    ['dashboards','Dashboards','Manutenção, confiabilidade e custos com os dados da operação'],
  ]],
  ['Planejamento',[
    ['planejar','Planejar','Conferir o rascunho e ativar revisões do plano'],
    ['equipamentos','Equipamentos','Cadastrar e importar a lista de ativos'],
    ['cadastros','Cadastros','Organização, setores, pessoas e referências'],
    ['criticidade','Criticidade','Notas de 1 a 5 e classe A/B/C, sem alterar as frequências'],
    ['janelas','Janelas de parada','Sugerir o que cabe em cada parada, sem adiar segurança'],
    ['mensal','Mensal','Consultar previsões e realizações por mês'],
  ]],
  ['Documentos',[
    ['entrega','Documentos da revisão ativa','Gerar um documento com o plano ativo, execuções e falhas'],
    ['modelos','Modelos para sua rotina','Entender cada modelo da Biblioteca PCM v2 e baixar Excel ou Word'],
  ]],
  ['Dados e apoio',[
    ['dados','Meus dados','Backup completo e restauração'],
    ['importar-operacao','Importar dados da operação','OS, falhas, custos e orçamento dos modelos 004, 008 e 012'],
    ['biblioteca','Biblioteca técnica','Consultar tarefas, fontes e modelos de máquinas'],
    ['apoio','Central de apoio','Guias, trilhas e glossário'],
    ['inicio','Primeiros passos','Preparar a fábrica ou explorar o exemplo isolado'],
    ['comunidade','Comunidade','Modelos públicos e contribuições'],
  ]],
];
let buscaSessao = '';

export function telaMais(main){
  main.innerHTML='<header class="cabecalho-tela"><p class="sobretitulo">Mais</p><h2>Seu PCM em um só lugar</h2><p>Encontre a ferramenta pela tarefa que precisa fazer.</p></header><label for="buscar-ferramentas">Buscar ferramenta</label><input type="search" id="buscar-ferramentas" placeholder="Ex.: backup, plano, documentos…" aria-controls="ferramentas"><p id="resultado-ferramentas" class="origem" role="status" aria-live="polite"></p><div id="ferramentas"></div>';
  const busca=main.querySelector('#buscar-ferramentas');
  busca.value=buscaSessao;
  const render=()=>{
    buscaSessao=busca.value;
    let total=0;
    main.querySelector('#ferramentas').innerHTML=grupos.map(([grupo,itens],i)=>{
      const encontrados=itens.filter(([,nome,descricao])=>correspondeBusca(nome+' '+descricao,busca.value));total+=encontrados.length;
      return encontrados.length?`<section class="ferramentas-grupo" aria-labelledby="grupo-ferramentas-${i}"><h3 id="grupo-ferramentas-${i}">${esc(grupo)}</h3><div class="painel-modulos">${encontrados.map(([rota,nome,descricao])=>`<a class="modulo cartao" href="#${rota}"><strong>${esc(nome)}</strong><span>${esc(descricao)}</span></a>`).join('')}</div></section>`:'';
    }).join('');
    main.querySelector('#resultado-ferramentas').textContent=total?`${total} ${total===1?'ferramenta disponível':'ferramentas disponíveis'}.`:'Nenhuma ferramenta encontrada. Tente outro termo.';
    if(!total){
      const limpar=document.createElement('button');limpar.type='button';limpar.className='secundario';limpar.textContent='Limpar busca';
      limpar.addEventListener('click',()=>{busca.value='';render();busca.focus();});
      main.querySelector('#ferramentas').append(limpar);
    }
  };
  busca.addEventListener('input',render);render();
}
