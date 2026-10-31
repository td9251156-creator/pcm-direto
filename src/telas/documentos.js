import {estado,salvar} from '../estado.js';
import {prepararEmissao,preencherXlsx,preencherDocx} from '../saida/pcmd.js';
import {MODELOS_DOCUMENTAIS,VERSAO_MODELOS,AVISO_TRANSICAO} from '../dados/modelos-anteriores.js';
import {telaEntrega} from './entrega.js';
import {novoId} from '../logica/entrada.js';
import {textoData} from '../logica/cronograma.js';
import {esc,baixar,avisar} from '../ui.js';
import {dataExibida} from '../logica/consulta-execucao.js';
import {guiaModelo} from '../dados/guias-modelos.js';
import {MODELOS_V2,VERSAO_BIBLIOTECA_V2} from '../dados/modelos-v2.js';
import {dadosPcmMan002} from '../logica/biblioteca-v2-dados.js';

// Modelos da Biblioteca v2 que o app já preenche. O gerador só é carregado ao gerar.
const PREENCHIDOS_V2=[{...MODELOS_V2.find(m=>m.codigo==='PCM-MAN-002'),
  preenche:'Cadastros (ativos, setores, famílias e pessoas), Plano com as tarefas da revisão ativa (a cada quantos dias, responsável, duração e 1ª execução) e o Cronograma ligado ao Plano. Tarefas de segurança vêm marcadas.',
  branco:'Criticidade e FMECA (análise da equipe; a escala do modelo é diferente da criticidade do app), componente, tipo de tarefa e se exige parada.',
  preencher:async(bytes,emissao)=>(await import('../saida/biblioteca-v2-xlsx.js')).preencherPcmMan002(bytes,dadosPcmMan002(emissao))}];

const rascunhoEmissao={dataCorte:null,elaborador:null,aprovado:false,aprovador:'',gerando:false,codigo:'',mensagem:''};
let refletirEmissao=()=>{};
export function telaDocumentos(main){
  const revisao=estado.programacao.revisoes.at(-1);const hoje=textoData(new Date());
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Documentos de gestão</p><h2>Documentos da revisão ativa</h2><p>Preencha a identificação e baixe o documento que precisa. Cada arquivo usa o plano da revisão ativa e os registros até a data de corte.</p><p class="origem">Para checklists, estoque e outros controles, veja os <a href="#modelos">modelos para sua rotina</a>.</p><p class="aviso-tecnico">${esc(AVISO_TRANSICAO)}</p></header>
    <section class="cartao"><h3>1. Confira a identificação</h3>${revisao?`<p>Revisão ${revisao.numero} · vigência ${dataExibida(revisao.vigencia)}.</p>`:'<p><a href="#planejar">Ative uma revisão em Planejar</a> para gerar documentos preenchidos. Você pode <a href="#modelos">baixar os modelos em branco sem cadastrar dados</a>.</p>'}
    <form id="emissao-pcmd"><div class="grade duas"><div><label for="data-corte">Incluir registros até</label><input id="data-corte" name="dataCorte" type="date" value="${esc(rascunhoEmissao.dataCorte??hoje)}" max="${hoje}" required></div><div><label for="emissao-elaborador">Elaborado por</label><input id="emissao-elaborador" name="elaborador" value="${esc(rascunhoEmissao.elaborador??revisao?.elaborador??'')}" maxlength="120" required></div></div>
    <details ${rascunhoEmissao.aprovado?'open':''}><summary>Informar aprovação já realizada (opcional)</summary><label class="caixa caixa-bloco"><input name="aprovado" type="checkbox" id="emissao-aprovada" ${rascunhoEmissao.aprovado?'checked':''}> Estes documentos já foram aprovados pelo responsável</label><label for="emissao-aprovador">Aprovador</label><input id="emissao-aprovador" name="aprovador" maxlength="120" value="${esc(rascunhoEmissao.aprovador)}"><p class="origem">Sem essa confirmação, o documento fica “Em elaboração”, com aprovador “A definir”.</p></details>
    <p id="bloqueio-pcmd" class="origem">${revisao?'Escolha um documento abaixo.':'A geração será liberada após ativar uma revisão em Planejar.'}</p><p id="progresso-pcmd" role="status" aria-live="polite"></p></form></section>
    <section aria-labelledby="escolher-documento"><h3 id="escolher-documento">2. Escolha o documento</h3>
    <h4>Biblioteca PCM v2</h4><div class="grade duas">${PREENCHIDOS_V2.map(m=>`<article class="cartao"><p class="sobretitulo">${m.codigo} · Excel</p><h4>${esc(m.titulo)}</h4><p>${esc(m.preenche)}</p><p class="origem"><strong>Fica em branco para a equipe:</strong> ${esc(m.branco)}</p><div class="acoes"><button type="submit" form="emissao-pcmd" name="documento" value="${m.codigo}" data-documento="${m.codigo}" aria-label="Gerar ${esc(m.titulo)} da revisão ativa" aria-describedby="bloqueio-pcmd" ${revisao?'':'disabled'}>Gerar Excel</button><a href="${esc(m.url)}" download aria-label="Baixar ${esc(m.titulo)} em branco">Modelo em branco</a></div></article>`).join('')}</div>
    <h4>Formato anterior (em transição)</h4><div class="grade duas">${MODELOS_DOCUMENTAIS.map(([c,n,,a,ext])=>{const guia=guiaModelo(c);return `<article class="cartao"><p class="sobretitulo">${c} · ${ext==='xlsx'?'Excel':'Word'}</p><h4>${n}</h4><p>${esc(guia.quando)}</p><p class="origem"><strong>Comece assim:</strong> ${esc(guia.comecar)}</p><div class="acoes"><button type="submit" form="emissao-pcmd" name="documento" value="${c}" data-documento="${c}" aria-label="Gerar ${n} da revisão ativa" aria-describedby="bloqueio-pcmd" ${revisao?'':'disabled'}>Gerar ${ext==='xlsx'?'Excel':'Word'}</button><a href="./modelos/${a}.${ext}" download aria-label="Baixar ${n} em branco">Modelo em branco</a></div></article>`;}).join('')}</div></section>
    <details class="cartao"><summary>Outros formatos do planejamento em edição</summary><p class="origem">Exportações anteriores, sem o histórico completo da revisão ativa. Para guardar toda a base, use <a href="#dados">Meus dados → Backup completo</a>.</p><div id="formatos-anteriores"></div></details>
    <section class="cartao"><h3>Depois do download</h3><p>Abra o arquivo diretamente no Excel, LibreOffice ou Word. Recalcule as fórmulas das planilhas e confira impressão, pendências e campos “A definir”. As periodicidades devem ser confirmadas com o manual do fabricante.</p><a href="#apoio">Ajuda para usar os documentos</a></section>`;
  telaEntrega(main.querySelector('#formatos-anteriores'));
  const form=main.querySelector('#emissao-pcmd');
  form.addEventListener('invalid',e=>e.target.closest('details')?.setAttribute('open',''),true);
  refletirEmissao=()=>{
    if(!form.isConnected)return;
    for(const i of form.querySelectorAll('input'))i.disabled=rascunhoEmissao.gerando;
    form.elements.aprovador.disabled=rascunhoEmissao.gerando||!rascunhoEmissao.aprovado;form.elements.aprovador.required=rascunhoEmissao.aprovado;
    form.setAttribute('aria-busy',String(rascunhoEmissao.gerando));
    for(const b of main.querySelectorAll('[data-documento]')){b.disabled=rascunhoEmissao.gerando||!revisao;b.textContent=rascunhoEmissao.gerando&&rascunhoEmissao.codigo===b.value?'Preparando…':b.value.startsWith('PCMD-W')?'Gerar Word':'Gerar Excel';}
    form.querySelector('#progresso-pcmd').textContent=rascunhoEmissao.mensagem;
  };
  for(const i of form.querySelectorAll('input'))i.addEventListener('input',()=>{rascunhoEmissao[i.name]=i.type==='checkbox'?i.checked:i.value;refletirEmissao();});refletirEmissao();
  form.onsubmit=async e=>{
    e.preventDefault();const v2=PREENCHIDOS_V2.find(m=>m.codigo===e.submitter?.value);
    const modelo=v2?[v2.codigo,v2.titulo,'',v2.url.replace(/^\.\/modelos\//,'').replace(/\.xlsx$/,''),'xlsx']:MODELOS_DOCUMENTAIS.find(m=>m[0]===e.submitter?.value);
    if(!modelo||!revisao||rascunhoEmissao.gerando)return;
    const fd=new FormData(form);const [codigo,nome,,arquivo,ext]=modelo;
    rascunhoEmissao.gerando=true;rascunhoEmissao.codigo=codigo;rascunhoEmissao.mensagem=`Preparando ${nome}…`;refletirEmissao();
    try{
      const emissao=prepararEmissao(estado,{dataCorte:fd.get('dataCorte'),elaborador:fd.get('elaborador'),aprovador:fd.get('aprovador')??'',aprovado:fd.has('aprovado')});
      const resposta=await fetch(`./modelos/${arquivo}.${ext}`);if(!resposta.ok)throw new Error(`Modelo ${codigo} indisponível. Aguarde o carregamento offline ou tente conectado.`);
      const bytes=await resposta.arrayBuffer();const saida=v2?await v2.preencher(bytes,emissao):ext==='xlsx'?await preencherXlsx(bytes,`${arquivo}.${ext}`,emissao):await preencherDocx(bytes,emissao,`${arquivo}.${ext}`);
      let registrado=true;
      if(estado.programacao.revisoes.some(r=>r.id===emissao.revisao.id)){
        estado.programacao.emissoes.push({id:novoId(),modelo:codigo,versaoModelo:v2?VERSAO_BIBLIOTECA_V2:VERSAO_MODELOS,revisaoId:emissao.revisao.id,dataCorte:emissao.meta.dataCorte});
        registrado=await salvar();
      }
      baixar(saida,`${arquivo.split('/').pop()}-Preenchido.${ext}`,'application/vnd.openxmlformats-officedocument.'+(ext==='xlsx'?'spreadsheetml.sheet':'wordprocessingml.document'));
      rascunhoEmissao.mensagem=`${nome}: arquivo preparado. Confira antes de usar.${registrado?'':' O registro da emissão não pôde ser salvo; guarde um backup.'}`;avisar(rascunhoEmissao.mensagem);
    }catch(erro){rascunhoEmissao.mensagem=erro.message;avisar(erro.message);}
    finally{rascunhoEmissao.gerando=false;refletirEmissao();}
  };
}
