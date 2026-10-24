// Preenche cópias dos modelos originais, preservando os demais arquivos do pacote.
import JSZip from 'jszip';
import contrato from '../dados/contrato-modelos.json';
import { criticidadeAtivo } from '../logica/gestao.js';
import { ocorrenciasVigentes } from '../logica/programacao.js';
const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('O modelo contém XML inválido.');return d;};
const serializar=d=>new XMLSerializer().serializeToString(d);
const todos=(n,ns,nome)=>[...n.getElementsByTagNameNS(ns,nome)];
const data=v=>v?{data:v}:null;
const sim=v=>v?'Sim':'Não';
const formatar=v=>v===null||v===undefined||v===''?'A definir':String(v);
const linhaPlano=t=>`${t.equipamentoId}|${t.tarefaId}`;

/** Retrato fechado no início da emissão; nenhum await lê o estado vivo depois disso. */
export function prepararEmissao(estado,metadados){
  if(!estado.programacao.revisoes.length)throw new Error('Ative uma revisão antes de emitir os documentos PCMD.');
  const e=structuredClone(estado);const r=e.programacao.revisoes.at(-1);
  const corte=metadados.dataCorte;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(corte)||!metadados.elaborador.trim())throw new Error('Informe a data de corte e o elaborador.');
  if(metadados.aprovado&&!metadados.aprovador.trim())throw new Error('Uma aprovação exige o nome do aprovador.');
  return {estado:e,revisao:r,meta:{...metadados,aprovador:metadados.aprovado?metadados.aprovador.trim():'',revisao:String(r.numero).padStart(2,'0'),situacao:metadados.aprovado?'Aprovado':'Em elaboração'},
    ocorrencias:ocorrenciasVigentes(e.programacao),historico:e.gestao.historico.filter(h=>h.data<=corte),falhas:e.gestao.falhas.filter(f=>f.data<=corte)};
}

function datasets(emissao){
  const {estado:e,revisao:r,meta:m,ocorrencias,historico,falhas}=emissao;
  const nomePessoa=id=>e.gestao.pessoas.find(p=>p.id===id)?.nome??'';
  const o=e.gestao.organizacao;
  const tipos=new Map(e.biblioteca.tipos.map(t=>[t.id,t]));
  const tarefas=e.programacao.revisoes.flatMap(rev=>rev.plano.map(t=>({...t,revisaoId:rev.id,responsavelId:rev.responsaveis?.[linhaPlano(t)]??''}))).filter(t=>ocorrencias.some(oc=>oc.revisaoId===t.revisaoId&&oc.equipamentoId===t.equipamentoId&&oc.tarefaId===t.tarefaId)||t.revisaoId===r.id);
  const revisoes=e.programacao.revisoes.map(rev=>({A:String(rev.numero).padStart(2,'0'),B:data(rev.criadaEm),C:rev.resumo,D:rev.elaborador,E:''}));
  const mapas={
    'PCMD-01-Controle-Documental.xlsx':{
      'Lista Mestra':{limite:50,linhas:['01','02','03','04','05','W1','W2'].map((cod,i)=>({A:'PCMD-'+cod,D:m.revisao,E:data(m.dataCorte),F:m.elaborador,G:m.aprovador,I:m.situacao,K:`Revisão de plano ${r.numero}; emissão ${m.dataCorte}`,B:['Lista mestra de documentos','Ativos e criticidade','Plano mestre de manutenção','Cronograma e acompanhamento mensal','Ficha de falha','Manual de Gestão de Ativos','Manual de Estratégia de Manutenção'][i],C:i<5?'Planilha (XLSX)':'Manual (DOCX)'}))},
      'Revisões':{limite:100,linhas:e.programacao.revisoes.flatMap(rev=>['01','02','03','04','05','W1','W2'].map(c=>({A:'PCMD-'+c,B:String(rev.numero).padStart(2,'0'),C:data(rev.criadaEm),D:rev.resumo,E:rev.elaborador})))},
      'Pessoas':{limite:60,linhas:e.gestao.pessoas.map(p=>({A:p.id,B:p.nome,C:p.funcao,D:p.especialidade,E:sim(p.ativo)}))},
      'Requisitos':{limite:60,linhas:e.gestao.requisitos.map(q=>({A:q.id,B:q.referencia,C:q.versao,D:data(q.data),E:q.fonte,F:q.status==='verificado'?'Verificado':'Não verificado'}))},
    },
    'PCMD-02-Ativos-Criticidade.xlsx':{
      'Ativos':{limite:300,linhas:r.equipamentos.map(a=>{const notas=e.gestao.criticidade.notas[a.id]??[];return {A:a.id,B:a.tag,C:a.descricao,D:a.tipo,E:tipos.get(a.tipo)?.nome??a.tipo,F:a.fabricante??'',G:a.modelo??'',H:a.setor,I:Number(a.numero),K:notas[0],L:notas[1],M:notas[2],N:notas[3],O:notas[4]};})},
      'Setores':{limite:30,linhas:[...new Set([...o.setores,...r.equipamentos.map(a=>a.setor)])].map(s=>({A:s,B:s}))},
      'Listas':{limite:30,linhas:e.biblioteca.tipos.map(t=>({A:t.id,B:t.nome,C:t.sigla}))},
      'Revisões':{limite:30,linhas:revisoes},
    },
    'PCMD-03-04-Plano-Cronograma.xlsx':{
      'Plano Mestre':{limite:2000,revisao:true,linhas:tarefas.map(t=>({A:t.equipamentoId,B:t.tarefaId,D:t.tag,E:t.descricao,F:t.origem,G:t.versao,H:t.periodicidadeOriginal,I:sim(t.seguranca),J:t.periodicidade,L:t.especialidade,M:t.duracaoHoras,O:sim(t.ativa),P:t.responsavelId,Q:nomePessoa(t.responsavelId),S:t.observacao,T:t.revisaoId}))},
      'Ocorrências':{limite:5000,revisao:true,linhas:ocorrencias.map(oc=>({A:oc.equipamentoId,B:oc.tarefaId,C:data(oc.dataPrevista),D:`Revisão ${e.programacao.revisoes.find(v=>v.id===oc.revisaoId)?.numero}`,T:oc.revisaoId}))},
      'Execuções':{limite:3000,revisao:true,linhas:historico.map(h=>({A:h.id,B:h.equipamentoId,C:h.tarefaId,E:h.tag,F:h.descricao,G:data(h.dataPrevista),H:data(h.data),J:h.observacao,K:h.responsavelId,L:nomePessoa(h.responsavelId),M:h.origem,N:sim(h.cancelada),T:h.revisaoId??ocorrencias.find(oc=>oc.equipamentoId===h.equipamentoId&&oc.tarefaId===h.tarefaId&&oc.dataPrevista===h.dataPrevista)?.revisaoId??''}))},
      'Revisões':{limite:30,linhas:revisoes},
    },
    'PCMD-05-Ficha-Falha.xlsx':{
      'Ficha de Falha':{limite:1000,linhas:falhas.map(f=>({A:f.id,B:f.equipamentoId,C:data(f.data),D:f.tag,E:f.sintoma,F:f.causa,G:f.acao,H:f.horasParada,I:f.peca,J:f.responsavelId,K:nomePessoa(f.responsavelId)}))},
      'Revisões':{limite:30,linhas:revisoes},
    },
  };
  return {mapas,tarefas,nomePessoa};
}

function deslocarFormula(formula,delta){return formula.split(/("(?:[^"]|"")*")/).map((p,i)=>i%2?p:p.replace(/(\$?[A-Z]{1,3})(\$?)(\d+)/g,(_,c,f,n)=>c+f+(f?n:Number(n)+delta))).join('');}

export async function preencherXlsx(bytes,arquivo,emissao){
  const info=contrato.modelos[arquivo];if(!info?.abas)throw new Error('Modelo não mapeado.');
  const zip=await JSZip.loadAsync(bytes);const wb=xml(await zip.file('xl/workbook.xml').async('string'));const docs=new Map();
  for(const aba of info.abas)docs.set(aba.nome,xml(await zip.file(aba.arquivo).async('string')));
  const indices=new WeakMap();
  function indice(doc){if(!indices.has(doc))indices.set(doc,{sheetData:todos(doc,S,'sheetData')[0],rows:new Map(todos(doc,S,'row').map(n=>[Number(n.getAttribute('r')),n])),cells:new Map(todos(doc,S,'c').map(n=>[n.getAttribute('r'),n]))});return indices.get(doc);}
  function escrever(doc,ref,valor){
    const idx=indice(doc);const nr=Number(ref.match(/\d+$/)[0]);const dados=idx.sheetData;let row=idx.rows.get(nr);
    if(!row){row=doc.createElementNS(S,'row');row.setAttribute('r',nr);const proximo=[...dados.children].find(n=>Number(n.getAttribute('r'))>nr);dados.insertBefore(row,proximo??null);idx.rows.set(nr,row);}
    let c=idx.cells.get(ref);
    if(!c){c=doc.createElementNS(S,'c');c.setAttribute('r',ref);const letra=ref.replace(/\d+$/,'');const ordem=s=>s.split('').reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);const proximo=[...row.children].find(n=>ordem(n.getAttribute('r').replace(/\d+$/,''))>ordem(letra));row.insertBefore(c,proximo??null);idx.cells.set(ref,c);}
    for(const n of [...c.children])c.removeChild(n);c.removeAttribute('t');
    if(valor===undefined||valor===null||valor==='')return;
    if(typeof valor==='object'&&valor.data){valor=(Date.parse(valor.data+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;}
    if(typeof valor==='number'){if(!Number.isFinite(valor))throw new Error('Valor numérico inválido.');const v=doc.createElementNS(S,'v');v.textContent=String(valor);c.appendChild(v);}
    else{c.setAttribute('t','inlineStr');const is=doc.createElementNS(S,'is');const t=doc.createElementNS(S,'t');t.setAttribute('xml:space','preserve');t.textContent=String(valor);is.appendChild(t);c.appendChild(is);}
  }
  function formula(doc,ref,texto){escrever(doc,ref,null);const c=indice(doc).cells.get(ref);const f=doc.createElementNS(S,'f');f.textContent=texto;c.appendChild(f);}
  const {mapas}=datasets(emissao);const grupos=mapas[arquivo];
  for(const [nome,g]of Object.entries(grupos)){
    const doc=docs.get(nome);const sheetData=todos(doc,S,'sheetData')[0];const fimAntigo=g.limite+6;const fimNovo=Math.max(fimAntigo,g.linhas.length+6);
    if(fimNovo>1048576)throw new Error('O número de registros excede a capacidade do Excel. Nenhum dado foi truncado.');
    const ultima=[...sheetData.children].find(row=>Number(row.getAttribute('r'))===fimAntigo);
    if(fimNovo>fimAntigo){
      if(!ultima)throw new Error('A linha modelo para ampliação não foi encontrada.');
      for(let n=fimAntigo+1;n<=fimNovo;n++){const row=ultima.cloneNode(true);row.setAttribute('r',n);for(const c of [...row.children]){c.setAttribute('r',c.getAttribute('r').replace(/\d+$/,String(n)));const f=todos(c,S,'f')[0];if(f)f.textContent=deslocarFormula(f.textContent,n-fimAntigo);for(const v of todos(c,S,'v'))v.remove();}sheetData.appendChild(row);}
      for(const no of todos(wb,S,'definedName'))if(no.textContent.startsWith(`'${nome}'!`))no.textContent=no.textContent.replace(new RegExp('\\$'+fimAntigo+'(?!\\d)','g'),'$'+fimNovo);
      for(const no of [...todos(doc,S,'dataValidation'),...todos(doc,S,'conditionalFormatting'),...todos(doc,S,'autoFilter'),...todos(doc,S,'dimension')])for(const attr of ['sqref','ref'])if(no.hasAttribute(attr))no.setAttribute(attr,no.getAttribute(attr).replace(new RegExp('(?<=\\D)'+fimAntigo+'(?!\\d)','g'),String(fimNovo)));
    }
    g.linhas.forEach((valores,i)=>Object.entries(valores).forEach(([c,v])=>escrever(doc,c+(i+7),v)));
    if(g.revisao){
      escrever(doc,'T6','Revisão do plano (ID)');let cols=todos(doc,S,'cols')[0];if(cols){const col=doc.createElementNS(S,'col');col.setAttribute('min','20');col.setAttribute('max','20');col.setAttribute('hidden','1');col.setAttribute('width','24');cols.appendChild(col);}
      for(let i=7;i<=fimNovo;i++){
        if(nome==='Plano Mestre')formula(doc,`C${i}`,`IF(OR(A${i}="",B${i}=""),"",T${i}&"|"&A${i}&"|"&B${i})`);
        if(nome==='Ocorrências')formula(doc,`E${i}`,`IF(OR(A${i}="",B${i}=""),"",T${i}&"|"&A${i}&"|"&B${i})`);
        if(nome==='Execuções')formula(doc,`D${i}`,`IF(OR(B${i}="",C${i}=""),"",T${i}&"|"&B${i}&"|"&C${i})`);
      }
    }
  }
  const {estado:e,revisao:r,meta:m}=emissao;
  const comuns={cfg_elaborado:m.elaborador,cfg_aprovado:m.aprovador,pcmd_origem:`PCM Direto · plano rev. ${r.numero}`,pcmd_emissao:data(m.dataCorte),cad_org_nome:e.gestao.organizacao.nome,cad_referencial:e.gestao.organizacao.referencial,cad_prefixo:e.gestao.organizacao.padraoCodigo,cad_meta_disponibilidade:e.gestao.metas.disponibilidade===null?null:e.gestao.metas.disponibilidade/100,cad_limite_a:e.gestao.criticidade.limites.a,cad_limite_b:e.gestao.criticidade.limites.b,crono_ano:Number(m.dataCorte.slice(0,4)),crono_inicio:data(r.inicio),crono_meta_aderencia:e.gestao.metas.aderencia===null?null:e.gestao.metas.aderencia/100};
  for(const [nome,valor]of Object.entries(comuns)){const alvo=info.nomes?.[nome]?.match(/^'([^']+)'!\$([A-Z]+)\$(\d+)$/);if(alvo)escrever(docs.get(alvo[1]),alvo[2]+alvo[3],valor);}
  // Os demais cabeçalhos continuam lendo revisão/data das fórmulas originais.
  for(const [nome,doc]of docs){for(const v of todos(doc,S,'c'))if(todos(v,S,'f').length)for(const n of todos(v,S,'v'))n.remove();zip.file(info.abas.find(a=>a.nome===nome).arquivo,serializar(doc));}
  let calc=todos(wb,S,'calcPr')[0];if(!calc){calc=wb.createElementNS(S,'calcPr');wb.documentElement.appendChild(calc);}calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');
  zip.file('xl/workbook.xml',serializar(wb));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

function substituirParagrafos(raiz,valores){
  for(const p of todos(raiz,W,'p')){
    const ts=todos(p,W,'t');const original=ts.map(t=>t.textContent).join('');let pos=0;const faixas=ts.map(t=>{const inicio=pos;pos+=t.textContent.length;return {t,inicio,fim:pos};});
    const matches=[...original.matchAll(/\{\{([^}]+)\}\}/g)].reverse();
    for(const match of matches){const inicio=match.index;const fim=inicio+match[0].length;const abrangidas=faixas.filter(f=>f.fim>inicio&&f.inicio<fim);if(!abrangidas.length)continue;const primeiro=abrangidas[0],ultimo=abrangidas.at(-1);const antes=primeiro.t.textContent.slice(0,inicio-primeiro.inicio);const depois=ultimo.t.textContent.slice(fim-ultimo.inicio);primeiro.t.textContent=antes+formatar(valores[match[1]])+(primeiro===ultimo?depois:'');for(const f of abrangidas.slice(1))f.t.textContent=f===ultimo?depois:'';}
  }
}

export async function preencherDocx(bytes,emissao){
  const zip=await JSZip.loadAsync(bytes);const {estado:e,revisao:r,meta:m}=emissao;const {tarefas,nomePessoa}=datasets(emissao);const o=e.gestao.organizacao;
  const valores={'organizacao.nome':o.nome,'organizacao.referencial':o.referencial,'documento.revisao':m.revisao,'documento.data':m.dataCorte,'documento.elaborador':m.elaborador,'documento.aprovador':m.aprovador,'documento.situacao':m.situacao,'emissao.data':m.dataCorte,'origem.dados':`PCM Direto · revisão ${r.numero}`,'criticidade.limite_a':e.gestao.criticidade.limites.a,'criticidade.limite_b':e.gestao.criticidade.limites.b,'metas.aderencia':e.gestao.metas.aderencia===null?'A definir':e.gestao.metas.aderencia+'%','metas.disponibilidade':e.gestao.metas.disponibilidade===null?'A definir':e.gestao.metas.disponibilidade+'%'};
  const linhas={
    requisito:e.gestao.requisitos.map(q=>Object.fromEntries(Object.entries(q).map(([k,v])=>['requisito.'+k,k==='status'?(v==='verificado'?'Verificado':'Não verificado'):v]))),
    pessoa:e.gestao.pessoas.filter(p=>p.ativo).map(p=>({'pessoa.nome':p.nome,'pessoa.funcao':p.funcao,'pessoa.especialidade':p.especialidade,'pessoa.responsabilidade':p.funcao})),
    setor:o.setores.map(s=>({'setor.sigla':s,'setor.descricao':s})),
    revisao:e.programacao.revisoes.map(v=>({'revisao.numero':v.numero,'revisao.data':v.criadaEm,'revisao.descricao':v.resumo,'revisao.responsavel':v.elaborador})),
    ativo:r.equipamentos.map(a=>{const notas=e.gestao.criticidade.notas[a.id]??[];const c=criticidadeAtivo(notas,e.gestao.criticidade.limites);return {'ativo.tag':a.tag,'ativo.descricao':a.descricao,'ativo.setor':a.setor,'ativo.tipo_nome':e.biblioteca.tipos.find(t=>t.id===a.tipo)?.nome??a.tipo,'criticidade.nota_seguranca':notas[0],'criticidade.nota_qualidade':notas[1],'criticidade.nota_producao':notas[2],'criticidade.nota_frequencia_falha':notas[3],'criticidade.nota_custo_reparo':notas[4],'criticidade.pontuacao':c.pontuacao,'criticidade.classe':c.classe};}),
    tarefa:tarefas.map(t=>({'tarefa.tag':t.tag,'tarefa.id':t.tarefaId,'tarefa.atividade':t.descricao,'tarefa.frequencia_vigente':t.periodicidade,'tarefa.especialidade':t.especialidade,'tarefa.duracao_horas':t.duracaoHoras,'tarefa.seguranca':sim(t.seguranca),'tarefa.origem_versao':`${t.origem} · ${t.versao}`,'tarefa.responsavel_nome':nomePessoa(t.responsavelId)})),
  };
  for(const parte of Object.keys(zip.files).filter(n=>/^word\/.*\.xml$/.test(n))){const original=await zip.file(parte).async('string');const doc=xml(original);
    for(const row of todos(doc,W,'tr')){const texto=todos(row,W,'t').map(t=>t.textContent).join('');const grupo=Object.keys(linhas).find(g=>texto.includes('{{'+g+'.'));if(!grupo)continue;for(const l of linhas[grupo].length?linhas[grupo]:[{}]){const clone=row.cloneNode(true);substituirParagrafos(clone,{...valores,...l});row.parentNode.insertBefore(clone,row);}row.remove();}
    substituirParagrafos(doc,valores);zip.file(parte,serializar(doc));
  }
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
