// Gera o resumo do plano em .docx (Word).
import { AVISO } from '../logica/pacote.js';

const fmt = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

/**
 * Monta o documento. "docx" é a biblioteca docx, passada de fora para
 * ser carregada só quando o usuário pede o arquivo.
 */
export function montarDocx(dados, docx) {
  const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, Footer } = docx;
  const r = dados.resumo;

  const p = (texto, opcoes = {}) => new Paragraph({ children: [new TextRun({ text: texto, ...opcoes })], spacing: { after: 120 } });
  const titulo = (texto) => new Paragraph({ text: texto, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });

  // Tabela simples com cabeçalho em destaque
  const tabela = (cabecalho, linhas) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalho, ...linhas].map((cols, i) => new TableRow({
      tableHeader: i === 0,
      children: cols.map((texto) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(texto), bold: i === 0, color: i === 0 ? 'FFFFFF' : undefined })] })],
        shading: i === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: '0B3D63' } : undefined,
      })),
    })),
  });

  const aviso = new Paragraph({
    children: [new TextRun({ text: 'Aviso: ', bold: true }), new TextRun(AVISO)],
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFF4C2' },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: '8A6D00', space: 6 } },
    spacing: { after: 200 },
  });

  const porEquipamento = dados.equipamentos.map((e) => {
    const minhas = dados.plano.filter((l) => l.equipamentoId === e.id && l.ativa);
    const horas = minhas.reduce((t, l) => t + l.vezesAno * l.duracaoHoras, 0);
    return [e.tag, e.descricao, minhas[0]?.tipo ?? '', minhas.length, fmt(horas)];
  });

  const seguranca = dados.plano.filter((l) => l.seguranca && l.ativa);

  return new Document({
    creator: 'PCM Direto',
    title: 'Resumo do plano de manutenção preventiva',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      footers: { default: new Footer({ children: [p('Gerado pelo PCM Direto. ' + AVISO, { size: 16 })] }) },
      children: [
        new Paragraph({ text: 'Resumo do plano de manutenção preventiva', heading: HeadingLevel.HEADING_1 }),
        p(`Gerado em ${dados.geradoEm.toLocaleString('pt-BR')} pelo PCM Direto.`),
        aviso,

        titulo('Números do plano'),
        tabela(['Indicador', 'Valor'], [
          ['Equipamentos cadastrados', r.equipamentos],
          ['Tarefas ativas no plano', r.tarefas],
          ['Tarefas de segurança (não podem ser afrouxadas)', r.tarefasSeguranca],
          ['Tarefas retiradas na revisão', r.retiradas],
          ['Horas previstas no ano', fmt(r.horasAno)],
          ['Média de horas por semana', fmt(r.mediaSemana)],
          ['Semana mais carregada', `Semana ${r.semanaPico}: ${fmt(r.picoSemana)} h`],
        ]),

        titulo('Equipamentos'),
        tabela(['TAG', 'Descrição', 'Tipo', 'Tarefas', 'Horas/ano'], porEquipamento),

        titulo('Horas por especialidade no ano'),
        tabela(['Especialidade', 'Horas/ano'], Object.entries(r.horasPorEspecialidade).map(([esp, h]) => [esp, fmt(h)])),

        titulo('Tarefas de segurança'),
        p('Estas tarefas só podem ter a frequência mantida ou aumentada, e não podem ser retiradas do plano.'),
        tabela(['TAG', 'Tarefa', 'Periodicidade'], seguranca.map((l) => [l.tag, l.descricao, l.periodicidade])),

        titulo('Origem das tarefas'),
        p(`${dados.biblioteca.nome}, versão ${dados.biblioteca.versao} (${dados.biblioteca.data}).`),
        p('Todas as tarefas desta versão têm origem "base genérica a validar com manual do fabricante". Nenhuma exigência de norma foi citada; onde houver dúvida, verificar na fonte oficial.'),

        titulo('Próximos passos sugeridos'),
        p('1. Conferir cada tarefa e periodicidade com o manual do fabricante e o regime real de uso.'),
        p('2. Registrar na aba Plano a origem confirmada de cada tarefa revisada.'),
        p('3. Começar o histórico de falhas pela aba Ficha de Falha da planilha.'),
        p('4. Ajustar o cronograma à capacidade da equipe e às paradas programadas.'),
      ],
    }],
  });
}
