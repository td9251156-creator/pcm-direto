// Gera a planilha .xlsx com as abas: Leia-me, Resumo, Equipamentos, Plano, Cronograma, Ficha de Falha.
// Regras: só funções clássicas (PROCV, ÍNDICE, CORRESP, SOMASE, CONT.SE, SE...), sem macros
// e sem funções de matriz dinâmica, para abrir em versões antigas do Excel.
// As fórmulas são gravadas em inglês (padrão do arquivo); o Excel em português mostra
// PROCV, ÍNDICE, CORRESP etc. Cada fórmula leva também o resultado já calculado.
import { AVISO } from '../logica/pacote.js';
import { PERIODICIDADES } from '../logica/plano.js';
import { SEMANAS, horasPorSemana, dataDaSemana, diaMes } from '../logica/cronograma.js';
import { MARCA, clarear } from '../marca.js';

const AZUL = 'FF' + MARCA.primaria;
const AMARELO = 'FF' + MARCA.avisoFundo;
const LINHAS_FICHA = 50; // linhas em branco na ficha de falha
const PRIMEIRA = 3; // linha 1 = aviso, linha 2 = cabeçalho, dados a partir da 3

/** Letra da coluna: 1 -> A, 27 -> AA */
function coluna(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Linha 1 de cada aba: o aviso permanente, em destaque. */
function escreverAviso(aba, ultimaColuna) {
  aba.mergeCells(1, 1, 1, ultimaColuna);
  const c = aba.getCell(1, 1);
  c.value = `AVISO: ${AVISO}`;
  c.font = { bold: true, color: { argb: 'FF' + MARCA.avisoTexto } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARELO } };
  c.alignment = { wrapText: true, vertical: 'middle' };
  aba.getRow(1).height = 48;
  // Aviso também no rodapé de impressão
  aba.headerFooter.oddFooter = '&8O material apoia a organização do PCM e não substitui a avaliação de profissional habilitado nem o texto oficial das normas.';
}

/** Linha 2: cabeçalho da tabela com filtro e congelamento. */
function escreverCabecalho(aba, titulos, larguras, congelarColunas = 0) {
  const linha = aba.getRow(2);
  titulos.forEach((t, i) => {
    const c = linha.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    c.alignment = { wrapText: true, vertical: 'middle' };
    c.border = { bottom: { style: 'thin' } };
    aba.getColumn(i + 1).width = larguras[i] ?? 12;
  });
  linha.height = 32;
  aba.views = [{ state: 'frozen', xSplit: congelarColunas, ySplit: 2 }];
  aba.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: titulos.length } };
}

/** Fórmula com o resultado já calculado (aparece certo mesmo antes de recalcular). */
const f = (formula, result) => ({ formula, result });

export async function gerarXlsx(dados, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PCM Direto';
  wb.created = dados.geradoEm;
  wb.calcProperties = { fullCalcOnLoad: true };

  // A ordem de criação define a ordem das abas
  const leiame = wb.addWorksheet('Leia-me');
  const resumo = wb.addWorksheet('Resumo');
  const abaEq = wb.addWorksheet('Equipamentos');
  const abaPlano = wb.addWorksheet('Plano');
  const abaCron = wb.addWorksheet('Cronograma');
  const ficha = wb.addWorksheet('Ficha de Falha');

  const eqs = dados.equipamentos;
  const plano = dados.plano;
  const ultEq = PRIMEIRA + eqs.length - 1; // última linha de equipamentos
  const ultPlano = PRIMEIRA + plano.length - 1;
  const faixaEq = (col) => `Equipamentos!$${col}$${PRIMEIRA}:$${col}$${ultEq}`;
  const faixaPlano = (col) => `Plano!$${col}$${PRIMEIRA}:$${col}$${ultPlano}`;
  const nomeTipo = (id) => plano.find((l) => l.equipamentoId === id)?.tipo ?? '';

  // ---------- Equipamentos ----------
  escreverAviso(abaEq, 8);
  escreverCabecalho(abaEq, ['TAG', 'Setor', 'Tipo', 'Descrição', 'Fabricante', 'Modelo', 'Tarefas ativas', 'Horas/ano'], [16, 8, 18, 40, 18, 16, 10, 10], 1);
  eqs.forEach((e, i) => {
    const r = PRIMEIRA + i;
    const minhas = plano.filter((l) => l.equipamentoId === e.id && l.ativa);
    abaEq.getRow(r).values = [
      e.tag, e.setor, nomeTipo(e.id), e.descricao, e.fabricante, e.modelo,
      f(`SUMIF(${faixaPlano('B')},A${r},${faixaPlano('L')})`, minhas.length),
      f(`SUMIF(${faixaPlano('B')},A${r},${faixaPlano('K')})`, minhas.reduce((t, l) => t + l.vezesAno * l.duracaoHoras, 0)),
    ];
    abaEq.getCell(r, 8).numFmt = '0.0';
  });

  // ---------- Plano ----------
  escreverAviso(abaPlano, 16);
  escreverCabecalho(abaPlano,
    ['Chave', 'TAG', 'Equipamento', 'ID tarefa', 'Tarefa', 'Periodicidade', 'Vezes/ano', 'Especialidade',
      'Horas por execução', 'Situação', 'Horas/ano', 'Conta ativa', 'Segurança', 'Origem', 'Versão', 'Observação'],
    [18, 14, 30, 9, 50, 13, 8, 14, 10, 10, 9, 7, 10, 30, 8, 40], 2);
  plano.forEach((l, i) => {
    const r = PRIMEIRA + i;
    const situacao = l.ativa ? 'Ativa' : 'Retirada';
    abaPlano.getRow(r).values = [
      f(`B${r}&"|"&D${r}`, `${l.tag}|${l.tarefaId}`),
      l.tag,
      f(`VLOOKUP(B${r},Equipamentos!$A$${PRIMEIRA}:$D$${ultEq},4,FALSE)`, l.equipamento),
      l.tarefaId, l.descricao, l.periodicidade, l.vezesAno, l.especialidade, l.duracaoHoras, situacao,
      f(`IF(J${r}="Ativa",G${r}*I${r},0)`, l.ativa ? l.vezesAno * l.duracaoHoras : 0),
      f(`IF(J${r}="Ativa",1,0)`, l.ativa ? 1 : 0),
      l.seguranca ? 'Sim' : 'Não',
      l.origem, l.versao, l.observacao,
    ];
    abaPlano.getCell(r, 5).alignment = { wrapText: true, vertical: 'top' };
    abaPlano.getCell(r, 11).numFmt = '0.0';
    if (l.seguranca) abaPlano.getCell(r, 13).font = { bold: true, color: { argb: 'FF' + MARCA.seguranca } };
  });

  // ---------- Cronograma ----------
  const COL_S1 = 6; // coluna F = semana 1
  const colUlt = COL_S1 + SEMANAS - 1;
  const itens = dados.cronograma;
  const ultCron = PRIMEIRA + itens.length - 1;
  escreverAviso(abaCron, colUlt);
  escreverCabecalho(abaCron,
    ['TAG', 'ID tarefa', 'Tarefa', 'Especialidade', 'Horas na semana', ...Array.from({ length: SEMANAS }, (_, i) => `S${i + 1}
${diaMes(dataDaSemana(dados.inicio, i + 1))}`)],
    [14, 9, 40, 13, 7, ...new Array(SEMANAS).fill(4.5)], 5);
  // Ordena por TAG e tarefa para ficar fácil de ler
  const ordenados = itens.slice().sort((a, b) => a.tag.localeCompare(b.tag) || a.tarefaId.localeCompare(b.tarefaId));
  ordenados.forEach((it, i) => {
    const r = PRIMEIRA + i;
    const busca = (col) => `INDEX(${faixaPlano(col)},MATCH(A${r}&"|"&B${r},${faixaPlano('A')},0))`;
    const linha = abaCron.getRow(r);
        // Horas na semana = horas por execução × execuções na semana (diária = 5; demais = 1)
    const horasSemana = f(`${busca('I')}*MAX(1,${busca('G')}/${SEMANAS})`, horasPorSemana(it));
    linha.values = [it.tag, it.tarefaId, f(busca('E'), it.descricao), f(busca('H'), it.especialidade), horasSemana];
    for (const s of it.semanas) {
      const c = linha.getCell(COL_S1 + s - 1);
      c.value = 'X';
      c.alignment = { horizontal: 'center' };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + clarear(it.seguranca ? MARCA.seguranca : MARCA.primaria, 0.78) } };
    }
  });
  // Totais por semana
  const rHoras = ultCron + 2;
  const rQtd = ultCron + 3;
  abaCron.getCell(rHoras, 4).value = 'Horas na semana';
  abaCron.getCell(rQtd, 4).value = 'Tarefas na semana';
  for (let s = 0; s < SEMANAS; s++) {
    const col = coluna(COL_S1 + s);
    const qtd = itens.filter((it) => it.semanas.includes(s + 1)).length;
    abaCron.getCell(rHoras, COL_S1 + s).value = f(`SUMIF(${col}${PRIMEIRA}:${col}${ultCron},"X",$E$${PRIMEIRA}:$E$${ultCron})`, dados.carga[s]);
    abaCron.getCell(rHoras, COL_S1 + s).numFmt = '0.0';
    abaCron.getCell(rQtd, COL_S1 + s).value = f(`COUNTIF(${col}${PRIMEIRA}:${col}${ultCron},"X")`, qtd);
  }
  [rHoras, rQtd].forEach((r) => { abaCron.getRow(r).font = { bold: true }; });
  abaCron.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // ---------- Resumo ----------
  const faixaHoras = `Cronograma!$${coluna(COL_S1)}$${rHoras}:$${coluna(colUlt)}$${rHoras}`;
  const r = dados.resumo;
  escreverAviso(resumo, 3);
  resumo.getColumn(1).width = 38;
  resumo.getColumn(2).width = 16;
  resumo.getColumn(3).width = 50;
  // Cada linha: [rótulo, valor ou fórmula, explicação, formato do número]
  const INT = '0';
  const DEC = '0.0';
  const linhasResumo = [
    ['Indicador', 'Valor', 'Como é calculado'],
    ['Equipamentos cadastrados', f(`COUNTA(${faixaEq('A')})`, r.equipamentos), 'Contagem de TAGs na aba Equipamentos', INT],
    ['Tarefas ativas no plano', f(`SUM(${faixaPlano('L')})`, r.tarefas), 'Soma da coluna "Conta ativa" da aba Plano', INT],
    ['Tarefas de segurança', f(`COUNTIF(${faixaPlano('M')},"Sim")`, r.tarefasSeguranca), 'Não podem ser afrouxadas nem retiradas', INT],
    ['Horas previstas no ano', f(`SUM(${faixaPlano('K')})`, r.horasAno), 'Vezes por ano × horas por execução', DEC],
    ['Média de horas por semana', f(`AVERAGE(${faixaHoras})`, r.mediaSemana), 'Linha "Horas na semana" do Cronograma', DEC],
    ['Semana mais carregada (horas)', f(`MAX(${faixaHoras})`, r.picoSemana), 'Pico após o balanceamento', DEC],
    ['Número da semana mais carregada', f(`MATCH(MAX(${faixaHoras}),${faixaHoras},0)`, r.semanaPico), `Primeira semana com o pico (começa em ${r.dataSemanaPico.toLocaleDateString('pt-BR')})`, INT],
    ['Início do plano (semana 1)', dados.inicio.toLocaleDateString('pt-BR'), 'Cada semana do cronograma começa 7 dias depois da anterior'],
    [],
    ['Horas por especialidade no ano', '', 'Coluna C: média por semana; pico: veja o Resumo no Word ou a tela Revisão'],
    // A fórmula usa o rótulo da própria linha (coluna A) como critério
    ...Object.entries(r.horasPorEspecialidade).map(([esp, h]) => [esp, (rr) => f(`SUMIF(${faixaPlano('H')},A${rr},${faixaPlano('K')})`, h), (rr) => f(`B${rr}/${SEMANAS}`, h / SEMANAS), DEC]),
    [],
    ['Equipamentos por tipo'],
    ...Object.entries(r.equipamentosPorTipo).map(([tipo, n]) => [tipo, (rr) => f(`COUNTIF(${faixaEq('C')},A${rr})`, n), '', INT]),
    [],
    ['Biblioteca técnica', `${dados.biblioteca.nome}, versão ${dados.biblioteca.versao} (${dados.biblioteca.data})`],
    ['Gerado em', dados.geradoEm.toLocaleString('pt-BR')],
  ];
  linhasResumo.forEach(([a, b, c, formato], i) => {
    const rr = 2 + i;
    const linha = resumo.getRow(rr);
    linha.values = [a, typeof b === 'function' ? b(rr) : b, typeof c === 'function' ? c(rr) : c];
    if (formato) linha.getCell(2).numFmt = formato;
    if (typeof c === 'function') linha.getCell(3).numFmt = '0.0 "h/semana"';
    if (b === undefined && a) linha.font = { bold: true }; // títulos de grupo
  });
  resumo.getRow(2).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
  });

  // ---------- Ficha de Falha ----------
  escreverAviso(ficha, 12);
  escreverCabecalho(ficha,
    ['Nº', 'Data', 'TAG', 'Equipamento', 'Descrição da falha', 'Causa provável', 'Ação tomada',
      'Início da parada', 'Fim da parada', 'Horas paradas', 'Responsável', 'Observações'],
    [5, 11, 14, 30, 36, 28, 28, 16, 16, 9, 18, 28], 3);
  wb.definedNames.add(`Equipamentos!$A$${PRIMEIRA}:$A$${ultEq}`, 'ListaTAG');
  for (let i = 0; i < LINHAS_FICHA; i++) {
    const rr = PRIMEIRA + i;
    const linha = ficha.getRow(rr);
    linha.getCell(1).value = i + 1;
    linha.getCell(2).numFmt = 'dd/mm/yyyy';
    linha.getCell(4).value = f(
      `IF(C${rr}="","",IF(ISNA(MATCH(C${rr},${faixaEq('A')},0)),"TAG não cadastrada",VLOOKUP(C${rr},Equipamentos!$A$${PRIMEIRA}:$D$${ultEq},4,FALSE)))`,
      '',
    );
    linha.getCell(8).numFmt = 'dd/mm/yyyy hh:mm';
    linha.getCell(9).numFmt = 'dd/mm/yyyy hh:mm';
    linha.getCell(10).value = f(`IF(OR(H${rr}="",I${rr}=""),"",(I${rr}-H${rr})*24)`, '');
    linha.getCell(10).numFmt = '0.0';
    linha.getCell(3).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['ListaTAG'],
      showErrorMessage: true, errorStyle: 'warning', errorTitle: 'TAG', error: 'TAG fora da lista de equipamentos.',
    };
  }

  // ---------- Leia-me ----------
  leiame.getColumn(1).width = 24;
  leiame.getColumn(2).width = 90;
  escreverAviso(leiame, 2);
  const textos = [
    ['PCM Direto', 'Plano de manutenção preventiva gerado a partir da lista de equipamentos.'],
    ['Gerado em', dados.geradoEm.toLocaleString('pt-BR')],
    ['Início do plano', `Semana 1 começa em ${dados.inicio.toLocaleDateString('pt-BR')}. No Cronograma, cada coluna S mostra o dia em que a semana começa.`],
    ['Biblioteca técnica', `${dados.biblioteca.nome}, versão ${dados.biblioteca.versao} (${dados.biblioteca.data}). Origem das tarefas: base genérica a validar com manual do fabricante.`],
    [],
    ['Aba', 'Conteúdo'],
    ['Resumo', 'Números principais do plano: equipamentos, tarefas, horas por ano e carga semanal.'],
    ['Equipamentos', 'Lista de equipamentos com TAG no padrão SETOR-SIGLA-NÚMERO.'],
    ['Plano', 'Uma linha por tarefa de cada equipamento, com periodicidade, especialidade, origem e versão. Coluna "Segurança" = Sim indica tarefa que não deve ser afrouxada.'],
    ['Cronograma', 'Semanas do ano (S1 a S52) em que cada tarefa deve ser executada. As execuções foram distribuídas para evitar picos de carga. Tarefas de segurança em vermelho claro.'],
    ['Ficha de Falha', 'Modelo para iniciar o histórico de falhas. Escolha a TAG na lista; o nome do equipamento e as horas paradas são preenchidos por fórmula.'],
    [],
    ['Periodicidades', PERIODICIDADES.map((p) => `${p.nome} = ${p.vezes} vez(es) por ano`).join('; ') + '. Diária considera 5 dias úteis por semana.'],
    ['Fórmulas', 'Só funções clássicas: PROCV, ÍNDICE, CORRESP, SOMASE, CONT.SE, CONT.VALORES, SE, É.NÃO.DISP, MÉDIA, MÁXIMO e SOMA. Sem macros e sem funções de matriz dinâmica.'],
    ['Importante', 'Normas: nenhuma exigência legal ou normativa foi citada neste arquivo. Onde houver dúvida, verificar na fonte oficial.'],
  ];
  textos.forEach((valores, i) => {
    const row = leiame.getRow(2 + i);
    row.values = valores;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(1).font = { bold: true };
  });
  leiame.getRow(2).getCell(1).font = { bold: true, size: 16, color: { argb: AZUL } };

  return wb.xlsx.writeBuffer();
}
