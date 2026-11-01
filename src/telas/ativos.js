import { estado, dadosAtuais } from '../estado.js';
import { criticidadeAtivo } from '../logica/gestao.js';
import { ocorrenciasVigentes, idsConcluidos } from '../logica/programacao.js';
import { correspondeBusca } from '../logica/texto.js';
import { textoData } from '../logica/cronograma.js';
import { esc, num, baixar } from '../ui.js';
import { qrSvg } from '../logica/qr.js';
import { abrirExecucao } from './campo-ui.js';
import { dataExibida } from '../logica/consulta-execucao.js';

export function telaAtivos(main, ir) {
  const dados=dadosAtuais(); const equipamentos=dados.equipamentos;
  // Etiqueta QR (D5): #ativos?ativo=<id> abre direto o ativo lido pela câmera do celular.
  const pedido=new URLSearchParams(location.hash.split('?')[1]||'').get('ativo');
  let selecionado=equipamentos.some(e=>e.id===pedido)?pedido:equipamentos[0]?.id; let setor=''; let busca='';
  main.innerHTML=`<header class="cabecalho-tela"><p class="sobretitulo">Neste aparelho</p><h2>Ativos da fábrica</h2><p class="origem">Consulte equipamentos, ocorrências e falhas. <a href="#equipamentos">Cadastrar ou editar ativos</a></p></header><div class="ativos-paineis"><section class="cartao ativos-lista"><label for="buscar-ativos">Buscar por TAG ou descrição</label><input id="buscar-ativos" type="search" placeholder="Ex.: motor, UTL…"><div class="chips" id="setores-ativos" role="group" aria-label="Filtrar por setor"></div><p id="contagem-ativos" role="status"></p><div id="lista-ativos"></div></section><section class="cartao" id="detalhe-ativo" aria-label="Detalhes do ativo"></section></div>`;
  const detalhe=main.querySelector('#detalhe-ativo');
  function ficha(){
    const eq=equipamentos.find(e=>e.id===selecionado);
    if(!eq){detalhe.innerHTML='<p>Selecione um ativo para consultar.</p>';return;}
    const hoje=textoData(new Date());const revisao=estado.programacao.revisoes.filter(r=>r.vigencia<=hoje).at(-1);
    const tarefas=(revisao?.plano??dados.plano).filter(t=>t.equipamentoId===eq.id&&t.ativa);
    const feitas=idsConcluidos(estado.programacao,estado.gestao.historico);
    const pendentes=ocorrenciasVigentes(estado.programacao).filter(o=>o.equipamentoId===eq.id&&!feitas.has(o.id)).sort((a,b)=>a.dataPrevista.localeCompare(b.dataPrevista));
    const falhas=estado.gestao.falhas.filter(f=>f.equipamentoId===eq.id).slice().sort((a,b)=>b.data.localeCompare(a.data));
    const classe=criticidadeAtivo(estado.gestao.criticidade.notas[eq.id]).classe;
    detalhe.innerHTML=`<button class="secundario voltar-ativos" type="button">‹ Voltar aos ativos</button><h3 tabindex="-1" id="titulo-ativo">${esc(eq.tag)} · ${esc(eq.descricao)}</h3><dl class="ficha-ativo">${[['Setor',eq.setor],['Criticidade',classe],['Fabricante',eq.fabricante],['Modelo',eq.modelo],['Tipo',estado.biblioteca.tipos.find(t=>t.id===eq.tipo)?.nome]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'Não informado')}</dd></div>`).join('')}</dl><button type="button" id="falha-no-ativo">Registrar falha neste ativo</button><details class="etiqueta-qr"><summary>Etiqueta QR do ativo</summary><div class="etiqueta-qr-corpo">${qrSvg(enderecoAtivo(eq.id),4)}<p><strong>${esc(eq.tag)}</strong><br>${esc(eq.descricao)}</p></div><p class="origem">Aponte a câmera do celular para abrir este ativo no app. O código guarda só o endereço do ativo, sem dados pessoais; não serve como controle de acesso.</p><button type="button" class="secundario" id="baixar-etiqueta">Baixar etiqueta para imprimir (.svg)</button></details><h4>Próximas ocorrências · ${pendentes.length}</h4>${pendentes.slice(0,6).map(o=>`<button type="button" class="linha-ativo secundario" data-detalhes="${esc(o.id)}">${dataExibida(o.dataPrevista)} · ${esc(o.descricao)}${o.seguranca?' · SEGURANÇA':''}</button>`).join('')||'<p>Nenhuma ocorrência pendente.</p>'}<a href="#executar">Ver todas as ocorrências</a><h4>Falhas registradas · ${falhas.length}</h4>${falhas.map(f=>`<article class="registro-falha"><strong>${dataExibida(f.data)} · ${esc(f.sintoma)}</strong><p>${esc(f.acao||'Ação não informada')} · ${f.horasParada===null?'Parada não informada':num(f.horasParada,3)+' h'}</p></article>`).join('')||'<p>Nenhuma falha registrada.</p>'}<h4>Tarefas ${revisao?'da revisão vigente':'do rascunho'} · ${tarefas.length}</h4>${tarefas.map(t=>`<article class="registro-tarefa"><strong>${esc(t.tarefaId)} · ${esc(t.descricao)}</strong>${t.seguranca?' <span class="selo-seguranca">SEGURANÇA</span>':''}<p>${esc(t.periodicidade)} · ${esc(t.especialidade)} · ${num(t.duracaoHoras,3)} h</p><p class="origem">${esc(t.origem)} · versão ${esc(t.versao)}</p>${t.observacao?`<p><em>${esc(t.observacao)}</em></p>`:''}</article>`).join('')}`;
    detalhe.querySelectorAll('[data-detalhes]').forEach(b=>b.onclick=()=>abrirExecucao(b.dataset.detalhes,ficha));
    detalhe.querySelector('#falha-no-ativo').onclick=()=>ir('falhas?ativo='+encodeURIComponent(eq.id));
    detalhe.querySelector('#baixar-etiqueta').onclick=()=>baixar(etiquetaSvg(eq),`etiqueta-${eq.tag}.svg`,'image/svg+xml');
    detalhe.querySelector('.voltar-ativos').onclick=()=>{main.classList.remove('ativo-aberto');main.querySelector(`[data-ativo="${CSS.escape(eq.id)}"]`)?.focus();};
  }
  function listar(){
    const filtrados=equipamentos.filter(e=>(!setor||e.setor===setor)&&correspondeBusca(e.tag+' '+e.descricao,busca));
    main.querySelector('#contagem-ativos').textContent=`${filtrados.length} equipamentos encontrados`;
    if(!filtrados.some(e=>e.id===selecionado))selecionado=filtrados[0]?.id;
    main.querySelector('#lista-ativos').innerHTML=filtrados.map(e=>{
      const c=criticidadeAtivo(estado.gestao.criticidade.notas[e.id]).classe;
      return `<button type="button" class="linha-ativo ${e.id===selecionado?'selecionado':''}" data-ativo="${esc(e.id)}" aria-pressed="${e.id===selecionado}"><span class="classe-ativo classe-${c==='Pendente'?'pendente':c}">${c==='Pendente'?'?':c}</span><span><strong>${esc(e.tag)}</strong><br>${esc(e.descricao)}</span><span aria-hidden="true">›</span></button>`;
    }).join('')||'<p>Nenhum equipamento encontrado. Confira a TAG ou troque o setor.</p>';
    main.querySelectorAll('[data-ativo]').forEach(b=>b.onclick=()=>{selecionado=b.dataset.ativo;listar();main.classList.add('ativo-aberto');detalhe.querySelector('h3')?.focus();});ficha();
  }
  const setores=['',...new Set(equipamentos.map(e=>e.setor).filter(Boolean))];
  const chips=main.querySelector('#setores-ativos');chips.innerHTML=setores.map(s=>`<button type="button" class="secundario" data-setor="${esc(s)}" aria-pressed="${s===setor}">${esc(s||'Todos')}</button>`).join('');
  chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{setor=b.dataset.setor;chips.querySelectorAll('button').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));listar();});
  main.querySelector('#buscar-ativos').oninput=e=>{busca=e.target.value;listar();};listar();
  // Aberto pela etiqueta QR: no celular, mostra direto a ficha do ativo.
  if(pedido&&pedido===selecionado){main.classList.add('ativo-aberto');detalhe.querySelector('h3')?.focus();}
}

/** Endereço que o QR guarda: abre o app neste ativo (mesmo endereço do site, dados do próprio aparelho). */
export function enderecoAtivo(id){return `${location.origin}${location.pathname}#ativos?ativo=${encodeURIComponent(id)}`;}

/** Etiqueta de 60 × 40 mm: QR, TAG e descrição (texto escapado). */
export function etiquetaSvg(eq){
  const qr=qrSvg(enderecoAtivo(eq.id),1).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');const lado=Number(/viewBox="0 0 (\d+)/.exec(qrSvg(enderecoAtivo(eq.id),1))[1]);
  const x=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect width="60" height="40" fill="#fff"/><g transform="translate(1 4) scale(${32/lado})">${qr}</g><text x="35" y="15" font-family="Arial,sans-serif" font-size="3.2" font-weight="700"${eq.tag.length>12?' textLength="23.5" lengthAdjust="spacingAndGlyphs"':''}>${x(eq.tag)}</text><foreignObject x="35" y="18" width="24" height="20"><div xmlns="http://www.w3.org/1999/xhtml" style="font:3px Arial,sans-serif">${x(eq.descricao)}</div></foreignObject></svg>`;
}
