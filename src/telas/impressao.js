// Tela extra: cronograma pronto para imprimir em A4 deitado (ou salvar em PDF pelo navegador).
// Para caber na folha, o ano é dividido em duas tabelas: semanas 1 a 26 e 27 a 52.
import { dadosAtuais, estado } from '../estado.js';
import { validarLista } from '../logica/validacao.js';
import { AVISO } from '../logica/pacote.js';
import { dataDaSemana, diaMes, horasPorSemana } from '../logica/cronograma.js';
import { esc, num } from '../ui.js';
import { filtrarCronograma } from '../logica/filtros.js';

function tabela(dados, itens, de, ate) {
  const semanas = Array.from({ length: ate - de + 1 }, (_, i) => de + i);
  const cab = semanas.map((s) => `<th class="sem">S${s}<br><span>${diaMes(dataDaSemana(dados.inicio, s))}</span></th>`).join('');
  const linhas = itens.map((it) => `
    <tr class="${it.seguranca ? 'seg' : ''}">
      <td class="tag">${esc(it.tag)}</td>
      <td>${esc(it.descricao)}${it.seguranca ? ' <strong>(S)</strong>' : ''}</td>
      <td>${esc(it.especialidade)}</td>
      <td class="num">${num(horasPorSemana(it), 2)}</td>
      ${semanas.map((s) => `<td class="x">${it.semanas.includes(s) ? '■' : ''}</td>`).join('')}
    </tr>`).join('');
  const total = semanas.map((s) => `<td class="num">${num(dados.carga[s - 1])}</td>`).join('');
  return `
    <table class="cronograma-impresso">
      <colgroup><col class="c-tag"><col class="c-tarefa"><col class="c-esp"><col class="c-h">${semanas.map(() => '<col class="c-sem">').join('')}</colgroup>
      <thead><tr><th>TAG</th><th>Tarefa</th><th>Especialidade</th><th>h/sem.</th>${cab}</tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr><th colspan="4">Horas na semana</th>${total}</tr></tfoot>
    </table>`;
}

export function telaImpressao(main) {
  const problemas = Object.keys(validarLista(estado.equipamentos, estado.biblioteca.tipos)).length;
  const dados = dadosAtuais();
  const itens = dados.cronograma.slice().sort((a, b) => a.tag.localeCompare(b.tag) || a.tarefaId.localeCompare(b.tarefaId));
  const opcoes = (valores) => [...new Set(valores)].sort().map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  const alertas = Object.entries(dados.resumo.cargaPorEspecialidade).filter(([, c]) => c.semanasAcima)
    .map(([esp, c]) => `${esp}: ${c.semanasAcima} semana(s) acima da capacidade`).join('; ');

  main.innerHTML = `
    <div class="nao-imprimir cartao">
      <h2>Cronograma para imprimir</h2>
      <p>Use o botão abaixo e escolha a impressora ou "Salvar como PDF". A folha já sai em A4 deitado.</p>
      ${problemas ? `<p class="erro">${problemas} equipamento(s) com pendência ficaram fora. <a href="#equipamentos">Corrigir</a>.</p>` : ''}
      <div class="grade duas" id="filtros-cronograma">
        <div><label for="filtro-setor">Setor</label><select id="filtro-setor"><option value="">Todos os setores</option>${opcoes(dados.equipamentos.map((e) => e.setor))}</select></div>
        <div><label for="filtro-especialidade">Especialidade</label><select id="filtro-especialidade"><option value="">Todas as especialidades</option>${opcoes(itens.map((t) => t.especialidade))}</select></div>
      </div>
      <p>Os filtros mudam apenas esta impressão. As semanas e os arquivos da Entrega continuam com o plano completo.</p>
      <div class="acoes">
        <button type="button" id="imprimir">Imprimir</button>
        <a class="botao secundario" href="#entrega">Voltar para a entrega</a>
      </div>
    </div>
    <section class="folha" id="folha-cronograma"></section>`;

  function atualizarFolha() {
    const setor = main.querySelector('#filtro-setor').value;
    const especialidade = main.querySelector('#filtro-especialidade').value;
    const visao = filtrarCronograma(itens, dados.equipamentos, { setor, especialidade });
    const parcial = { ...dados, carga: visao.carga };
    main.querySelector('#folha-cronograma').innerHTML = `
      <header class="cab-impressao">
        <img src="./icones/logo.svg" alt="" width="40" height="40">
        <div>
          <strong>Cronograma anual de manutenção preventiva</strong><br>
          Semana 1 começa em ${dados.inicio.toLocaleDateString('pt-BR')} · ${visao.equipamentos} equipamentos ·
          ${visao.itens.length} tarefas · ${num(visao.horasAno)} h no ano nesta visão · (S) = tarefa de segurança<br>
          Filtros: ${esc(setor || 'todos os setores')} · ${esc(especialidade || 'todas as especialidades')}.
        </div>
      </header>
      ${problemas ? `<p class="erro">${problemas} equipamento(s) com pendência não entram neste cronograma.</p>` : ''}
      ${alertas ? `<p class="erro">Atenção ao plano completo: ${esc(alertas)}. Os filtros não eliminam essa sobrecarga.</p>` : ''}
      ${visao.itens.length ? '' : '<p>Nenhuma tarefa nos filtros escolhidos.</p>'}
      ${tabela(parcial, visao.itens, 1, 26)}
      <div class="quebra"></div>
      ${tabela(parcial, visao.itens, 27, 52)}
      <p class="aviso-impresso">${esc(AVISO)} Gerado pelo PCM Direto em ${dados.geradoEm.toLocaleDateString('pt-BR')}.</p>
    `;
  }
  atualizarFolha();
  main.querySelector('#filtros-cronograma').addEventListener('change', atualizarFolha);
  main.querySelector('#imprimir').addEventListener('click', () => window.print());
}
