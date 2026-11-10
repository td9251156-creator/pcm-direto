import { estado } from '../estado.js';
import { chaveAjuste } from '../logica/plano.js';
import { esc, avisar } from '../ui.js';
import { copiaGestao, guardar } from './gestao-ui.js';

export function montarResponsavelLote(main, plano, atualizar) {
  const ativas = plano.filter(l => l.ativa);
  const secao = document.createElement('section'); secao.className = 'cartao';
  secao.innerHTML = `<h3>Atribuir responsável em lote</h3><p>Escolha um ativo ou uma especialidade. Confira a prévia antes de substituir os responsáveis das tarefas ativas desse grupo. A busca da lista não limita este lote.</p><form id="form-responsavel-lote"><div class="grade duas"><div><label for="lote-modo">Agrupar por</label><select id="lote-modo"><option value="equipamentoId">Ativo</option><option value="especialidade">Especialidade</option></select></div><div><label for="lote-grupo">Ativo ou especialidade</label><select id="lote-grupo" required></select></div><div><label for="lote-pessoa">Novo responsável</label><select id="lote-pessoa" required><option value="">Escolha uma pessoa ativa</option>${estado.gestao.pessoas.filter(p => p.ativo).map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select></div></div><p>Sem pessoas disponíveis? <a href="#cadastros">Cadastre uma pessoa ativa</a>.</p><button>Conferir alterações</button></form><div id="lote-previa" aria-live="polite"></div>`;
  main.querySelector('section').after(secao);
  const form = secao.querySelector('form'); const modo = secao.querySelector('#lote-modo');
  const grupo = secao.querySelector('#lote-grupo'); const pessoa = secao.querySelector('#lote-pessoa');
  const previa = secao.querySelector('#lote-previa'); let proposta = null; let gravando = false;
  function invalidar() { proposta = null; previa.replaceChildren(); }
  function grupos() {
    const itens = new Map(ativas.map(l => [l[modo.value], modo.value === 'especialidade' ? l.especialidade : `${l.tag} · ${l.equipamento}`]));
    grupo.innerHTML = '<option value="">Escolha o grupo</option>' + [...itens].map(([id, nome]) => `<option value="${esc(id)}">${esc(nome)}</option>`).join('');
  }
  modo.addEventListener('change', grupos); grupos();
  secao.addEventListener('change', invalidar);
  main.querySelector('#lista-plano').addEventListener('change', invalidar);
  form.addEventListener('submit', e => {
    e.preventDefault(); if (gravando) return;
    const alvo = estado.gestao.pessoas.find(p => p.id === pessoa.value && p.ativo);
    if (!alvo) { invalidar(); avisar('Escolha uma pessoa ativa.'); return; }
    const linhas = ativas.filter(l => l[modo.value] === grupo.value);
    const mudam = linhas.filter(l => estado.gestao.responsaveis[chaveAjuste(l.equipamentoId, l.tarefaId)] !== alvo.id);
    proposta = { pessoa: alvo.id, chaves: mudam.map(l => chaveAjuste(l.equipamentoId, l.tarefaId)), anteriores: JSON.stringify(estado.gestao.responsaveis) };
    previa.innerHTML = `<h4 tabindex="-1">Confira a atribuição</h4><p>${linhas.length} tarefas no grupo “${esc(grupo.selectedOptions[0].textContent)}”. <strong>${mudam.length} tarefas mudarão para ${esc(alvo.nome)}</strong>; ${linhas.length - mudam.length} já têm essa pessoa.</p><p>${mudam.filter(l => l.seguranca).length} tarefas de segurança mudarão somente de responsável. Frequências, datas e conteúdo permanecem iguais.</p>${mudam.length ? '<div class="acoes"><button type="button" id="lote-cancelar" class="secundario">Voltar sem alterar</button><button type="button" id="lote-confirmar">Confirmar atribuição</button></div>' : '<p>Nenhuma alteração necessária.</p>'}`;
    previa.querySelector('h4').focus();
    previa.querySelector('#lote-cancelar')?.addEventListener('click', () => { invalidar(); form.querySelector('button').focus(); });
    previa.querySelector('#lote-confirmar')?.addEventListener('click', confirmar);
  });
  async function confirmar() {
    if (gravando || !proposta) return;
    if (proposta.anteriores !== JSON.stringify(estado.gestao.responsaveis) || !estado.gestao.pessoas.some(p => p.id === proposta.pessoa && p.ativo)) {
      invalidar(); avisar('Os responsáveis mudaram. Confira o lote novamente.'); return;
    }
    const nova = copiaGestao();
    for (const chave of proposta.chaves) nova.responsaveis[chave] = proposta.pessoa;
    gravando = true;
    const campos = [...main.querySelectorAll('input, select, button')].map(c => [c, c.disabled]);
    campos.forEach(([c]) => { c.disabled = true; });
    try {
      const ok = await guardar(nova, atualizar);
      if (ok && secao.isConnected) { invalidar(); form.querySelector('button').focus(); }
    } catch { avisar('Não foi possível atribuir o lote. Confira os responsáveis antes de tentar novamente.'); }
    finally { gravando = false; campos.forEach(([c, desabilitado]) => { c.disabled = desabilitado; }); if (secao.isConnected && !proposta) form.querySelector('button').focus(); }
  }
}
