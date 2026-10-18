// Tela 4: Entrega — baixar a planilha .xlsx e o resumo .docx.
import biblioteca from '../dados/biblioteca.json';
import { estado } from '../estado.js';
import { validarLista } from '../logica/validacao.js';
import { montarDados, nomeArquivo } from '../logica/pacote.js';
import { gerarXlsx } from '../saida/xlsx.js';
import { montarDocx } from '../saida/docx.js';
import { esc, num, baixar, avisar } from '../ui.js';
import { paraCsv } from '../logica/entrada.js';

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
  const problemas = validarLista(estado.equipamentos, biblioteca.tipos);
  const comErro = Object.keys(problemas).length;
  const vazio = !estado.equipamentos.length;
  const bloqueado = comErro || vazio;
  const dados = montarDados(estado.equipamentos, biblioteca, estado.ajustes);
  const r = dados.resumo;

  main.innerHTML = `
    <section class="cartao">
      <h2>Entrega</h2>
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
        <button type="button" id="baixar-xlsx" ${bloqueado ? 'disabled' : ''}>Baixar planilha (.xlsx)</button>
        <button type="button" id="baixar-docx" ${bloqueado ? 'disabled' : ''}>Baixar resumo (.docx)</button>
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
      <p class="origem">${esc(biblioteca.nome)}, versão ${esc(biblioteca.versao)}. Ao terminar, guarde os arquivos:
      o rascunho fica só neste navegador.</p>
    </section>
  `;

  main.querySelector('#baixar-xlsx').addEventListener('click', (e) => gerando(e.target, async () => {
    // A biblioteca de planilha só é carregada quando você pede o arquivo
    const ExcelJS = (await import('exceljs')).default;
    const buffer = await gerarXlsx(montarDados(estado.equipamentos, biblioteca, estado.ajustes), ExcelJS);
    baixar(new Blob([buffer], { type: XLSX_MIME }), nomeArquivo('xlsx'));
    avisar('Planilha gerada.');
  }));

  main.querySelector('#baixar-docx').addEventListener('click', (e) => gerando(e.target, async () => {
    const docx = await import('docx');
    const blob = await docx.Packer.toBlob(montarDocx(montarDados(estado.equipamentos, biblioteca, estado.ajustes), docx));
    baixar(blob, nomeArquivo('docx'));
    avisar('Resumo gerado.');
  }));

  main.querySelector('#baixar-csv').addEventListener('click', () => {
    const linhas = estado.equipamentos.map((e) => ({ ...e, tipo: biblioteca.tipos.find((t) => t.id === e.tipo)?.nome ?? e.tipo }));
    baixar('\uFEFF' + paraCsv(linhas), 'equipamentos.csv', 'text/csv;charset=utf-8');
  });
}
