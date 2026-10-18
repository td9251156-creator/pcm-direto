// Tela extra: cronograma pronto para imprimir em A4 deitado (ou salvar em PDF pelo navegador).
// Para caber na folha, o ano é dividido em duas tabelas: semanas 1 a 26 e 27 a 52.
import { dadosAtuais, estado } from '../estado.js';
import { validarLista } from '../logica/validacao.js';
import { AVISO } from '../logica/pacote.js';
import { dataDaSemana, diaMes, horasPorSemana } from '../logica/cronograma.js';
import { esc, num } from '../ui.js';

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

  main.innerHTML = `
    <div class="nao-imprimir cartao">
      <h2>Cronograma para imprimir</h2>
      <p>Use o botão abaixo e escolha a impressora ou "Salvar como PDF". A folha já sai em A4 deitado.</p>
      ${problemas ? `<p class="erro">${problemas} equipamento(s) com pendência ficaram fora. <a href="#equipamentos">Corrigir</a>.</p>` : ''}
      <div class="acoes">
        <button type="button" id="imprimir">Imprimir</button>
        <a class="botao secundario" href="#entrega">Voltar para a entrega</a>
      </div>
    </div>
    <section class="folha">
      <header class="cab-impressao">
        <img src="./icones/logo.svg" alt="" width="40" height="40">
        <div>
          <strong>Cronograma anual de manutenção preventiva</strong><br>
          Semana 1 começa em ${dados.inicio.toLocaleDateString('pt-BR')} · ${dados.resumo.equipamentos} equipamentos ·
          ${dados.resumo.tarefas} tarefas · ${num(dados.resumo.horasAno)} h no ano · (S) = tarefa de segurança
        </div>
      </header>
      ${tabela(dados, itens, 1, 26)}
      <div class="quebra"></div>
      ${tabela(dados, itens, 27, 52)}
      <p class="aviso-impresso">${esc(AVISO)} Gerado pelo PCM Direto em ${dados.geradoEm.toLocaleDateString('pt-BR')}.</p>
    </section>
  `;
  main.querySelector('#imprimir').addEventListener('click', () => window.print());
}
