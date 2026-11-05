import { CHAVE_RASCUNHO_CRIADOR, criacaoVazia, normalizarCriacao, validarCriacao } from './logica/criador-piloto.js';
import { gerarCriacaoXlsx, nomeArquivoCriacao } from './saida/criador-piloto-xlsx.js';

const raiz = document.querySelector('[data-criador]');
if (raiz) iniciar();

function iniciar() {
  raiz.hidden = false;
  const form = raiz.querySelector('form'), campos = raiz.querySelector('[data-campos]'), painel = raiz.querySelector('.painel-criador');
  const entrega = raiz.querySelector('[data-entrega]'), previa = raiz.querySelector('[data-previa]'), status = raiz.querySelector('[data-status]');
  const salvo = raiz.querySelector('[data-salvamento]'), erro = raiz.querySelector('[data-erro-etapa]');
  const anterior = raiz.querySelector('[data-anterior]'), proximo = raiz.querySelector('[data-proximo]');
  let estado = carregar(), etapa = 0, temporizador;
  const pedido = new URL(location.href).searchParams.get('modelo');
  if (['PCM-MAN-005', 'PCM-MAN-016'].includes(pedido)) estado.selecionado = pedido;
  let criacao = estado.rascunhos[estado.selecionado] || criacaoVazia(estado.selecionado);

  const etapas = () => criacao.modelo === 'PCM-MAN-005'
    ? [['Identificação', 'Dê um nome claro e informe onde a checklist será usada.'], ['Itens da checklist', 'Escreva uma verificação por item e coloque na ordem de execução.'], ['Conferência', 'Revise o conteúdo antes de gerar o Excel.']]
    : [['Identificação', 'Dê um nome claro e identifique a área responsável.'], ['Contexto e segurança', 'Explique o objetivo, os limites e os cuidados da tarefa.'], ['Passos do procedimento', 'Divida a execução em ações curtas e ordenadas.'], ['Conferência', 'Revise o conteúdo antes de gerar o Excel.']];

  function renderizar() {
    const lista = etapas(), revisao = etapa === lista.length - 1, [titulo, descricao] = lista[etapa];
    raiz.querySelector('[data-etapa-texto]').textContent = `Etapa ${etapa + 1} de ${lista.length}`;
    raiz.querySelector('[data-etapa-numero]').textContent = `Etapa ${etapa + 1}`;
    raiz.querySelector('[data-progresso-texto]').textContent = titulo;
    raiz.querySelector('[data-titulo-etapa]').textContent = titulo;
    raiz.querySelector('[data-descricao-etapa]').textContent = descricao;
    const barra = raiz.querySelector('.barra-progresso');
    barra.setAttribute('aria-valuemax', String(lista.length)); barra.setAttribute('aria-valuenow', String(etapa + 1));
    raiz.querySelector('[data-barra]').style.width = `${(etapa + 1) * 100 / lista.length}%`;
    anterior.hidden = etapa === 0; proximo.hidden = revisao; painel.hidden = revisao; entrega.hidden = !revisao; erro.hidden = true;
    document.querySelectorAll('[data-modelo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modelo === criacao.modelo)));
    if (revisao) { atualizarPrevia(); setTimeout(() => previa.focus(), 0); return; }
    campos.innerHTML = conteudoEtapa();
  }

  function conteudoEtapa() {
    const d = criacao.dados;
    if (etapa === 0) {
      const titulo = criacao.modelo === 'PCM-MAN-005' ? campo('titulo', 'Título da checklist *', d.titulo, 'Ex.: Preventiva mensal do compressor', true) : campo('titulo', 'Título do procedimento *', d.titulo, 'Ex.: Troca do filtro de óleo', true);
      const especificos = criacao.modelo === 'PCM-MAN-005'
        ? campo('tag', 'TAG do equipamento', d.tag, 'Ex.: CP-01') + campo('equipamento', 'Nome do equipamento', d.equipamento, 'Ex.: Compressor da linha 1') + campo('servico', 'Serviço ou intervalo', d.servico, 'Ex.: Preventiva mensal') + campo('tecnico', 'Técnico responsável', d.tecnico)
        : campo('numero', 'Número do POP', d.numero, 'Ex.: POP-MAN-001') + campo('area', 'Área ou departamento', d.area) + campo('responsavel', 'Responsável pela aplicação', d.responsavel);
      return `<div class="grade-campos">${titulo}${especificos}${campo('elaborado', 'Elaborado por', d.elaborado)}${campo('aprovado', 'Aprovado por', d.aprovado)}</div>`;
    }
    if (criacao.modelo === 'PCM-MAN-005') return editorChecklist(d.itens);
    if (etapa === 1) return `<div class="grade-campos">${area('objetivo', 'Objetivo', d.objetivo, 'O que este procedimento deve garantir?')}${area('aplica', 'Onde se aplica', d.aplica, 'Equipamentos, áreas ou situações incluídas.')}${area('naoAplica', 'Onde não se aplica', d.naoAplica, 'Deixe claros os limites do procedimento.')}${area('perigo', 'Perigos da tarefa', d.perigo, 'Riscos que a equipe precisa reconhecer.')}${area('controle', 'Controles ou EPI', d.controle, 'Medidas previstas para os perigos descritos.')}${area('materiais', 'Ferramentas e materiais', d.materiais, 'O que deve estar disponível antes de começar.')}${area('registro', 'Registro e verificação', d.registro, 'Como comprovar a execução e a conferência?')}</div>`;
    return editorPassos(d.passos);
  }

  function campo(nome, rotulo, valor = '', exemplo = '', largo = false) {
    const id = `criador-${nome}`;
    return `<label for="${id}" class="${largo ? 'largo' : ''}">${html(rotulo)}<input id="${id}" name="${nome}" value="${attr(valor)}" ${nome === 'titulo' ? 'required maxlength="120"' : 'maxlength="120"'} ${exemplo ? `placeholder="${attr(exemplo)}"` : ''}></label>`;
  }
  function area(nome, rotulo, valor = '', ajuda = '') {
    const id = `criador-${nome}`;
    return `<label for="${id}" class="largo">${html(rotulo)}<textarea id="${id}" name="${nome}" maxlength="500" placeholder="${attr(ajuda)}">${html(valor)}</textarea><span class="contador-campo" data-contador="${nome}">${String(valor || '').length}/500</span></label>`;
  }
  function editorChecklist(itens) {
    const linhas = itens.length ? itens : [''];
    return `<div class="editor-lista"><div class="editor-lista-topo"><p><strong>${itens.length} de 30 itens</strong><br><span>Use uma ação clara, como “Verificar nível do óleo”.</span></p><button type="button" data-adicionar-item ${itens.length >= 30 ? 'disabled' : ''}>+ Adicionar item</button></div><ol>${linhas.map((item, i) => linhaChecklist(item, i, linhas.length)).join('')}</ol></div>`;
  }
  function linhaChecklist(item, i, total) {
    return `<li class="linha-editor"><span class="numero-linha">${i + 1}</span><label for="item-${i}">Item ${i + 1}<input id="item-${i}" data-item value="${attr(item)}" maxlength="200" placeholder="O que deve ser verificado?"></label>${acoesLinha(i, total, 'item')}</li>`;
  }
  function editorPassos(passos) {
    const linhas = passos.length ? passos : [{ acao: '', ponto: '', tempo: null, critico: false }];
    return `<div class="editor-lista"><div class="editor-lista-topo"><p><strong>${passos.length} de 8 passos</strong><br><span>Comece cada ação com um verbo e descreva uma ação por passo.</span></p><button type="button" data-adicionar-passo ${passos.length >= 8 ? 'disabled' : ''}>+ Adicionar passo</button></div><ol>${linhas.map((p, i) => linhaPasso(p, i, linhas.length)).join('')}</ol></div>`;
  }
  function linhaPasso(p, i, total) {
    return `<li class="linha-editor passo-editor"><span class="numero-linha">${i + 1}</span><div class="campos-passo"><label for="acao-${i}">Ação do passo ${i + 1}<input id="acao-${i}" data-passo-acao value="${attr(p.acao || '')}" maxlength="250" placeholder="Ex.: Desligar o equipamento"></label><label for="ponto-${i}">Ponto-chave<input id="ponto-${i}" data-passo-ponto value="${attr(p.ponto || '')}" maxlength="250" placeholder="O que garante este passo?"></label><label for="tempo-${i}">Tempo estimado (min)<input id="tempo-${i}" data-passo-tempo value="${attr(p.tempo ?? '')}" type="number" min="0" max="999" step="1"></label><label class="marcacao"><input data-passo-critico type="checkbox" ${p.critico ? 'checked' : ''}> Este passo é crítico</label></div>${acoesLinha(i, total, 'passo')}</li>`;
  }
  function acoesLinha(i, total, tipo) {
    const sufixo = tipo === 'passo' ? '-passo' : '';
    return `<div class="acoes-linha"><button type="button" data-mover${sufixo}="cima" data-indice="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Mover ${tipo} ${i + 1} para cima">↑</button><button type="button" data-mover${sufixo}="baixo" data-indice="${i}" ${i === total - 1 ? 'disabled' : ''} aria-label="Mover ${tipo} ${i + 1} para baixo">↓</button><button type="button" data-remover-${tipo} data-indice="${i}" aria-label="Remover ${tipo} ${i + 1}">Remover</button></div>`;
  }

  function capturar() {
    const base = structuredClone(criacao), valor = nome => form.elements.namedItem(nome)?.value;
    for (const nome of ['titulo', 'elaborado', 'aprovado', 'tag', 'equipamento', 'servico', 'tecnico', 'numero', 'area', 'responsavel', 'objetivo', 'aplica', 'naoAplica', 'perigo', 'controle', 'materiais', 'registro']) {
      const v = valor(nome); if (v !== undefined) base.dados[nome] = v;
    }
    const itens = [...campos.querySelectorAll('[data-item]')];
    if (itens.length) base.dados.itens = itens.map(x => x.value.trim()).filter(Boolean);
    const passos = [...campos.querySelectorAll('.passo-editor')];
    if (passos.length) base.dados.passos = passos.map(l => ({ acao: l.querySelector('[data-passo-acao]').value.trim(), ponto: l.querySelector('[data-passo-ponto]').value.trim(), tempo: l.querySelector('[data-passo-tempo]').value, critico: l.querySelector('[data-passo-critico]').checked })).filter(p => p.acao);
    criacao = normalizarCriacao(base);
  }
  function guardar() {
    try { capturar(); estado.selecionado = criacao.modelo; estado.rascunhos[criacao.modelo] = criacao; localStorage.setItem(CHAVE_RASCUNHO_CRIADOR, JSON.stringify(estado)); salvo.textContent = 'Rascunho salvo neste navegador'; }
    catch { salvo.textContent = 'Não foi possível salvar o rascunho'; }
  }
  function agendar() { salvo.textContent = 'Salvando…'; clearTimeout(temporizador); temporizador = setTimeout(guardar, 350); }
  function podeContinuar() {
    capturar(); let mensagem = '';
    if (etapa === 0 && !criacao.dados.titulo) mensagem = 'Informe um título para continuar.';
    if (criacao.modelo === 'PCM-MAN-005' && etapa === 1 && !criacao.dados.itens.length) mensagem = 'Adicione pelo menos um item à checklist.';
    if (criacao.modelo === 'PCM-MAN-016' && etapa === 2 && !criacao.dados.passos.length) mensagem = 'Adicione pelo menos um passo ao procedimento.';
    if (!mensagem) return true; erro.textContent = mensagem; erro.hidden = false; campos.querySelector('input, textarea')?.focus(); return false;
  }
  function atualizarPrevia() {
    previa.replaceChildren(); const d = criacao.dados;
    const h = document.createElement('h3'); h.textContent = d.titulo || 'Material sem título'; previa.append(h);
    const p = document.createElement('p'); p.textContent = criacao.modelo === 'PCM-MAN-005' ? `${d.itens.length} itens na ordem de execução.` : `${d.passos.length} passos no procedimento.`; previa.append(p);
    const dl = document.createElement('dl');
    const pares = criacao.modelo === 'PCM-MAN-005' ? [['Equipamento', d.equipamento || d.tag], ['Serviço', d.servico], ['Responsável', d.tecnico]] : [['Número', d.numero], ['Área', d.area], ['Responsável', d.responsavel]];
    for (const [t, v] of pares.filter(([, v]) => v)) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = t; dd.textContent = v; dl.append(dt, dd); }
    if (dl.children.length) previa.append(dl);
    const lista = document.createElement(criacao.modelo === 'PCM-MAN-005' ? 'ul' : 'ol');
    (criacao.modelo === 'PCM-MAN-005' ? d.itens : d.passos.map(x => x.acao)).forEach(x => { const li = document.createElement('li'); li.textContent = x; lista.append(li); }); previa.append(lista);
  }

  form.addEventListener('input', e => { const c = e.target.name && raiz.querySelector(`[data-contador="${e.target.name}"]`); if (c) c.textContent = `${e.target.value.length}/500`; erro.hidden = true; agendar(); });
  campos.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; capturar();
    if (b.matches('[data-adicionar-item]')) criacao.dados.itens.push('');
    if (b.matches('[data-remover-item]')) criacao.dados.itens.splice(Number(b.dataset.indice), 1);
    if (b.matches('[data-mover]')) mover(criacao.dados.itens, Number(b.dataset.indice), b.dataset.mover);
    if (b.matches('[data-adicionar-passo]')) criacao.dados.passos.push({ acao: '', ponto: '', tempo: null, critico: false });
    if (b.matches('[data-remover-passo]')) criacao.dados.passos.splice(Number(b.dataset.indice), 1);
    if (b.matches('[data-mover-passo]')) mover(criacao.dados.passos, Number(b.dataset.indice), b.dataset.moverPasso);
    renderizar(); guardar(); campos.querySelector('li:last-child input')?.focus();
  });
  proximo.addEventListener('click', () => { if (!podeContinuar()) return; guardar(); etapa++; renderizar(); painel.querySelector('input, textarea')?.focus(); scrollTo({ top: raiz.offsetTop, behavior: 'smooth' }); });
  anterior.addEventListener('click', () => { guardar(); etapa = Math.max(0, etapa - 1); renderizar(); painel.querySelector('input, textarea')?.focus(); });
  document.querySelectorAll('[data-modelo]').forEach(b => b.addEventListener('click', () => { guardar(); criacao = estado.rascunhos[b.dataset.modelo] || criacaoVazia(b.dataset.modelo); estado.selecionado = b.dataset.modelo; etapa = 0; const u = new URL(location.href); u.searchParams.set('modelo', b.dataset.modelo); history.replaceState(null, '', u); renderizar(); guardar(); campos.querySelector('input')?.focus(); }));
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (etapa !== etapas().length - 1) { proximo.click(); return; } guardar(); const v = validarCriacao(criacao); if (!v.ok) { status.textContent = v.erros.join(' '); return; }
    const b = form.querySelector('[type="submit"]'); b.disabled = true; status.textContent = 'Preparando uma cópia completa do Excel…';
    try { const bytes = await gerarCriacaoXlsx(v.criacao); baixar(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArquivoCriacao(v.criacao)); status.textContent = 'Excel gerado. Seu rascunho continua salvo neste navegador.'; }
    catch (falha) { status.textContent = falha?.message || 'Não foi possível gerar o Excel.'; } finally { b.disabled = false; }
  });
  raiz.querySelector('[data-exportar]').addEventListener('click', () => { guardar(); baixar(new Blob([JSON.stringify(criacao, null, 2)], { type: 'application/json' }), `${criacao.modelo}_rascunho.json`); status.textContent = 'Cópia de segurança baixada.'; });
  raiz.querySelector('[data-importar]').addEventListener('change', async e => { const a = e.target.files?.[0]; if (!a) return; try { const c = normalizarCriacao(JSON.parse(await a.text())); estado.rascunhos[c.modelo] = c; estado.selecionado = c.modelo; criacao = c; etapa = 0; renderizar(); guardar(); salvo.textContent = 'Cópia de segurança aberta'; } catch (falha) { status.textContent = falha?.message || 'Não foi possível abrir a cópia de segurança.'; } finally { e.target.value = ''; } });
  raiz.querySelector('[data-limpar]').addEventListener('click', () => { if (!confirm('Apagar o rascunho deste modelo e começar de novo?')) return; criacao = criacaoVazia(criacao.modelo); estado.rascunhos[criacao.modelo] = criacao; etapa = 0; renderizar(); guardar(); campos.querySelector('input')?.focus(); });
  renderizar();
}

function mover(lista, i, direcao) { const destino = direcao === 'cima' ? i - 1 : i + 1; if (destino >= 0 && destino < lista.length) [lista[i], lista[destino]] = [lista[destino], lista[i]]; }
function carregar() { try { const s = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO_CRIADOR) || 'null'); if (s?.versao === 1 && s.rascunhos) { const r = {}; for (const [k, v] of Object.entries(s.rascunhos)) try { r[k] = normalizarCriacao(v); } catch { /* ignora apenas o incompatível */ } return { versao: 1, selecionado: r[s.selecionado] ? s.selecionado : 'PCM-MAN-005', rascunhos: r }; } } catch { /* inicia vazio */ } return { versao: 1, selecionado: 'PCM-MAN-005', rascunhos: {} }; }
function baixar(blob, nome) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
function attr(v) { return html(v).replace(/`/g, '&#96;'); }
function html(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
