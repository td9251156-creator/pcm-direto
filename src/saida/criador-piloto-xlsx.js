import JSZip from 'jszip';
import { normalizarCriacao, validarCriacao } from '../logica/criador-piloto.js';

const MODELOS = {
  'PCM-MAN-005': { url: './modelos/PCM-MAN-005_Checklist-de-Preventiva_R01-proposta.xlsx', hash: 'f5b63cf1beec5823ebc90bc826e86fe12055d6026558a9008b64452c60eb6632' },
  'PCM-MAN-016': { url: './modelos/PCM-MAN-016_POP-e-Licao-de-Um-Ponto_R01-proposta.xlsx', hash: '598d076f1f0ec54c5f9896c64f0f534b3b31bb387b0f89e800b6207288fa41b3' },
};
const esc = s => [...String(s)].filter(c => c >= ' ' || '\t\n\r'.includes(c)).join('').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function sha(bytes) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n=>n.toString(16).padStart(2,'0')).join(''); }
async function abrir(bytes) {
  const zip=await JSZip.loadAsync(bytes); const workbook=await zip.file('xl/workbook.xml').async('string'); const rels=await zip.file('xl/_rels/workbook.xml.rels').async('string'); const abas=new Map();
  for(const [,nome,rid] of workbook.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g)){
    const rel=[...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m=>m[0]).find(x=>x.includes(`Id="${rid}"`));
    const arquivo='xl/'+/Target="([^"]+)"/.exec(rel)[1].replace(/^\/?xl\//,'');
    abas.set(nome.replace(/&amp;/g,'&'),{arquivo,xml:await zip.file(arquivo).async('string')});
  }
  return {zip,workbook,abas};
}
function escrever(p,abaNome,valores){
  const aba=p.abas.get(abaNome); if(!aba) throw new Error(`Aba ${abaNome} ausente no modelo.`);
  for(const [ref,valor] of Object.entries(valores)){
    const re=new RegExp(`<c\\b([^>]*?\\br="${ref}"[^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/c>)`); const atual=re.exec(aba.xml);
    if(!atual) throw new Error(`Célula ${abaNome}!${ref} ausente no modelo.`);
    const estilo=/\bs="(\d+)"/.exec(atual[1])?.[1]; const s=estilo?` s="${estilo}"`:'';
    let nova;
    if(valor===null||valor===undefined||valor==='') nova=`<c r="${ref}"${s}/>`;
    else if(typeof valor==='number') nova=`<c r="${ref}"${s}><v>${valor}</v></c>`;
    else if(valor && typeof valor==='object' && valor.formula) nova=`<c r="${ref}"${s}><f>${esc(valor.formula)}</f></c>`;
    else nova=`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`;
    aba.xml=aba.xml.replace(re,nova);
  }
}
async function fechar(p){
  for(const a of p.abas.values()) p.zip.file(a.arquivo,a.xml);
  p.workbook=/<calcPr\b/.test(p.workbook)?p.workbook.replace(/<calcPr\b([^>]*?)\/?>/,(_,a)=>`<calcPr${a.replace(/\s(?:fullCalcOnLoad|forceFullCalc)="[^"]*"/g,'')} fullCalcOnLoad="1" forceFullCalc="1"/>`):p.workbook.replace('</workbook>','<calcPr fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
  p.zip.file('xl/workbook.xml',p.workbook); return p.zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
const slots005=[14,15,16,17,18,20,21,22,23,24,26,27,28,29,31,32,33,34,36,37,38,39,40,42,43,44,45,47,48,49];
export async function gerarCriacaoXlsx(entrada, buscar=fetch){
  const {ok,erros,criacao}=validarCriacao(normalizarCriacao(entrada)); if(!ok) throw new Error(erros.join(' '));
  const modelo=MODELOS[criacao.modelo]; const resposta=await buscar(modelo.url); if(!resposta.ok) throw new Error('Não foi possível abrir o modelo revisado.');
  const bytes=new Uint8Array(await resposta.arrayBuffer()); if(await sha(bytes)!==modelo.hash) throw new Error('O modelo revisado não corresponde à versão esperada. Recarregue a página.');
  const p=await abrir(bytes), d=criacao.dados;
  escrever(p,'Leia-me',{D10:d.titulo,D13:d.elaborado,D14:d.aprovado});
  if(criacao.modelo==='PCM-MAN-005'){
    const blocos=['14:18','20:24','26:29','31:34','36:40','42:45','47:49'];
    const soma=(col,funcao='COUNTA')=>blocos.map(r=>`${funcao}(${col}${r.replace(':',`:${col}`)})`).join('+');
    const respondidos=soma('D'), itens=soma('B');
    const acoes=blocos.map(r=>`COUNTIF(D${r.replace(':',':D')},"Ação")`).join('+');
    const ok=blocos.map(r=>`COUNTIF(D${r.replace(':',':D')},"OK")`).join('+');
    const na=blocos.map(r=>`COUNTIF(D${r.replace(':',':D')},"N/A")`).join('+');
    escrever(p,'Checklist de preventiva',{A4:d.tag,C4:d.equipamento,D4:null,A6:d.servico,D6:d.tecnico,A8:null,D8:null,A10:null,
      D10:{formula:`IF((${respondidos})=0,"",IF((${acoes})>0,"Ação necessária: abrir OS",IF((${respondidos})<(${itens}),"Incompleto ("&(${respondidos})&" de "&(${itens})&")","Concluído")))`},
      A13:'1  Itens 1 a 5',A19:'2  Itens 6 a 10',A25:'3  Itens 11 a 14',A30:'4  Itens 15 a 18',A35:'5  Itens 19 a 23',A41:'6  Itens 24 a 27',A46:'7  Itens 28 a 30',
      A51:{formula:`"Resumo:   OK "&(${ok})&"     ·     Ação "&(${acoes})&"     ·     N/A "&(${na})&"     ·     Sem resposta "&((${itens})-(${respondidos}))`}});
    const valores={}; slots005.forEach((linha,i)=>{valores[`A${linha}`]=i<d.itens.length?i+1:null;valores[`B${linha}`]=d.itens[i]||null;valores[`D${linha}`]=null;valores[`E${linha}`]=null;}); escrever(p,'Checklist de preventiva',valores);
  } else {
    const valores={A4:d.titulo,D4:d.numero,A6:d.area,C6:d.responsavel,A11:d.objetivo,A16:d.aplica,D16:d.naoAplica,A20:d.perigo,C20:d.controle,A26:d.materiais,A41:d.registro};
    for(let i=0;i<8;i++){const passo=d.passos[i]; valores[`B${30+i}`]=passo?.acao||null;valores[`C${30+i}`]=passo?.ponto||null;valores[`D${30+i}`]=passo?.tempo??null;valores[`E${30+i}`]=passo?.critico?'Sim':null;}
    escrever(p,'Procedimento',valores);
  }
  return fechar(p);
}

export function nomeArquivoCriacao(criacao){return `${criacao.modelo}_${criacao.modelo==='PCM-MAN-005'?'Checklist-personalizada':'Procedimento-personalizado'}.xlsx`;}
