// Tela 4: Entrega — baixar a planilha .xlsx e o resumo .docx.
import { estado, dadosAtuais } from '../estado.js';
import { validarLista } from '../logica/validacao.js';
import { nomeArquivo } from '../logica/pacote.js';
import { gerarXlsx } from '../saida/xlsx.js';
import { montarDocx } from '../saida/docx.js';
import { esc, num, baixar, avisar } from '../ui.js';
import { paraCsv } from '../logica/entrada.js';
import { gerarPacoteModelos } from '../saida/modelos-refeitos.js';
import contrato from '../dados/modelos-refeitos.json';

// Rascunho em memória: mantém a navegação, sem gravar dados pessoais no aparelho.
const essenciais=contrato.modelos.filter(m=>m.preenchimento==='parcial').map(m=>m.codigo);
const emissaoDaSessao={organizacao:'',elaborador:'',modo:'essencial',selecionados:[...essenciais],gerando:false,mensagem:'',concluido:false};
let refletirEmissao=()=>{};

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Desabilita o botão enquanto o arquivo é gerado. */
async function gerando(botao, tarefa) {
  const texto = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Gerando…';
  try {
    await tarefa();
  } catch (erro) {
    console.error(erro);
    avisar('Não foi possível gerar o arquivo. Tente de novo; se continuar, relate o problema no GitHub do projeto.');
  } finally {
    botao.disabled = false;
    botao.textContent = texto;
  }
}

export function telaEntrega(main) {
  const problemas = validarLista(estado.equipamentos, estado.biblioteca.tipos);
  const comErro = Object.keys(problemas).length;
  const vazio = !estado.equipamentos.length;
  const bloqueado = comErro || vazio;
  const dados = dadosAtuais();
  const r = dados.resumo;

  main.innerHTML = `
    <section class="cartao entrega-principal"><p class="sobretitulo">Documentos PCM Direto</p><h2>Gerar meus documentos</h2>
      <p>Escolha os arquivos, preencha a identificação e gere o ZIP.</p>
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
    <details class="cartao outras-exportacoes" id="outras-exportacoes"><summary>Outras opções de exportação</summary>
    <section class="cartao">
      <h3>Planilha e resumo</h3>
      <p class="origem">Exportação anterior em uma planilha e um resumo. Para utilizar os layouts refeitos, gere o pacote acima.</p>
      ${vazio ? '<p class="erro"><strong>A lista está vazia.</strong> <a href="#equipamentos">Cadastre os equipamentos</a>.</p>' : ''}
      ${comErro ? `<p class="erro"><strong>${comErro} equipamento(s) com pendência.</strong>
        <a href="#equipamentos">Corrija na tela Equipamentos</a> para liberar os arquivos.</p>` : ''}
      ${bloqueado ? '' : `
        <ul class="numeros">
          <li><strong>${r.equipamentos}</strong> equipamentos</li>
          <li><strong>${r.tarefas}</strong> tarefas ativas (${r.tarefasSeguranca} de segurança)</li>
          <li><strong>${num(r.horasAno)} h</strong> previstas no ano</li>
        </ul>`}
      <div class="acoes">
        <button type="button" id="baixar-tudo" ${bloqueado ? 'disabled' : ''}>Baixar planilha e resumo</button>
        <button type="button" class="secundario" id="baixar-xlsx" ${bloqueado ? 'disabled' : ''}>Só a planilha (.xlsx)</button>
        <button type="button" class="secundario" id="baixar-docx" ${bloqueado ? 'disabled' : ''}>Só o resumo (.docx)</button>
        <a class="botao secundario" href="#impressao" ${bloqueado ? 'aria-disabled="true" tabindex="-1"' : ''}>Imprimir cronograma (A4)</a>
        <button type="button" class="secundario" id="baixar-csv" ${vazio ? 'disabled' : ''}>Baixar equipamentos (.csv)</button>
      </div>
    </section>

    <section class="cartao">
      <h3>O que vem na planilha</h3>
      <ol>
        <li><strong>Leia-me:</strong> aviso, origem das tarefas e explicação de cada aba.</li>
        <li><strong>Resumo:</strong> números do plano, horas por especialidade e equipamentos por tipo.</li>
        <li><strong>Equipamentos:</strong> lista com TAG padronizada.</li>
        <li><strong>Plano:</strong> uma linha por tarefa, com periodicidade, especialidade, origem e versão.</li>
        <li><strong>Cronograma:</strong> semanas do ano (S1 a S52) de cada tarefa e horas por semana.</li>
        <li><strong>Ficha de Falha:</strong> modelo para começar o histórico.</li>
      </ol>
      <p>Só funções clássicas (PROCV, ÍNDICE, CORRESP, SOMASE, CONT.SE), sem macros: abre em versões antigas do Excel.</p>
      <p class="origem">${esc(estado.biblioteca.nome)}, versão ${esc(estado.biblioteca.versao)}. Ao terminar, guarde os arquivos:
      a lista fica salva só neste aparelho.</p>
    </section>
    </details>
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

  // As bibliotecas de planilha e documento só são carregadas quando você pede o arquivo
  async function planilha() {
    const ExcelJS = (await import('exceljs')).default;
    const buffer = await gerarXlsx(dadosAtuais(), ExcelJS);
    baixar(new Blob([buffer], { type: XLSX_MIME }), nomeArquivo('xlsx'));
  }
  async function resumo() {
    const docx = await import('docx');
    baixar(await docx.Packer.toBlob(montarDocx(dadosAtuais(), docx)), nomeArquivo('docx'));
  }

  main.querySelector('#baixar-tudo').addEventListener('click', (e) => gerando(e.target, async () => {
    await planilha();
    await resumo();
    avisar('Planilha e resumo gerados. Confira a pasta de downloads.');
  }));
  main.querySelector('#baixar-xlsx').addEventListener('click', (e) => gerando(e.target, async () => {
    await planilha();
    avisar('Planilha gerada.');
  }));
  main.querySelector('#baixar-docx').addEventListener('click', (e) => gerando(e.target, async () => {
    await resumo();
    avisar('Resumo gerado.');
  }));

  main.querySelector('#baixar-csv').addEventListener('click', () => {
    const linhas = estado.equipamentos.map((e) => ({ ...e, tipo: estado.biblioteca.tipos.find((t) => t.id === e.tipo)?.nome ?? e.tipo }));
    baixar('\uFEFF' + paraCsv(linhas), 'equipamentos.csv', 'text/csv;charset=utf-8');
  });
}
