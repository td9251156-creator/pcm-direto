import {estado} from '../estado.js';
import {validarLista} from '../logica/validacao.js';
import {esc,baixar,avisar} from '../ui.js';
import {gerarModelo} from '../saida/modelos-refeitos.js';
import {guiaModelo} from '../dados/guias-modelos.js';
import contrato from '../dados/modelos-refeitos.json';
import {AVISO_TRANSICAO} from '../dados/modelos-anteriores.js';

// Só os modelos que recebem dados; os manuais do formato anterior foram substituídos pela Biblioteca PCM v2.
const MODELOS=contrato.modelos.filter(m=>m.preenchimento==='parcial');

// Somente na memória da sessão: não grava campos ainda não confirmados.
const emissao={codigo:'',organizacao:'',elaborador:'',gerando:false,mensagem:''};
let refletirEmissao=()=>{};

export function telaEntregaModelos(main){
  const codigo=new URLSearchParams(location.hash.split('?')[1]).get('documento');
  if(codigo&&!emissao.gerando)emissao.codigo=MODELOS.some(m=>m.codigo===codigo)?codigo:'';
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Um arquivo por vez</p><h2>Preencher um modelo</h2><p>Escolha um documento para receber os dados dos equipamentos em edição. Para usar a revisão ativa e seu histórico, acesse <a href="#entrega">Documentos da revisão ativa</a>.</p><p class="aviso-tecnico">${esc(AVISO_TRANSICAO)}</p></header>
    <section class="cartao"><form id="modelo-individual"><label for="documento-modelo">Qual modelo deseja?</label><select id="documento-modelo" name="documento"><option value="">Selecione um modelo</option>${MODELOS.map(m=>`<option value="${m.codigo}" ${emissao.codigo===m.codigo?'selected':''}>${esc(m.titulo)} · ${m.arquivo.endsWith('xlsx')?'Excel':'Word'}</option>`).join('')}</select>
    <div id="guia-modelo"></div><div id="identificacao-emissao" class="grade duas" hidden><div><label for="modelo-organizacao">Organização (opcional)</label><input id="modelo-organizacao" name="organizacao" value="${esc(emissao.organizacao)}" maxlength="120" autocomplete="organization"></div><div><label for="modelo-elaborador">Elaborado por</label><input id="modelo-elaborador" name="elaborador" value="${esc(emissao.elaborador)}" maxlength="120" autocomplete="name"></div></div>
    <p id="bloqueio-documentos" class="erro" role="status" aria-live="polite"></p><div class="acoes"><button id="baixar-modelo" aria-describedby="bloqueio-documentos">Escolha um modelo</button><a href="#modelos">Ver os modelos atuais da Biblioteca PCM v2</a></div><p id="progresso-modelos" role="status" aria-live="polite"></p></form></section>
    <section class="cartao"><h3>Depois do download</h3><p>Abra o arquivo diretamente no Excel, LibreOffice ou Word. Confira os campos “A definir”, recalcule as fórmulas das planilhas e revise antes de usar. Os documentos ficam em elaboração.</p><p class="origem">O arquivo baixado não sincroniza com o aplicativo. Nenhum dado é enviado para gerar o documento.</p></section>`;
  const form=main.querySelector('#modelo-individual');const button=main.querySelector('#baixar-modelo');const select=form.elements.documento;
  const modeloAtual=()=>MODELOS.find(m=>m.codigo===emissao.codigo);
  function atualizarGuia(){
    const modelo=modeloAtual();const guia=modelo&&guiaModelo(modelo.codigo);
    main.querySelector('#guia-modelo').innerHTML=modelo?`<h3>${esc(modelo.titulo)}</h3><p>${esc(guia.quando)}</p><p class="origem"><strong>Comece assim:</strong> ${esc(guia.comecar)}</p><p class="origem">${modelo.preenchimento==='parcial'?'O aplicativo insere os dados disponíveis. Complete e confira os demais campos.':'Este modelo é preenchido no próprio arquivo. Você pode baixar sem cadastrar equipamentos.'}</p>`:'';
  }
  refletirEmissao=()=>{
    if(!form.isConnected)return;
    const modelo=modeloAtual();const parcial=modelo?.preenchimento==='parcial';
    for(const input of form.querySelectorAll('input,select'))input.disabled=emissao.gerando;
    main.querySelector('#identificacao-emissao').hidden=!parcial;
    form.elements.organizacao.disabled=emissao.gerando||!parcial;form.elements.elaborador.disabled=emissao.gerando||!parcial;form.elements.elaborador.required=!!parcial;
    const problemas=parcial&&Object.keys(validarLista(estado.equipamentos,estado.biblioteca.tipos)).length;
    const motivo=!modelo?'Escolha o documento que deseja baixar.':parcial&&!estado.equipamentos.length?'Cadastre ao menos um equipamento para preencher este modelo.':problemas?'Corrija os equipamentos com pendência antes de preencher este modelo.':'';
    const aviso=main.querySelector('#bloqueio-documentos');aviso.textContent=motivo;aviso.hidden=!motivo;
    if(parcial&&motivo){const link=document.createElement('a');link.href='#equipamentos';link.textContent='Ir para Equipamentos';aviso.append(' ',link);}
    button.disabled=emissao.gerando||!!motivo;button.textContent=emissao.gerando?'Preparando arquivo…':modelo?`${parcial?'Gerar':'Baixar'} ${modelo.arquivo.endsWith('xlsx')?'Excel':'Word'}`:'Escolha um modelo';
    form.setAttribute('aria-busy',String(emissao.gerando));main.querySelector('#progresso-modelos').textContent=emissao.mensagem;
  };
  select.addEventListener('change',()=>{emissao.codigo=select.value;emissao.mensagem='';history.replaceState(null,'','#entrega-modelos'+(select.value?'?documento='+select.value:''));atualizarGuia();refletirEmissao();});
  for(const nome of ['organizacao','elaborador'])form.elements[nome].addEventListener('input',()=>{emissao[nome]=form.elements[nome].value;});
  atualizarGuia();refletirEmissao();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(button.disabled||emissao.gerando)return;
    const modelo=modeloAtual();const meta={organizacao:form.elements.organizacao.value,elaborador:form.elements.elaborador.value};
    emissao.gerando=true;emissao.mensagem=`Preparando ${modelo.titulo}…`;refletirEmissao();
    try{const arquivo=await gerarModelo(estado,meta,modelo.codigo);baixar(arquivo.conteudo,arquivo.nome,arquivo.tipo);emissao.mensagem=`${modelo.titulo}: arquivo preparado para download. Confira antes de usar.`;avisar(emissao.mensagem);}
    catch(erro){emissao.mensagem=erro.message;avisar(erro.message);}
    finally{emissao.gerando=false;refletirEmissao();}
  });
}
