import {estado,salvar} from '../estado.js';
import {prepararEmissao} from '../logica/emissao.js';
import {telaEntrega} from './entrega.js';
import {novoId} from '../logica/entrada.js';
import {textoData} from '../logica/cronograma.js';
import {esc,baixar,avisar} from '../ui.js';
import {dataExibida} from '../logica/consulta-execucao.js';
import {MODELOS_V2,VERSAO_BIBLIOTECA_V2} from '../dados/modelos-v2.js';
import {dadosPcmMan001,dadosPcmMan002,dadosPcmMan004,dadosPcmMan008,dadosCadastrosV2} from '../logica/biblioteca-v2-dados.js';

// Modelos da Biblioteca v2 que o app já preenche. O gerador só é carregado ao gerar.
const PREENCHIDOS_V2=[{...MODELOS_V2.find(m=>m.codigo==='PCM-MAN-001'),
  preenche:'Lista de documentos (este controle, os documentos já emitidos pelo app e as referências técnicas), revisões do plano e da emissão e as pessoas para as listas ▼.',
  branco:'Validade, situação e aprovação dos documentos já emitidos (o app não registra a aprovação deles), além de função e especialidade das pessoas.',
  preencher:async(bytes,emissao)=>(await import('../saida/biblioteca-v2-xlsx.js')).preencherPcmMan001(bytes,dadosPcmMan001(emissao))},
  {...MODELOS_V2.find(m=>m.codigo==='PCM-MAN-002'),
  preenche:'Cadastros (ativos, setores, famílias e pessoas), Criticidade com as notas de 1 a 5 avaliadas no app, Plano com as tarefas da revisão ativa (a cada quantos dias, responsável, duração e 1ª execução) e o Cronograma ligado ao Plano. Tarefas de segurança vêm marcadas.',
  branco:'Notas ainda não avaliadas, MFMEA (análise da equipe), componente, tipo de tarefa e se exige parada.',
  preencher:async(bytes,emissao)=>(await import('../saida/biblioteca-v2-xlsx.js')).preencherPcmMan002(bytes,dadosPcmMan002(emissao))},
  {...MODELOS_V2.find(m=>m.codigo==='PCM-MAN-004'),
  preenche:'Ordens de Serviço com o histórico até a data de corte: cada execução registrada (concluída ou cancelada), as ocorrências previstas ainda não feitas (programadas) e as OS importadas do 004, além dos cadastros.',
  branco:'Prioridade das preventivas (o app não registra) e a ficha "Ordem de serviço" para imprimir uma OS.',
  preencher:async(bytes,emissao)=>(await import('../saida/biblioteca-v2-xlsx.js')).preencherPcmMan004(bytes,dadosPcmMan004(emissao))},
  {...MODELOS_V2.find(m=>m.codigo==='PCM-MAN-008'),
  preenche:'Registro de falhas até a data de corte: as importadas do 008 e as do registro do app, com início e conclusão (data e hora, quando informadas); peça, horas de parada e reparo vão escritas na ação. Inclui os cadastros.',
  branco:'Hora das falhas registradas sem hora, a Ficha de falha e o Pareto (escolha das categorias pela equipe).',
  preencher:async(bytes,emissao)=>(await import('../saida/biblioteca-v2-xlsx.js')).preencherPcmMan008(bytes,dadosPcmMan008(emissao))},
  ...['PCM-MAN-017','PCM-MAN-018','PCM-MAN-019'].map(codigo=>({...MODELOS_V2.find(m=>m.codigo===codigo),
  preenche:'Identificação no cabeçalho, no rodapé e na capa: revisão, data de corte, organização, elaborado e aprovado (só se a aprovação for informada).',
  branco:'Todo o texto do manual: é orientação para a equipe escrever com as regras da fábrica. O app não inventa conteúdo técnico, aprovação ou evidência.',
  preencher:async(bytes,emissao)=>{const m=await import('../saida/biblioteca-v2-docx.js');return m.preencherManualWord(bytes,codigo,m.metadadosWord(emissao));}})),
  // Demais planilhas: saem com os cadastros da fábrica (ativos, pessoas, famílias, setores) para as listas ▼.
  ...MODELOS_V2.filter(m=>m.formato==='Excel'&&!['PCM-MAN-001','PCM-MAN-002','PCM-MAN-004','PCM-MAN-008'].includes(m.codigo)).map(m=>({...m,simples:true,
  preencher:async(bytes,emissao)=>(await import('../saida/biblioteca-v2-xlsx.js')).preencherCadastrosV2(bytes,m.codigo,dadosCadastrosV2(emissao))}))];
const COMPLETOS=PREENCHIDOS_V2.filter(m=>!m.simples),SIMPLES=PREENCHIDOS_V2.filter(m=>m.simples);

const rascunhoEmissao={dataCorte:null,elaborador:null,aprovado:false,aprovador:'',gerando:false,codigo:'',mensagem:''};
let refletirEmissao=()=>{};
export function telaDocumentos(main){
  const revisao=estado.programacao.revisoes.at(-1);const hoje=textoData(new Date());
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Documentos de gestão</p><h2>Documentos da revisão ativa</h2><p>Preencha a identificação e baixe o documento que precisa. Cada arquivo usa o plano da revisão ativa e os registros até a data de corte.</p><p class="origem">Todos os documentos são modelos da Biblioteca PCM v2 (${esc(VERSAO_BIBLIOTECA_V2)}). Para checklists, estoque e outros controles, veja os <a href="#modelos">modelos para sua rotina</a>.</p></header>
    <section class="cartao"><h3>1. Confira a identificação</h3>${revisao?`<p>Revisão ${revisao.numero} · vigência ${dataExibida(revisao.vigencia)}.</p>`:'<p><a href="#planejar">Ative uma revisão em Planejar</a> para gerar documentos preenchidos. Você pode <a href="#modelos">baixar os modelos em branco sem cadastrar dados</a>.</p>'}
    <form id="emissao-pcmd"><div class="grade duas"><div><label for="data-corte">Incluir registros até</label><input id="data-corte" name="dataCorte" type="date" value="${esc(rascunhoEmissao.dataCorte??hoje)}" max="${hoje}" required></div><div><label for="emissao-elaborador">Elaborado por</label><input id="emissao-elaborador" name="elaborador" value="${esc(rascunhoEmissao.elaborador??revisao?.elaborador??'')}" maxlength="120" required></div></div>
    <details ${rascunhoEmissao.aprovado?'open':''}><summary>Informar aprovação já realizada (opcional)</summary><label class="caixa caixa-bloco"><input name="aprovado" type="checkbox" id="emissao-aprovada" ${rascunhoEmissao.aprovado?'checked':''}> Estes documentos já foram aprovados pelo responsável</label><label for="emissao-aprovador">Aprovador</label><input id="emissao-aprovador" name="aprovador" maxlength="120" value="${esc(rascunhoEmissao.aprovador)}"><p class="origem">Sem essa confirmação, o documento fica “Em elaboração”, com aprovador “A definir”.</p></details>
    <p id="bloqueio-pcmd" class="origem">${revisao?'Escolha um documento abaixo.':'A geração será liberada após ativar uma revisão em Planejar.'}</p><p id="progresso-pcmd" role="status" aria-live="polite"></p></form></section>
    <section aria-labelledby="escolher-documento"><h3 id="escolher-documento">2. Escolha o documento</h3>
    <div class="grade duas">${COMPLETOS.map(m=>`<article class="cartao"><p class="sobretitulo">${m.codigo} · ${m.formato}</p><h4>${esc(m.titulo)}</h4><p>${esc(m.preenche)}</p><p class="origem"><strong>Fica em branco para a equipe:</strong> ${esc(m.branco)}</p><div class="acoes"><button type="submit" form="emissao-pcmd" name="documento" value="${m.codigo}" data-documento="${m.codigo}" aria-label="Gerar ${esc(m.titulo)} da revisão ativa" aria-describedby="bloqueio-pcmd" ${revisao?'':'disabled'}>Gerar ${m.formato}</button><a href="${esc(m.url)}" download aria-label="Baixar ${esc(m.titulo)} em branco">Modelo em branco</a></div></article>`).join('')}</div>
    <h4 id="outros-modelos">Outros modelos, com os cadastros da fábrica</h4><p class="origem">Saem com ativos, pessoas, famílias e setores para as listas ▼ e com elaborado/aprovado. O restante é preenchido pela equipe no próprio arquivo.</p>
    <ul class="lista-modelos-simples" aria-labelledby="outros-modelos">${SIMPLES.map(m=>`<li><span><strong>${m.codigo}</strong> · ${esc(m.titulo)}<br><span class="origem">${esc(m.quando)}</span></span><span class="acoes"><button type="submit" form="emissao-pcmd" name="documento" value="${m.codigo}" data-documento="${m.codigo}" aria-label="Gerar ${esc(m.titulo)} com os cadastros" aria-describedby="bloqueio-pcmd" ${revisao?'':'disabled'}>Gerar Excel</button><a href="${esc(m.url)}" download aria-label="Baixar ${esc(m.titulo)} em branco">Em branco</a></span></li>`).join('')}</ul>
</section>
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
    for(const b of main.querySelectorAll('[data-documento]')){b.disabled=rascunhoEmissao.gerando||!revisao;b.textContent=rascunhoEmissao.gerando&&rascunhoEmissao.codigo===b.value?'Preparando…':`Gerar ${PREENCHIDOS_V2.find(m=>m.codigo===b.value)?.formato??'Excel'}`;}
    form.querySelector('#progresso-pcmd').textContent=rascunhoEmissao.mensagem;
  };
  for(const i of form.querySelectorAll('input'))i.addEventListener('input',()=>{rascunhoEmissao[i.name]=i.type==='checkbox'?i.checked:i.value;refletirEmissao();});refletirEmissao();
  form.onsubmit=async e=>{
    e.preventDefault();const v2=PREENCHIDOS_V2.find(m=>m.codigo===e.submitter?.value);
    if(!v2||!revisao||rascunhoEmissao.gerando)return;
    const fd=new FormData(form);const codigo=v2.codigo,nome=v2.titulo,ext=v2.formato==='Word'?'docx':'xlsx';
    const arquivo=v2.url.replace(/^\.\/modelos\//,'').replace(/\.(xlsx|docx)$/,'');
    rascunhoEmissao.gerando=true;rascunhoEmissao.codigo=codigo;rascunhoEmissao.mensagem=`Preparando ${nome}…`;refletirEmissao();
    try{
      const emissao=prepararEmissao(estado,{dataCorte:fd.get('dataCorte'),elaborador:fd.get('elaborador'),aprovador:fd.get('aprovador')??'',aprovado:fd.has('aprovado')});
      const resposta=await fetch(`./modelos/${arquivo}.${ext}`);if(!resposta.ok)throw new Error(`Modelo ${codigo} indisponível. Aguarde o carregamento offline ou tente conectado.`);
      const bytes=await resposta.arrayBuffer();const saida=await v2.preencher(bytes,emissao);
      let registrado=true;
      if(estado.programacao.revisoes.some(r=>r.id===emissao.revisao.id)){
        estado.programacao.emissoes.push({id:novoId(),modelo:codigo,versaoModelo:VERSAO_BIBLIOTECA_V2,revisaoId:emissao.revisao.id,dataCorte:emissao.meta.dataCorte});
        registrado=await salvar();
      }
      baixar(saida,`${arquivo.split('/').pop()}-Preenchido.${ext}`,'application/vnd.openxmlformats-officedocument.'+(ext==='xlsx'?'spreadsheetml.sheet':'wordprocessingml.document'));
      rascunhoEmissao.mensagem=`${nome}: arquivo preparado. Confira antes de usar.${registrado?'':' O registro da emissão não pôde ser salvo; guarde um backup.'}`;avisar(rascunhoEmissao.mensagem);
    }catch(erro){rascunhoEmissao.mensagem=erro.message;avisar(erro.message);}
    finally{rascunhoEmissao.gerando=false;refletirEmissao();}
  };
}
