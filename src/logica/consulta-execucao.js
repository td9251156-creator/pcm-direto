import { correspondeBusca } from './texto.js';
import { dataValida } from './rascunho.js';
import { lerData, textoData } from './cronograma.js';

export function dataExibida(data){return dataValida(data)?data.split('-').reverse().join('/'):'Sem data';}
export function grupoDaPrevisao(data,hoje){
  if(data<hoje)return 'Vencidas';
  if(data===hoje)return 'Hoje · '+dataExibida(data);
  const amanha=lerData(hoje);amanha.setDate(amanha.getDate()+1);
  return (data===textoData(amanha)?'Amanhã · ':'')+dataExibida(data);
}
export function consultarHistorico(historico,{busca='',situacao='todas',de='',ate=''}={},nomePessoa=()=> ''){
  return historico.map((h,indice)=>({h,indice})).filter(({h})=>
    (situacao==='todas'||(situacao==='canceladas'?h.cancelada:!h.cancelada))&&(!de||h.data>=de)&&(!ate||h.data<=ate)&&
    correspondeBusca([h.tag,h.descricao,h.observacao,nomePessoa(h.responsavelId)].join(' '),busca)
  ).sort((a,b)=>b.h.data.localeCompare(a.h.data)||b.indice-a.indice).map(({h})=>h);
}
export function paginarConsulta(lista,pagina=1,tamanho=20){
  const paginas=Math.max(1,Math.ceil(lista.length/tamanho));const atual=Math.max(1,Math.min(paginas,Math.floor(Number(pagina)||1)));
  const inicio=(atual-1)*tamanho;
  return {itens:lista.slice(inicio,inicio+tamanho),pagina:atual,paginas,total:lista.length,inicio:lista.length?inicio+1:0,fim:Math.min(inicio+tamanho,lista.length)};
}
