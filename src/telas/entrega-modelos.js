// Tela 4: Entrega — baixar a planilha .xlsx e o resumo .docx.
import { estado, dadosAtuais } from '../estado.js';
import { validarLista } from '../logica/validacao.js';
import { esc, num, baixar, avisar } from '../ui.js';
import { gerarPacoteModelos } from '../saida/modelos-refeitos.js';
import contrato from '../dados/modelos-refeitos.json';

// Rascunho em memória: mantém a navegação, sem gravar dados pessoais no aparelho.
const essenciais=contrato.modelos.filter(m=>m.preenchimento==='parcial').map(m=>m.codigo);
const emissaoDaSessao={organizacao:'',elaborador:'',modo:'essencial',selecionados:[...essenciais],gerando:false,mensagem:'',concluido:false};
let refletirEmissao=()=>{};


export function telaEntregaModelos(main) {
  const problemas = validarLista(estado.equipamentos, estado.biblioteca.tipos);
  const comErro = Object.keys(problemas).length;
  const vazio = !estado.equipamentos.length;
  const bloqueado = comErro || vazio;
  const dados = dadosAtuais();
  const r = dados.resumo;

  main.innerHTML = `
    <section class="cartao entrega-principal"><p class="sobretitulo">Documentos PCM Direto</p><h2>Modelos do rascunho</h2>
      <p>Escolha entre os 18 modelos e gere cópias com os dados do rascunho de equipamentos. Para usar uma revisão ativa, execuções e falhas, acesse <a href="#entrega">Documentos de gestão</a>.</p>
      ${bloqueado?'':`<p class="origem">${r.equipamentos} equipamentos · ${r.tarefas} tarefas ativas · ${num(r.horasAno)} h previstas no ano</p>`}
      <form id="pacote-refeito">
        <fieldset class="opcoes-pacote"><legend>Quais documentos deseja?</legend>
          ${[['essencial','Essencial','5 documentos'],['completo','Completo','18 documentos'],['personalizado','Escolher','Personalizar']].map(([valor,titulo,descricao])=>`<label class="opcao-pacote"><input type="radio" name="pacote" value="${valor}" ${emissaoDaSessao.modo===valor?'checked':''}><span><strong>${titulo}</strong><small>${descricao}</small></span></label>`).join('')}
        </fieldset>
        <details id="selecionar-documentos" ${emissaoDaSessao.modo==='personalizado'?'open':''}><summary>Escolher documentos individualmente</summary>
          <div class="grade duas selecao-documentos">${contrato.modelos.map(m=>`<label class="caixa"><input type="checkbox" name="documento" value="${esc(m.codigo)}" ${emissaoDaSessao.selecionados.includes(m.codigo)?'checked':''}><span>${esc(m.codigo)} · ${esc(m.titulo)}<small>${m.preenchimento==='parcial'?'Recebe os dados disponíveis':'Preenchimento manual'}</small></span></label>`).join('')}</div>
        </details>
        <p id="resumo-selecao" class="origem" role="status" aria-live="polite"></p>
        <div id="identificacao-emissao" class="grade duas">
          <div><label for="modelo-organizacao">Organização (opcional)</label><input id="modelo-organizacao" name="organizacao" value="${esc(emissaoDaSessao.organizacao)}" maxlength="120" autocomplete="organization"></div>
          <div><label for="modelo-elaborador">Elaborado por</label><input id="modelo-elaborador" name="elaborador" value="${esc(emissaoDaSessao.elaborador)}" required maxlength="120" autocomplete="name"></div>
        </div>
        <p id="nota-emissao" class="origem">Os documentos ficam em elaboração. Informações não cadastradas ficam vazias ou “A definir”. Confira antes de usar.</p>
        <p id="bloqueio-documentos" class="erro" role="status" aria-live="polite"></p>
        <div class="acoes"><button id="baixar-modelos-refeitos" aria-describedby="bloqueio-documentos resumo-selecao">Gerar meus documentos (.zip)</button><a href="#modelos">Baixar modelos em branco</a></div>
        <p id="progresso-modelos" role="status" aria-live="polite"></p>
      </form>
      <section id="apos-gerar" class="orientacao-entrega" hidden tabindex="-1"><h3>Pacote preparado</h3><ol><li>Localize o arquivo baixado e extraia o ZIP.</li><li>Abra os documentos. Se houver planilhas, recalcule no Excel com Ctrl+Alt+F9.</li><li>Confira os avisos e campos “A definir” antes de usar ou aprovar.</li></ol></section>
    </section>
  `;

  const form=main.querySelector('#pacote-refeito');
  const button=main.querySelector('#baixar-modelos-refeitos');
  const status=main.querySelector('#progresso-modelos');
  const selecao=main.querySelector('#selecionar-documentos');
  function atualizarSelecao(){
    const modelos=contrato.modelos.filter(m=>emissaoDaSessao.selecionados.includes(m.codigo));
    const parciais=modelos.filter(m=>m.preenchimento==='parcial').length;
    main.querySelector('#resumo-selecao').textContent=!modelos.length?'Nenhum documento selecionado.':parciais===modelos.length?`${modelos.length} documento${modelos.length===1?'':'s'} com os dados disponíveis do aplicativo.`:!parciais?`${modelos.length} modelo${modelos.length===1?'':'s'} para preenchimento manual. Não exige cadastro de equipamentos.`:`${modelos.length} documentos: ${parciais} com dados disponíveis e ${modelos.length-parciais} manuais.`;
    main.querySelector('#identificacao-emissao').hidden=!parciais;
    main.querySelector('#nota-emissao').hidden=!parciais;
    for(const input of form.querySelectorAll('input'))input.disabled=emissaoDaSessao.gerando;
    form.elements.organizacao.disabled=emissaoDaSessao.gerando||!parciais;form.elements.elaborador.disabled=emissaoDaSessao.gerando||!parciais;form.elements.elaborador.required=!!parciais;
    const motivo=!modelos.length?'Selecione pelo menos um documento.':parciais&&bloqueado?(vazio?'Cadastre ao menos um equipamento para preencher os documentos.':`Corrija ${comErro} equipamento(s) com pendência para preencher os documentos.`):'';
    const aviso=main.querySelector('#bloqueio-documentos');aviso.replaceChildren();
    if(motivo){aviso.append(document.createTextNode(motivo+' '));if(parciais&&bloqueado){const link=document.createElement('a');link.href='#equipamentos';link.textContent='Ir para Equipamentos';aviso.append(link);}}
    aviso.hidden=!motivo;button.disabled=emissaoDaSessao.gerando||!!motivo;
    form.setAttribute('aria-busy',String(emissaoDaSessao.gerando));
  }
  refletirEmissao=()=>{if(!form.isConnected)return;atualizarSelecao();status.textContent=emissaoDaSessao.mensagem;main.querySelector('#apos-gerar').hidden=!emissaoDaSessao.concluido;button.textContent=emissaoDaSessao.gerando?'Gerando documentos…':'Gerar meus documentos (.zip)';};
  for(const nome of ['organizacao','elaborador'])form.elements[nome].addEventListener('input',()=>{emissaoDaSessao[nome]=form.elements[nome].value;emissaoDaSessao.concluido=false;emissaoDaSessao.mensagem='';refletirEmissao();});
  form.addEventListener('change',event=>{
    if(event.target.name==='pacote'){
      emissaoDaSessao.modo=event.target.value;
      if(event.target.value!=='personalizado')emissaoDaSessao.selecionados=event.target.value==='completo'?contrato.modelos.map(m=>m.codigo):[...essenciais];
      else selecao.open=true;
      for(const input of form.querySelectorAll('[name="documento"]'))input.checked=emissaoDaSessao.selecionados.includes(input.value);
    }else if(event.target.name==='documento'){
      emissaoDaSessao.selecionados=[...form.querySelectorAll('[name="documento"]:checked')].map(input=>input.value);
      emissaoDaSessao.modo='personalizado';form.querySelector('[name="pacote"][value="personalizado"]').checked=true;
    }else return;
    emissaoDaSessao.concluido=false;emissaoDaSessao.mensagem='';refletirEmissao();
  });
  refletirEmissao();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(button.disabled)return;
    const selecionados=[...emissaoDaSessao.selecionados];
    const meta={organizacao:form.elements.organizacao.value,elaborador:form.elements.elaborador.value};
    emissaoDaSessao.gerando=true;emissaoDaSessao.concluido=false;emissaoDaSessao.mensagem='Preparando documentos…';refletirEmissao();
    try{
      const content=await gerarPacoteModelos(estado,meta,message=>{emissaoDaSessao.mensagem='Preparando '+message+'…';refletirEmissao();},selecionados);
      baixar(content,'pcm-direto-modelos-refeitos.zip','application/zip');emissaoDaSessao.mensagem=`Pacote preparado com ${selecionados.length} documento${selecionados.length===1?'':'s'}.`;emissaoDaSessao.concluido=true;refletirEmissao();avisar('Documentos preparados para download.');
    }catch(error){emissaoDaSessao.mensagem=error.message;refletirEmissao();avisar(error.message);}finally{emissaoDaSessao.gerando=false;refletirEmissao();}
  });

}
