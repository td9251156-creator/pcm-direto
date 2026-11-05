import { CHAVE_RASCUNHO_CRIADOR, criacaoVazia, normalizarCriacao, validarCriacao } from './logica/criador-piloto.js';
import { gerarCriacaoXlsx, nomeArquivoCriacao } from './saida/criador-piloto-xlsx.js';

const raiz=document.querySelector('[data-criador]');
if(raiz){
  raiz.hidden=false;
  const form=raiz.querySelector('[data-form-criador]'), campos=raiz.querySelector('[data-campos]'), previa=raiz.querySelector('[data-previa]'), status=raiz.querySelector('[data-status]');
  let estado=carregar();
  const solicitado=new URL(location.href).searchParams.get('modelo');
  if(solicitado==='PCM-MAN-005'||solicitado==='PCM-MAN-016') estado.selecionado=solicitado;
  let criacao=estado.rascunhos[estado.selecionado]||criacaoVazia(estado.selecionado); let temporizador;

  const campo=(nome,rotulo,valor='',opcoes='')=>`<label class="${opcoes.includes('largo')?'largo':''}">${rotulo}<input name="${nome}" value="${atributo(valor)}" ${opcoes.replace('largo','')}></label>`;
  const area=(nome,rotulo,valor='',ajuda='')=>`<label class="largo">${rotulo}<textarea name="${nome}">${textoHtml(valor)}</textarea>${ajuda?`<span class="dica-campo">${textoHtml(ajuda)}</span>`:''}</label>`;
  function renderizar(){
    const d=criacao.dados;
    document.querySelectorAll('[data-modelo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modelo===criacao.modelo)));
    if(criacao.modelo==='PCM-MAN-005') campos.innerHTML=`<div class="grade-campos">${campo('titulo','Título da checklist *',d.titulo,'required maxlength="120"')}${campo('tag','TAG do equipamento',d.tag,'maxlength="50"')}${campo('equipamento','Equipamento',d.equipamento,'maxlength="120"')}${campo('servico','Serviço ou intervalo',d.servico,'maxlength="120"')}${campo('tecnico','Técnico',d.tecnico,'maxlength="100"')}${campo('elaborado','Elaborado por',d.elaborado,'maxlength="100"')}${campo('aprovado','Aprovado por',d.aprovado,'maxlength="100"')}${area('itens','Itens da checklist *',d.itens.join('\n'),'Um item por linha, em ordem de execução. Máximo de 30 itens.')}</div>`;
    else campos.innerHTML=`<div class="grade-campos">${campo('titulo','Título do procedimento *',d.titulo,'required maxlength="120"')}${campo('numero','Número do POP',d.numero,'maxlength="40"')}${campo('area','Área ou departamento',d.area,'maxlength="100"')}${campo('responsavel','Responsável',d.responsavel,'maxlength="100"')}${campo('elaborado','Elaborado por',d.elaborado,'maxlength="100"')}${campo('aprovado','Aprovado por',d.aprovado,'maxlength="100"')}${area('objetivo','Objetivo',d.objetivo)}${area('aplica','Onde se aplica',d.aplica)}${area('naoAplica','Onde não se aplica',d.naoAplica)}${area('perigo','Perigos da tarefa',d.perigo)}${area('controle','Controles ou EPI',d.controle)}${area('materiais','Ferramentas e materiais',d.materiais)}<div class="passos-editor"><h3>Passos do procedimento *</h3>${Array.from({length:8},(_,i)=>passo(i,d.passos[i])).join('')}</div>${area('registro','Registro e verificação',d.registro)}</div>`;
    atualizarPrevia();
  }
  function passo(i,p={}){return `<div class="passo-editor"><p>Passo ${i+1}</p><label>Ação<input name="passo-${i}-acao" value="${atributo(p.acao||'')}" maxlength="250"></label><label>Ponto-chave<input name="passo-${i}-ponto" value="${atributo(p.ponto||'')}" maxlength="250"></label><label>Minutos<input name="passo-${i}-tempo" value="${atributo(p.tempo??'')}" type="number" min="0" max="999" step="1"></label><label><input name="passo-${i}-critico" type="checkbox" ${p.critico?'checked':''}> Crítico</label></div>`;}
  function lerFormulario(){
    const fd=new FormData(form), base=structuredClone(criacao); const v=n=>String(fd.get(n)||'');
    const comum={titulo:v('titulo'),elaborado:v('elaborado'),aprovado:v('aprovado')};
    base.dados=criacao.modelo==='PCM-MAN-005'?{...comum,tag:v('tag'),equipamento:v('equipamento'),servico:v('servico'),tecnico:v('tecnico'),itens:v('itens').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}:{...comum,numero:v('numero'),area:v('area'),responsavel:v('responsavel'),objetivo:v('objetivo'),aplica:v('aplica'),naoAplica:v('naoAplica'),perigo:v('perigo'),controle:v('controle'),materiais:v('materiais'),registro:v('registro'),passos:Array.from({length:8},(_,i)=>({acao:v(`passo-${i}-acao`),ponto:v(`passo-${i}-ponto`),tempo:v(`passo-${i}-tempo`),critico:fd.has(`passo-${i}-critico`)})).filter(p=>p.acao)};
    return normalizarCriacao(base);
  }
  function guardar(){try{criacao=lerFormulario();estado.selecionado=criacao.modelo;estado.rascunhos[criacao.modelo]=criacao;localStorage.setItem(CHAVE_RASCUNHO_CRIADOR,JSON.stringify(estado));status.textContent='Rascunho guardado neste navegador.';}catch{status.textContent='Não foi possível guardar o rascunho neste navegador.';} atualizarPrevia();}
  function atualizarPrevia(){
    previa.replaceChildren(); const h=document.createElement('h3');h.textContent=criacao.dados.titulo||'Seu material ainda não tem título';previa.append(h);
    const p=document.createElement('p');p.textContent=criacao.modelo==='PCM-MAN-005'?`${criacao.dados.itens.length} de 30 itens preenchidos.`:`${criacao.dados.passos.length} de 8 passos preenchidos.`;previa.append(p);
    const lista=document.createElement(criacao.modelo==='PCM-MAN-005'?'ul':'ol'); const itens=criacao.modelo==='PCM-MAN-005'?criacao.dados.itens:criacao.dados.passos.map(x=>x.acao); itens.slice(0,8).forEach(x=>{const li=document.createElement('li');li.textContent=x;lista.append(li);}); if(itens.length) previa.append(lista);
  }
  form.addEventListener('input',()=>{clearTimeout(temporizador);try{criacao=lerFormulario();atualizarPrevia();}catch{/* Um campo intermediário inválido não apaga o último rascunho válido. */}temporizador=setTimeout(guardar,350);});
  document.querySelectorAll('[data-modelo]').forEach(b=>b.addEventListener('click',()=>{guardar();estado.rascunhos[criacao.modelo]=criacao;criacao=estado.rascunhos[b.dataset.modelo]||criacaoVazia(b.dataset.modelo);estado.selecionado=b.dataset.modelo;const url=new URL(location.href);url.searchParams.set('modelo',b.dataset.modelo);history.replaceState(null,'',url);renderizar();guardar();campos.querySelector('input')?.focus();}));
  form.addEventListener('submit',async e=>{e.preventDefault();guardar();const v=validarCriacao(criacao);if(!v.ok){status.textContent=v.erros.join(' ');form.querySelector(':invalid')?.focus();return;}const botao=form.querySelector('[type=submit]');botao.disabled=true;status.textContent='Preparando uma cópia completa do Excel…';try{const bytes=await gerarCriacaoXlsx(v.criacao);baixar(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),nomeArquivoCriacao(v.criacao));status.textContent='Excel gerado. O rascunho continua guardado neste navegador.';}catch(e){status.textContent=e?.message||'Não foi possível gerar o Excel.';}finally{botao.disabled=false;}});
  raiz.querySelector('[data-exportar]').addEventListener('click',()=>{guardar();baixar(new Blob([JSON.stringify(criacao,null,2)],{type:'application/json'}),`${criacao.modelo}_rascunho.json`);status.textContent='Rascunho JSON baixado.';});
  raiz.querySelector('[data-importar]').addEventListener('change',async e=>{const arquivo=e.target.files?.[0];if(!arquivo)return;try{const importada=normalizarCriacao(JSON.parse(await arquivo.text()));estado.rascunhos[importada.modelo]=importada;estado.selecionado=importada.modelo;criacao=importada;renderizar();guardar();status.textContent='Rascunho aberto e guardado neste navegador.';}catch(err){status.textContent=err?.message||'Não foi possível abrir o rascunho.';}finally{e.target.value='';}});
  raiz.querySelector('[data-limpar]').addEventListener('click',()=>{if(!confirm('Apagar o rascunho deste modelo e começar de novo?'))return;criacao=criacaoVazia(criacao.modelo);estado.rascunhos[criacao.modelo]=criacao;renderizar();guardar();campos.querySelector('input')?.focus();});
  renderizar();
}

function carregar(){try{const x=JSON.parse(localStorage.getItem(CHAVE_RASCUNHO_CRIADOR)||'null');if(x&&x.versao===1&&x.rascunhos){const r={};for(const [k,v] of Object.entries(x.rascunhos))try{r[k]=normalizarCriacao(v);}catch{/* Ignora somente o rascunho incompatível. */}return{versao:1,selecionado:r[x.selecionado]?x.selecionado:'PCM-MAN-005',rascunhos:r};}}catch{/* Rascunho corrompido não impede uma criação nova. */}return{versao:1,selecionado:'PCM-MAN-005',rascunhos:{}};}
function baixar(blob,nome){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function atributo(v){return textoHtml(v).replace(/`/g,'&#96;');}
function textoHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
