// Preenche somente as entradas disponíveis; preserva fórmulas, proteção e mídia nativa.
import JSZip from 'jszip';
import contrato from '../dados/modelos-refeitos.json';
import {montarDados,AVISO} from '../logica/pacote.js';
import {validarLista} from '../logica/validacao.js';
import {dataDaSemana,textoData} from '../logica/cronograma.js';
const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes=(el,ns,name)=>[...el.getElementsByTagNameNS(ns,name)];
const parse=text=>{const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('XML inválido no modelo.');return doc;};
const serial=doc=>new XMLSerializer().serializeToString(doc);
const date=value=>({data:typeof value==='string'?value:textoData(value)});
const display=value=>value===undefined||value===null||value===''?'A definir':String(value);

export function prepararModelos(estado,meta){
  if(!meta.elaborador?.trim())throw new Error('Informe quem elaborou os documentos.');
  const e=structuredClone(estado);
  if(!e.equipamentos.length||Object.keys(validarLista(e.equipamentos,e.biblioteca.tipos)).length)throw new Error('Confira os equipamentos antes de gerar os modelos.');
  const dados=montarDados(e.equipamentos,e.biblioteca,e.ajustes,e.inicio,e.capacidade);
  const ocorrencias=[];
  for(const t of dados.cronograma)for(const semana of t.semanas)for(let dia=0;dia<(t.periodicidade==='Diária'?5:1);dia++){
    const d=dataDaSemana(dados.inicio,semana);d.setDate(d.getDate()+dia);
    ocorrencias.push({A:t.tag,B:t.tarefaId,C:date(d),D:'app'});
  }
  const setores=[...new Set(dados.equipamentos.map(a=>a.setor))];
  const especialidades=[...new Set(dados.plano.map(t=>t.especialidade))];
  for(const [label,qty,limit] of [['ativos',dados.equipamentos.length,300],['tarefas',dados.plano.length,2000],['ocorrências',ocorrencias.length,5000],['setores',setores.length,30],['tipos',e.biblioteca.tipos.length,30],['especialidades',especialidades.length,30]]){
    if(qty>limit)throw new Error(`O modelo comporta ${limit} ${label}; sua lista tem ${qty}. Nenhum registro foi cortado. Amplie o modelo ou use a exportação anterior.`);
  }
  return {estado:e,dados,ocorrencias,setores,especialidades,meta:{elaborador:meta.elaborador.trim(),organizacao:meta.organizacao?.trim()||'A definir',data:textoData(dados.geradoEm)}};
}

async function validarBytes(bytes,modelo){
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==modelo.sha256)throw new Error('Modelo incompatível. Reabra o aplicativo para atualizar os arquivos, sem limpar seus dados.');
}

export async function preencherPlanilha(bytes,modelo,emissao){
  await validarBytes(bytes,modelo);
  const zip=await JSZip.loadAsync(bytes);const docs=new Map();const printEnds=new Map();
  async function sheet(name){
    if(!modelo.abas[name])throw new Error('Aba não encontrada: '+name);
    if(!docs.has(name)){
      const doc=parse(await zip.file(modelo.abas[name]).async('string'));
      docs.set(name,{doc,cells:new Map(nodes(doc,S,'c').map(c=>[c.getAttribute('r'),c]))});
    }
    return docs.get(name);
  }
  async function write(name,ref,value){
    const {doc,cells}=await sheet(name);const c=cells.get(ref);
    if(!c)throw new Error('Campo não encontrado: '+name+'!'+ref);
    if(nodes(c,S,'f').length)throw new Error('Tentativa de substituir fórmula: '+name+'!'+ref);
    c.replaceChildren();c.removeAttribute('t');
    if(value===undefined||value===null||value==='')return;
    if(value?.data)value=(Date.parse(value.data+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;
    if(typeof value==='number'){
      if(!Number.isFinite(value))throw new Error('Número inválido.');
      const v=doc.createElementNS(S,'v');v.textContent=String(value);c.append(v);
    }else{
      c.setAttribute('t','inlineStr');const is=doc.createElementNS(S,'is');const t=doc.createElementNS(S,'t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=String(value);is.append(t);c.append(is);
    }
  }
  async function rows(name,items,start=4){printEnds.set(name,Math.max(printEnds.get(name)??12,start+items.length-1));for(let i=0;i<items.length;i++)for(const [col,value] of Object.entries(items[i]))await write(name,col+(start+i),value);}
  async function named(name,value){const ref=modelo.nomes[name];if(!ref)return;const m=ref.match(/^'?(.+?)'?!\$([A-Z]+)\$(\d+)$/);if(!m)throw new Error('Campo nomeado inválido: '+name);await write(m[1],m[2]+m[3],value);}
  const {estado:e,dados:d,meta:m,ocorrencias,setores,especialidades}=emissao;
  await named('cfg_elaborado',m.elaborador);await named('cfg_aprovado','');await named('pcmd_origem','Exportação local do PCM Direto');await named('pcmd_emissao',date(m.data));
  if(modelo.codigo==='PCMD-01'){
    await named('cad_org_nome',m.organizacao);await named('cad_elaborador_padrao',m.elaborador);await named('cad_aprovador_padrao','');
    const {doc}=await sheet('Lista Mestra');
    const ss=zip.file('xl/sharedStrings.xml')?nodes(parse(await zip.file('xl/sharedStrings.xml').async('string')),S,'si').map(si=>si.textContent):[];
    const text=c=>c.getAttribute('t')==='s'?ss[Number(nodes(c,S,'v')[0]?.textContent)]:c.textContent;
    const revisionRows=[];
    for(const c of nodes(doc,S,'c')){
      const match=c.getAttribute('r').match(/^A(\d+)$/);if(!match||Number(match[1])<4)continue;
      const code=text(c);if(!code?.startsWith('PCMD-'))continue;const row=Number(match[1]);
      const automatic=['PCMD-01','PCMD-02','PCMD-03','PCMD-04','PCMD-W1','PCMD-W2'].includes(code);
      await rows('Lista Mestra',[{D:automatic?'00':'',E:automatic?date(m.data):null,F:automatic?m.elaborador:'',G:'',H:null,I:'Em elaboração',K:automatic?'Emissão local; conferir antes de aprovar.':'Modelo manual; não emitido com dados do aplicativo.'}],row);
      if(automatic)revisionRows.push({A:code,B:'00',C:date(m.data),D:'Emissão local nos modelos refeitos.',E:m.elaborador});
    }
    for(let r=4;r<=103;r++)for(const c of ['A','B','C','D','E'])await write('Revisões',c+r,null);
    await rows('Revisões',revisionRows);
  }else{
    await rows('Revisões',[{A:'00',B:date(m.data),C:'Emissão local nos modelos refeitos.',D:m.elaborador,E:''}]);
  }
  if(modelo.codigo==='PCMD-02'){
    await rows('Ativos',d.equipamentos.map(a=>({A:a.tag,B:a.descricao,C:a.tipo,E:a.fabricante??'',F:a.modelo??'',G:a.setor,H:a.numero})));
    await rows('Cadastros',setores.map(s=>({A:s,B:s})),23);
    for(let r=4;r<=33;r++)for(const c of ['A','B','C'])await write('Listas',c+r,null);
    await rows('Listas',e.biblioteca.tipos.map(t=>({A:t.id,B:t.nome,C:t.sigla})));
  }
  if(modelo.codigo==='PCMD-03-04'){
    await rows('Plano Mestre',d.plano.map(t=>({A:t.tag,B:t.tarefaId,D:t.descricao,E:t.origem,F:t.versao,G:t.periodicidadeOriginal,H:t.seguranca?'Sim':'Não',I:t.periodicidade,K:t.especialidade,L:t.duracaoHoras,N:t.ativa?'Sim':'Não',O:'',Q:t.observacao})));
    await rows('Ocorrências',ocorrencias);await named('crono_inicio',date(d.inicio));await named('crono_ano',d.inicio.getFullYear());
    for(let r=4;r<=33;r++)await write('Listas','E'+r,null);
    await rows('Listas',especialidades.map(s=>({E:s})));
    const realizados=d.plano.filter(t=>e.execucoes?.[t.equipamentoId+'|'+t.tarefaId]).map(t=>{const ex=e.execucoes[t.equipamentoId+'|'+t.tarefaId];return {A:t.tag,B:t.tarefaId,D:t.descricao,E:null,F:date(ex.data),H:'Registro anterior sem vínculo com ocorrência. '+ex.observacao,I:'',J:'legado',K:'Não'};});
    if(realizados.length>3000)throw new Error('O modelo comporta 3000 execuções. Nenhum registro foi cortado.');
    await rows('Execuções',realizados);
  }
  for(const [name,{doc}] of docs){for(const c of nodes(doc,S,'c'))if(nodes(c,S,'f').length)for(const v of nodes(c,S,'v'))v.remove();zip.file(modelo.abas[name],serial(doc));}
  const wb=parse(await zip.file('xl/workbook.xml').async('string'));
  const sheets=nodes(wb,S,'sheet');for(const area of nodes(wb,S,'definedName').filter(n=>n.getAttribute('name')==='_xlnm.Print_Area')){
    const name=sheets[Number(area.getAttribute('localSheetId'))]?.getAttribute('name');if(printEnds.has(name))area.textContent=area.textContent.replace(/(\$?[A-Z]+\$?)\d+$/,(_,col)=>col+printEnds.get(name));
  }
  let calc=nodes(wb,S,'calcPr')[0];if(!calc){calc=wb.createElementNS(S,'calcPr');wb.documentElement.append(calc);}for(const [k,v] of Object.entries({calcMode:'auto',fullCalcOnLoad:'1',forceFullCalc:'1'}))calc.setAttribute(k,v);zip.file('xl/workbook.xml',serial(wb));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

function replaceParagraphs(root,values){
  for(const p of nodes(root,W,'p')){
    const ts=nodes(p,W,'t');let pos=0;const spans=ts.map(t=>{const item={t,start:pos,end:pos+t.textContent.length};pos=item.end;return item;});
    const text=ts.map(t=>t.textContent).join('');
    for(const m of [...text.matchAll(/\{\{([^}]+)\}\}/g)].reverse()){
      const start=m.index,end=start+m[0].length;const touched=spans.filter(s=>s.end>start&&s.start<end);if(!touched.length)continue;
      const first=touched[0],last=touched.at(-1),before=first.t.textContent.slice(0,start-first.start),after=last.t.textContent.slice(end-last.start);
      first.t.textContent=before+display(values[m[1]])+(first===last?after:'');for(const s of touched.slice(1))s.t.textContent=s===last?after:'';
    }
  }
}

export async function preencherManual(bytes,modelo,emissao){
  await validarBytes(bytes,modelo);const zip=await JSZip.loadAsync(bytes);const {meta:m,dados:d,estado:e}=emissao;
  const formatted=m.data.split('-').reverse().join('/');
  const values={'organizacao.nome':m.organizacao,'organizacao.referencial':'A definir','documento.elaborador':m.elaborador,'documento.aprovador':'A definir','documento.revisao':'00','documento.data':formatted,'documento.situacao':'Em elaboração','emissao.data':formatted,'origem.dados':'Exportação local do PCM Direto','criticidade.limite_a':12,'criticidade.limite_b':9};
  const records={ativo:d.equipamentos.map(a=>({'ativo.tag':a.tag,'ativo.descricao':a.descricao,'ativo.setor':a.setor,'ativo.tipo_nome':e.biblioteca.tipos.find(t=>t.id===a.tipo)?.nome??a.tipo,'criticidade.classe':'Pendente'})),tarefa:d.plano.filter(t=>t.ativa).map(t=>({'tarefa.tag':t.tag,'tarefa.id':t.tarefaId,'tarefa.atividade':t.descricao,'tarefa.frequencia_vigente':t.periodicidade,'tarefa.especialidade':t.especialidade,'tarefa.duracao_horas':String(t.duracaoHoras).replace('.',','),'tarefa.seguranca':t.seguranca?'Sim':'Não','tarefa.origem_versao':t.origem+' · '+t.versao}))};
  for(const part of Object.keys(zip.files).filter(n=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(n))){
    const doc=parse(await zip.file(part).async('string'));
    for(const row of nodes(doc,W,'tr')){const text=nodes(row,W,'t').map(t=>t.textContent).join('');const group=Object.keys(records).find(g=>text.includes('{{'+g+'.'));if(!group)continue;for(const record of records[group]){const clone=row.cloneNode(true);replaceParagraphs(clone,{...values,...record});row.parentNode.insertBefore(clone,row);}row.remove();}
    replaceParagraphs(doc,values);zip.file(part,serial(doc));
  }
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

export function selecionarModelos(codigos=null){
  if(codigos===null)return contrato.modelos;
  if(!Array.isArray(codigos)||!codigos.length)throw new Error('Selecione pelo menos um documento.');
  if(codigos.some(c=>!contrato.modelos.some(m=>m.codigo===c)))throw new Error('A seleção contém um documento desconhecido.');
  return contrato.modelos.filter(m=>codigos.includes(m.codigo));
}

export async function gerarPacoteModelos(estado,meta,progresso=()=>{},codigos=null){
  const modelos=selecionarModelos(codigos);
  const preenchidos=modelos.filter(m=>m.preenchimento==='parcial').length;
  const emissao=preenchidos?prepararModelos(estado,meta):null;const zip=new JSZip();
  for(const [i,modelo] of modelos.entries()){
    progresso(`${modelo.codigo} · ${i+1} de ${modelos.length}`);
    const response=await fetch('./modelos/'+modelo.arquivo);if(!response.ok)throw new Error('Modelo indisponível: '+modelo.codigo);
    const bytes=await response.arrayBuffer();await validarBytes(bytes,modelo);
    const automatic=modelo.preenchimento==='parcial';
    const content=automatic?await (modelo.arquivo.endsWith('.xlsx')?preencherPlanilha:preencherManual)(bytes,modelo,emissao):bytes;
    zip.file((automatic?'preenchidos/':'preenchimento-manual/')+modelo.arquivo,content);
  }
  zip.file('LEIA-ME.txt',`PCM Direto — modelos refeitos\n${modelos.length} documentos selecionados: ${preenchidos} com preenchimento parcial e ${modelos.length-preenchidos} para preenchimento manual.\nSituação: Em elaboração. Aprovador, criticidade, metas, estratégia e demais informações não cadastradas precisam ser definidos pelo responsável.\nAs últimas marcações antigas são exportadas sem vínculo: não contam como ocorrência concluída.\nExtraia o ZIP, abra os documentos e confira campos A definir e avisos. Nas planilhas, recalcule no Excel (Ctrl+Alt+F9) e confira as colunas Conferência.\nNão use os controles separados e o CMMS em paralelo para o mesmo registro: os arquivos não sincronizam entre si.\n\n${AVISO}\n`);
  return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
