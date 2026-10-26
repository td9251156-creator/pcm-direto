import { telaPlanejar } from './planejar.js';
export { telaPlanejar };
import { estado,salvar,demonstrar,sairDaDemonstracao,emDemonstracao,registrarOcorrencia,restaurarBackup,BIBLIOTECA_PADRAO,alterarPassoAssistente,assistenteGravando } from '../estado.js';
import { criarBackup,verificarBackup } from '../logica/backup.js';
import { painelDaSemana,idsConcluidos } from '../logica/programacao.js';
import { textoData } from '../logica/cronograma.js';
import { esc,num,avisar,baixar } from '../ui.js';
import { telaEquipamentos } from './equipamentos.js';
import { telaCriticidade } from './criticidade.js';
import { abrirExecucao } from './campo-ui.js';
import { dataExibida } from '../logica/consulta-execucao.js';

const titulo=(rotulo,texto,descricao)=>`<header class="cabecalho-tela"><p class="sobretitulo">${rotulo}</p><h2>${texto}</h2><p class="origem">${descricao}</p></header>`;
function demo(main,ir){if(emDemonstracao()){const faixa=document.createElement('section');faixa.className='cartao aviso-demo';faixa.innerHTML='<strong>Demonstração · dados fictícios</strong><p>As alterações do exemplo não substituem sua base de trabalho.</p><button id="sair-demo" class="secundario">Voltar aos meus dados</button>';main.prepend(faixa);faixa.querySelector('button').onclick=()=>{sairDaDemonstracao();ir('inicio');};}}

export function telaBoasVindas(main,ir){
  main.innerHTML=titulo('PCM Direto','Manutenção planejada, do começo ao acompanhamento.','Organize sua fábrica, prepare o plano e acompanhe cada execução. Seus dados ficam neste aparelho.')+`<section class="cartao boas-vindas"><h3>${estado.equipamentos.length?'Seu trabalho está aqui':'Comece pela sua fábrica'}</h3><p>Cadastro, plano, execução, falhas e documentos em um só lugar.</p><div class="acoes"><button id="comecar">${estado.programacao.revisoes.length?'Abrir visão geral':estado.equipamentos.length?'Continuar meu PCM':'Começar meu PCM'}</button><button id="demonstrar" class="secundario">Explorar o exemplo</button><a href="#dados">Meus dados e backup</a></div></section><section class="grade tres"><article class="cartao"><h3>1. Organizar</h3><p>Setores, ativos, criticidade e responsáveis.</p></article><article class="cartao"><h3>2. Planejar</h3><p>Tarefas e capacidade, com revisões preservadas.</p></article><article class="cartao"><h3>3. Acompanhar</h3><p>Execuções, falhas e documentos PCMD.</p></article></section>`;
  main.querySelector('#comecar').onclick=()=>ir(estado.programacao.revisoes.length?'semana':'assistente');
  main.querySelector('#demonstrar').onclick=async()=>{await demonstrar();ir('semana');};demo(main,ir);
}

const rascunhosAssistente=new WeakMap();
let refletirAssistente=()=>{};
let resultadoAssistente={meta:null,mensagem:''};

export function telaAssistente(main,ir){
  const meta=estado.metadados;const passo=meta.passo;
  main.innerHTML=titulo('Primeiros passos',`Prepare seu PCM · passo ${passo} de 4`,'Você pode sair e continuar depois; as pendências ficam visíveis.')+`<ol class="passos"><li ${passo===1?'aria-current="step"':''}>Organização</li><li ${passo===2?'aria-current="step"':''}>Equipamentos</li><li ${passo===3?'aria-current="step"':''}>Criticidade</li><li ${passo===4?'aria-current="step"':''}>Ativação</li></ol><div id="passo-assistente"></div><div class="acoes"><button id="anterior" class="secundario" ${passo===1?'disabled':''}>Anterior</button>${passo<4?'<button id="proximo">Guardar e continuar</button>':''}<a href="#inicio">Continuar depois</a></div>`;
  const area=main.querySelector('#passo-assistente');
  if(passo===1){
    const o=estado.gestao.organizacao;const base=JSON.stringify(o);let rascunho=rascunhosAssistente.get(meta);
    if(!rascunho||rascunho.base!==base){rascunho={base,nome:o.nome,setores:o.setores.join(', ')};rascunhosAssistente.set(meta,rascunho);}
    area.innerHTML=`<section class="cartao"><h3>Organização e setores</h3><form id="organizacao-assistente"><label for="org-nome">Nome da organização</label><input id="org-nome" name="nome" maxlength="120" value="${esc(rascunho.nome)}" placeholder="Ex.: Indústria Exemplo" autocomplete="organization" required><label for="org-setores">Setores, separados por vírgula</label><input id="org-setores" name="setores" value="${esc(rascunho.setores)}" placeholder="UTL, PRD"><p class="origem">Pessoas e funções podem ser preenchidas depois em Cadastros.</p></form></section>`;
    for(const nome of ['nome','setores'])area.querySelector('#org-'+nome).addEventListener('input',event=>{rascunho[nome]=event.target.value;});
    main.querySelector('#proximo').setAttribute('form','organizacao-assistente');main.querySelector('#proximo').type='submit';
  }
  if(passo===2)telaEquipamentos(area,ir);
  if(passo===3){telaCriticidade(area);area.insertAdjacentHTML('afterbegin','<p>Notas e responsáveis podem ficar pendentes. <a href="#cadastros">Cadastrar pessoas</a> · <a href="#plano">Atribuir responsáveis às tarefas</a></p>');}
  if(passo===4)telaPlanejar(area,ir);
  main.querySelector('#anterior').closest('.acoes').insertAdjacentHTML('afterend','<p id="status-assistente" role="status" aria-live="polite"></p>');
  const visita=main.querySelector('.cabecalho-tela');const ativa=()=>visita.isConnected&&location.hash.split('?')[0]==='#assistente'&&estado.metadados===meta;
  let controlesTravados=null;
  refletirAssistente=()=>{
    if(!ativa())return;
    if(meta.passo!==passo){telaAssistente(main,ir);main.focus();return;}
    const ocupado=assistenteGravando();area.setAttribute('aria-busy',String(ocupado));
    for(const b of main.querySelectorAll('#anterior,#proximo'))b.disabled=ocupado||(b.id==='anterior'&&passo===1);
    if(ocupado&&!controlesTravados)controlesTravados=new Map([...area.querySelectorAll('input,select,textarea,button')].map(el=>[el,el.disabled]));
    if(controlesTravados){for(const [el,anterior] of controlesTravados)el.disabled=ocupado||anterior;if(!ocupado)controlesTravados=null;}
    const status=main.querySelector('#status-assistente');status.replaceChildren();
    status.textContent=ocupado?'Guardando esta etapa…':resultadoAssistente.meta===meta?resultadoAssistente.mensagem:'';
    if(!ocupado&&resultadoAssistente.meta===meta&&resultadoAssistente.precisaBackup){const link=document.createElement('a');link.href='#dados';link.textContent='Guardar um backup';status.append(' ',link);}
  };
  async function mover(destino){
    if(assistenteGravando()||!ativa())return;
    if(destino>passo&&passo===1){
      const nome=area.querySelector('#org-nome').value.trim();if(!nome){area.querySelector('#org-nome').focus();avisar('Informe o nome da organização.');return;}
      estado.gestao.organizacao.nome=nome;estado.gestao.organizacao.setores=[...new Set(area.querySelector('#org-setores').value.split(',').map(s=>s.trim()).filter(Boolean))];
      const rascunho=rascunhosAssistente.get(meta);rascunho.base=JSON.stringify(estado.gestao.organizacao);
    }
    resultadoAssistente={meta,mensagem:''};const operacao=alterarPassoAssistente(destino);refletirAssistente();const r=await operacao;
    if(estado.metadados===meta){resultadoAssistente={meta,mensagem:r.ok?'':r.motivo,precisaBackup:r.precisaBackup};if(r.ok)rascunhosAssistente.delete(meta);}
    refletirAssistente();if(!r.ok&&ativa())avisar(r.motivo);
  }
  main.querySelector('#anterior').onclick=()=>mover(passo-1);
  if(passo===1)area.querySelector('form').onsubmit=event=>{event.preventDefault();mover(passo+1);};
  else main.querySelector('#proximo')?.addEventListener('click',()=>mover(passo+1));
  refletirAssistente();demo(main,ir);
}

export function telaSemana(main,ir){
  const p=painelDaSemana(estado.programacao,estado.gestao.historico);const concluidas=idsConcluidos(estado.programacao,estado.gestao.historico);
  const vigentes=estado.programacao.revisoes.filter(r=>r.vigencia<=textoData(new Date()));const revisao=vigentes.at(-1);
  const percentual=p.previstas?Math.round(p.concluidas*100/p.previstas):0;
  main.innerHTML=titulo(esc(estado.gestao.organizacao.nome||'Minha fábrica'),'Visão geral da manutenção',`Semana de ${dataExibida(p.inicio)} a ${dataExibida(p.fim)}. ${revisao?`Revisão vigente ${revisao.numero}.`:'Ative uma revisão para programar as tarefas.'}`)+`<div class="indicadores"><article class="cartao indicador destaque"><div class="anel-progresso" aria-hidden="true" style="--progresso:${percentual*3.6}deg"></div><span>Realizado na semana</span><strong${p.previstas?'':' class="indicador-texto"'}>${p.previstas?num(p.concluidas*100/p.previstas)+'%':'Sem previsão'}</strong><small>${p.concluidas} de ${p.previstas} ocorrências</small></article><a class="cartao indicador indicador-link" href="#executar"><span>Vencidas ›</span><strong>${p.vencidas.length}</strong><small>Pendências anteriores a hoje</small></a><article class="cartao indicador"><span>Carga da semana</span><strong>${num(Object.values(p.carga).reduce((s,h)=>s+h,0))} h</strong><small>Horas previstas, não trabalhadas</small></article><article class="cartao indicador"><span>Ativos</span><strong>${estado.equipamentos.length}</strong><small>${estado.gestao.falhas.length} falhas registradas</small></article></div><div class="grade duas semana-paineis"><section class="cartao carga-semana"><h3>Carga × capacidade</h3>${Object.entries(p.carga).map(([esp,h])=>{const cap=revisao?.capacidade[esp]??estado.capacidade[esp];return `<p>${esc(esp)} · <strong>${num(h)} h</strong> / ${cap?num(cap)+' h':'capacidade não informada'}</p>${cap?`<meter min="0" max="${Math.max(cap,h)}" value="${h}" aria-label="${esc(esp)}: ${num(h)} horas, capacidade ${num(cap)}">${num(h)}</meter><p class="origem">Escala: 0–${num(Math.max(cap,h))} h · ${h>cap?'Acima da capacidade':'Dentro da capacidade'}</p>`:''}`;}).join('')||'<p>Nenhuma ocorrência nesta semana.</p>'}<a href="#planejar">Revisar o planejamento</a></section><section class="cartao prioridades-semana"><h3>Prioridades da semana</h3>${[...p.vencidas,...p.nestaSemana].sort((a,b)=>a.dataPrevista.localeCompare(b.dataPrevista)).slice(0,6).map(o=>`<article class="ocorrencia"><div><button class="abrir-ocorrencia" data-detalhes="${esc(o.id)}"><strong>${esc(o.tag)}</strong> · ${dataExibida(o.dataPrevista)}</button>${o.seguranca?' <span class="selo-seguranca">SEGURANÇA</span>':''}<p>${esc(o.descricao)}</p><span class="origem">${esc(o.especialidade)} · ${num(o.horas,3)} h</span></div><button data-feito="${esc(o.id)}" ${concluidas.has(o.id)?'disabled':''}>Feito hoje</button></article>`).join('')||'<p>Sem pendências para esta semana.</p>'}<a href="#executar">Ver todas as ocorrências</a></section></div><div class="acoes"><a href="#falhas">Registrar falha</a><a href="#entrega">Gerar documentos</a><a href="#mensal">Ver acompanhamento mensal</a></div>`;
  if(!estado.programacao.revisoes.length)main.insertAdjacentHTML('afterbegin','<section class="cartao"><h3>Complete seu primeiro plano</h3><p>Cadastre os equipamentos, confira as tarefas e ative a primeira revisão.</p><a href="#assistente">Continuar configuração</a></section>');
  ligarFeito(main,()=>telaSemana(main,ir));main.querySelectorAll('[data-detalhes]').forEach(b=>b.onclick=()=>abrirExecucao(b.dataset.detalhes,()=>telaSemana(main,ir)));demo(main,ir);
}
function ligarFeito(main,redesenhar){const visita=main.querySelector('.cabecalho-tela');main.querySelectorAll('[data-feito]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await registrarOcorrencia(b.dataset.feito);if(!visita?.isConnected)return;if(!r.ok){b.disabled=false;avisar(r.motivo);return;}redesenhar();avisar(r.guardado?'Execução registrada neste aparelho.':'Não foi possível guardar; baixe um backup antes de sair.');});}

export { telaOcorrenciasCampo as telaOcorrencias } from './ocorrencias-campo.js';

export {telaMais} from './mais.js';

export function telaMeusDados(main,ir){
  let pendente=null;
  main.innerHTML=titulo('Meus dados','Guarde uma cópia do seu PCM','Os dados ficam neste navegador. Limpar os dados do site ou trocar de aparelho exige um backup externo.')+`<section class="cartao"><h3>Backup completo</h3><p>Último backup baixado: <strong>${estado.metadados.ultimoBackup?esc(new Date(estado.metadados.ultimoBackup).toLocaleString('pt-BR')):'nenhum neste aparelho'}</strong>.</p><p>Inclui cadastros, biblioteca, rascunho, revisões, ocorrências, execuções, falhas e emissões documentais.</p><button id="baixar-backup">Baixar backup completo (.json)</button></section><section class="cartao"><h3>Restaurar neste aparelho</h3><label class="botao secundario" for="restaurar-backup">Escolher arquivo de backup</label><input class="oculto" type="file" id="restaurar-backup" accept=".json,application/json"><div id="previa-backup"></div></section>`;
  main.querySelector('#baixar-backup').onclick=async()=>{estado.metadados.ultimoBackup=new Date().toISOString();const b=criarBackup(estado);baixar(JSON.stringify(b,null,2),'pcm-direto-backup.json','application/json');await salvar({semAlteracao:true});avisar('Backup preparado para download. Confira o arquivo na pasta escolhida.');};
  main.querySelector('#restaurar-backup').onchange=async e=>{const arquivo=e.target.files[0];e.target.value='';if(!arquivo)return;let b;try{b=JSON.parse(await arquivo.text());}catch{avisar('Arquivo JSON inválido. Os dados atuais foram mantidos.');return;}const r=verificarBackup(b,BIBLIOTECA_PADRAO);if(!r.ok){avisar(r.motivo);return;}pendente=b;const g=r.rascunho.gestao;main.querySelector('#previa-backup').innerHTML=`<p>Backup versão ${b.versao} · ${esc(b.geradoEm||'data não informada')}</p><p>${r.rascunho.equipamentos.length} equipamentos · ${g?.historico.length??0} execuções · ${g?.falhas.length??0} falhas · ${r.rascunho.programacao?.revisoes.length??0} revisões.</p><p>Substituirá os dados atuais deste aparelho. A base anterior será preservada para recuperação local.</p><button id="confirmar-backup">Confirmar substituição</button><button id="cancelar-backup" class="secundario">Cancelar</button>`;main.querySelector('#cancelar-backup').onclick=()=>{pendente=null;main.querySelector('#previa-backup').textContent='Restauração cancelada.';};main.querySelector('#confirmar-backup').onclick=async e=>{e.target.disabled=true;const resultado=await restaurarBackup(pendente);if(!resultado.ok){avisar(resultado.motivo);e.target.disabled=false;return;}pendente=null;ir('semana');avisar('Backup restaurado neste aparelho.');};};
}
