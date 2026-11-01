import { estado, dadosAtuais, atualizarGestao } from '../estado.js';
import { novoId } from '../logica/entrada.js';
import { identificacaoDaFalha } from '../logica/falha.js';
import { textoData } from '../logica/cronograma.js';
import { esc, avisar, baixar, num } from '../ui.js';
import { campo, selecionarPessoa, tabela, copiaGestao, valorOpcional, pessoaNome } from './gestao-ui.js';
import { dataExibida } from '../logica/consulta-execucao.js';
import { LIMITES_FOTO, prepararFoto, espacoDasFotos } from '../logica/fotos.js';

// Fotos da falha em edição: só na memória até registrar (decisão D5: até 3 por falha, reduzidas no aparelho).
let fotosEdicao = [];

export function telaFalhas(main) {
  const equipamentos = dadosAtuais().equipamentos; const hoje = textoData(new Date());
  fotosEdicao = [];
  main.innerHTML = `<div id="tela-falhas"><section class="cartao"><h2>Registro de falhas</h2><p>Registre fatos observados, sem dados pessoais nas descrições. Causa provável não é uma causa comprovada. Consulte MTBF, MTTR e disponibilidade na tela Mensal, após informar os dados necessários.</p><form id="form-falha"><input type="hidden" name="id"><div class="grade duas">
    <div><label for="falha-equipamento">Equipamento</label><select id="falha-equipamento" name="equipamentoId" required><option value="">Escolha o ativo</option>${equipamentos.map(e => `<option value="${e.id}">${esc(e.tag)} · ${esc(e.descricao)}</option>`).join('')}</select></div>
    ${campo('data-falha', 'Data da falha', hoje, 'date', `min="1900-01-01" max="${hoje}" required`)}${campo('horaInicio', 'Hora de início (opcional)', '', 'time', '')}${campo('sintoma', 'Sintoma observado', '', 'text', 'maxlength="2000" required')}${campo('causa', 'Causa provável (opcional)', '', 'text', 'maxlength="2000"')}${campo('acao', 'Ação tomada (opcional)', '', 'text', 'maxlength="2000"')}${campo('horasParada', 'Horas de parada (opcional)', '', 'number', 'min="0" step="0.01"')}${campo('peca', 'Peça trocada (opcional)', '', 'text', 'maxlength="120"')}${selecionarPessoa('responsavelId', 'Responsável')}
    ${campo('dataConclusao', 'Conclusão do reparo (opcional)', '', 'date', `min="1900-01-01" max="${hoje}"`)}${campo('horaFim', 'Hora da conclusão (opcional)', '', 'time', '')}${campo('horasReparo', 'Tempo total do reparo (h, opcional)', '', 'number', 'min="0" step="any"')}
    </div><fieldset class="fotos-falha"><legend>Fotos da falha (opcional, até ${LIMITES_FOTO.porFalha})</legend><label for="g-fotos" class="botao secundario">Tirar ou escolher foto</label><input id="g-fotos" type="file" accept="image/*" capture="environment" multiple class="visualmente-oculto"><div id="previa-fotos" class="previa-fotos" aria-live="polite"></div><p class="origem">Fotografe só o defeito. Evite rostos, crachás, placas de veículos e telas com dados pessoais. A foto é reduzida neste aparelho e perde a localização gravada pela câmera; nada é enviado para a internet.</p></fieldset><p>Deixe a conclusão vazia quando ela não foi informada. A duração total do reparo é separada da parada; vazio é desconhecido e zero é informado. <a href="#mensal">Consultar indicadores mensais</a>.</p><div class="acoes"><button id="salvar-falha" ${!equipamentos.length ? 'disabled' : ''}>Registrar falha</button><button type="reset" class="secundario">Limpar edição</button></div></form>${!equipamentos.length ? '<p><a href="#equipamentos">Cadastre um equipamento válido para registrar uma falha.</a></p>' : ''}</section>
    <section class="cartao"><h3>Histórico de falhas</h3><button type="button" class="secundario" id="baixar-falhas">Baixar registros (.json)</button>
    ${tabela(['Data / ativo', 'Sintoma / causa provável', 'Ação / peça', 'Parada / responsável', 'Ações'], estado.gestao.falhas.slice().reverse().map(f => `<tr><td>${dataExibida(f.data)}${f.horaInicio ? ` ${esc(f.horaInicio)}` : ''}<br>${esc(f.tag)}${!equipamentos.some(e => e.id === f.equipamentoId) ? '<br>Ativo fora da lista atual' : ''}</td><td>${esc(f.sintoma)}<br><span class="origem">${esc(f.causa || 'Causa não informada')}</span></td><td>${esc(f.acao || 'Não informada')}<br>${esc(f.peca)}${(f.fotos ?? []).length ? `<div class="miniaturas-falha">${f.fotos.map((foto, i) => `<img src="${foto.dados}" width="64" height="64" loading="lazy" alt="Foto ${i + 1} da falha de ${esc(f.tag)}">`).join('')}</div>` : ''}</td><td>${f.horasParada === null ? 'Parada não informada' : num(f.horasParada, 2) + ' h'}<br>${f.dataConclusao ? `Reparo concluído em ${dataExibida(f.dataConclusao)}${f.horaFim ? ` ${esc(f.horaFim)}` : ''}` : 'Conclusão não informada'}<br>${f.horasReparo === undefined || f.horasReparo === null ? 'Tempo de reparo não informado' : num(f.horasReparo, 2) + ' h de reparo'}<br>${esc(pessoaNome(f.responsavelId))}</td><td><button type="button" class="secundario" data-editar-falha="${f.id}">Corrigir registro</button></td></tr>`))}</section></div>`;
  const form = main.querySelector('#form-falha');
  const previa = main.querySelector('#previa-fotos');
  const mostrarFotos = () => { previa.innerHTML = fotosEdicao.map((foto, i) => `<figure><img src="${foto.dados}" width="96" height="96" alt="Foto ${i + 1} da falha em edição"><button type="button" class="secundario" data-remover-foto="${esc(foto.id)}">Remover foto ${i + 1}</button></figure>`).join(''); };
  main.querySelector('#g-fotos').addEventListener('change', async (e) => {
    const arquivos = [...e.target.files]; e.target.value = '';
    for (const arquivo of arquivos) {
      if (fotosEdicao.length >= LIMITES_FOTO.porFalha) { avisar(`Até ${LIMITES_FOTO.porFalha} fotos por falha.`); break; }
      try { fotosEdicao.push({ id: novoId(), ...(await prepararFoto(arquivo)) }); } catch (erro) { avisar(erro.message); }
    }
    mostrarFotos();
  });
  previa.addEventListener('click', (e) => { const b = e.target.closest('[data-remover-foto]'); if (!b) return; fotosEdicao = fotosEdicao.filter((x) => x.id !== b.dataset.removerFoto); mostrarFotos(); });
  const ativo = new URLSearchParams(location.hash.split('?')[1]||'').get('ativo');
  if(equipamentos.some(e=>e.id===ativo)){form.elements.equipamentoId.value=ativo;form.elements.sintoma.focus();}
  form.addEventListener('submit', async e => {
    e.preventDefault(); const f = form.elements; const nova = copiaGestao();
    const anterior = nova.falhas.find(r => r.id === f.id.value);
    const eq = equipamentos.find(e => e.id === f.equipamentoId.value);
    if (!eq && (!anterior || f.equipamentoId.value !== anterior.equipamentoId)) { avisar('Escolha um ativo válido da lista.'); return; }
    if (!f['data-falha'].value || f['data-falha'].value > hoje) { avisar('Informe uma data válida até hoje.'); return; }
    const conclusao = f.dataConclusao.value;
    if (conclusao && (conclusao < f['data-falha'].value || conclusao > hoje)) { avisar('A conclusão deve estar entre a data da falha e hoje.'); return; }
    const reparo = valorOpcional(f.horasReparo.value);
    const horaInicio = f.horaInicio.value; const horaFim = f.horaFim.value;
    if (horaFim && !conclusao) { avisar('Informe a data de conclusão para usar a hora da conclusão.'); return; }
    if (horaInicio && horaFim && conclusao === f['data-falha'].value && horaFim < horaInicio) { avisar('No mesmo dia, a hora da conclusão deve ser igual ou posterior à hora de início.'); return; }
    const novos = conclusao !== '' || reparo !== null || horaInicio !== '' || horaFim !== '' || fotosEdicao.length > 0 ||
      ['dataConclusao', 'horasReparo', 'horaInicio', 'horaFim', 'fotos'].some(c => anterior && Object.hasOwn(anterior, c));
    if (novos) nova.versao = Math.max(nova.versao, 2); // nunca rebaixa uma base com dados da operação (versão 3)
    const r = { ...(anterior ?? {}), ...(novos ? { dataConclusao: conclusao, horasReparo: reparo, horaInicio, horaFim, fotos: fotosEdicao.map((x) => ({ ...x })) } : {}), id: anterior?.id || novoId(), ...identificacaoDaFalha(eq, anterior),
      data: f['data-falha'].value, sintoma: f.sintoma.value.trim(), causa: f.causa.value.trim(), acao: f.acao.value.trim(),
      horasParada: valorOpcional(f.horasParada.value), peca: f.peca.value.trim(), responsavelId: f.responsavelId.value };
    nova.falhas = anterior ? nova.falhas.map(x => x.id === r.id ? r : x) : [...nova.falhas, r];
    const rota = location.hash;
    const campos = [...main.querySelectorAll('#tela-falhas input, #tela-falhas select, #tela-falhas button')]; campos.forEach(c => { c.disabled = true; });
    try {
      const resultado = await atualizarGestao(nova);
      if (!resultado.ok) { avisar(resultado.motivo); return; }
      if (resultado.guardado) {
        const uso = espacoDasFotos(estado.gestao.falhas).porAtivo.get(r.equipamentoId) ?? 0;
        if (location.hash === rota && form.isConnected) { telaFalhas(main); main.querySelector('#g-sintoma')?.focus(); }
        avisar(uso >= LIMITES_FOTO.avisoAtivoBytes ? `Dados guardados. As fotos deste ativo já ocupam ${num(uso / 1e6, 1)} MB: revise ou retire fotos antigas e baixe um backup.` : 'Dados guardados neste aparelho.');
      } else {
        // O formulário e o ID ficam disponíveis para conferir a alteração e baixar backup.
        f.id.value = r.id;
        avisar('Alteração aplicada nesta sessão. O navegador não conseguiu salvar; baixe um backup antes de sair.');
      }
    } finally { campos.forEach(c => { c.disabled = false; }); }
  });
  form.addEventListener('reset', () => { fotosEdicao = []; mostrarFotos(); form.elements.id.value = ''; main.querySelector('#salvar-falha').textContent = 'Registrar falha'; });
  main.querySelector('#baixar-falhas').addEventListener('click', () => baixar(JSON.stringify(estado.gestao.falhas, null, 2), 'pcm-direto-falhas.json', 'application/json'));
  main.querySelector('#tela-falhas').addEventListener('click', e => {
    const b = e.target.closest('[data-editar-falha]'); if (!b) return;
    const r = estado.gestao.falhas.find(f => f.id === b.dataset.editarFalha); const f = form.elements;
    if (!equipamentos.some(eq => eq.id === r.equipamentoId) && !Array.from(f.equipamentoId.options).some(o => o.value === r.equipamentoId)) {
      f.equipamentoId.add(new Option(`${r.tag} (fora da lista atual)`, r.equipamentoId));
    }
    f.id.value = r.id; f.equipamentoId.value = r.equipamentoId; f['data-falha'].value = r.data;
    for (const nome of ['sintoma', 'causa', 'acao', 'peca', 'horasParada', 'dataConclusao', 'horasReparo', 'horaInicio', 'horaFim']) f[nome].value = r[nome] ?? '';
    if (r.responsavelId && !Array.from(f.responsavelId.options).some(o => o.value === r.responsavelId)) f.responsavelId.add(new Option(pessoaNome(r.responsavelId), r.responsavelId));
    f.responsavelId.value = r.responsavelId; main.querySelector('#salvar-falha').disabled = false;
    fotosEdicao = (r.fotos ?? []).map((x) => ({ ...x })); mostrarFotos();
    main.querySelector('#salvar-falha').textContent = 'Salvar correção'; f.sintoma.focus();
  });
}
