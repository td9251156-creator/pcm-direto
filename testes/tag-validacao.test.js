import { describe, it, expect } from 'vitest';
import { normalizarSetor, gerarTag, proximoNumero, atribuirTags } from '../src/logica/tag.js';
import { validarEquipamento, resolverTipo, tipoMaisParecido } from '../src/logica/validacao.js';
import { lerTabela, quebrarLinha, paraCsv } from '../src/logica/entrada.js';

const tipos = [
  { id: 'motor_eletrico', nome: 'Motor elétrico', sigla: 'MOT' },
  { id: 'compressor_ar', nome: 'Compressor de ar', sigla: 'CMP' },
  { id: 'bomba_centrifuga', nome: 'Bomba centrífuga', sigla: 'BCF' },
];
const siglas = Object.fromEntries(tipos.map((t) => [t.id, t.sigla]));

describe('geração de TAG', () => {
  it('procura lacunas ao atingir 999 e retorna null quando todos estão ocupados', () => {
    const todos = Array.from({ length: 999 }, (_, i) => ({ id: `e${i}`, setor: 'UTL', tipo: 'motor_eletrico', numero: i + 1 }));
    expect(proximoNumero(todos, 'UTL', 'motor_eletrico')).toBeNull();
    expect(proximoNumero(todos.filter((e) => e.numero !== 42), 'UTL', 'motor_eletrico')).toBe(42);
    expect(gerarTag('UTL', 'MOT', null)).toBe('UTL-MOT-???');
    const p = validarEquipamento({ id: 'novo', setor: 'UTL', tipo: 'motor_eletrico', numero: null, descricao: 'Motor fictício' }, tipos, todos);
    expect(p).toContainEqual(expect.objectContaining({ campo: 'numero', sugestao: null, mensagem: expect.stringContaining('ocupados') }));
  });
  it('monta SETOR-SIGLA-NÚMERO com 3 dígitos', () => {
    expect(gerarTag('UTL', 'CMP', 1)).toBe('UTL-CMP-001');
    expect(gerarTag('PRD', 'MOT', 42)).toBe('PRD-MOT-042');
  });

  it('padroniza o setor: maiúsculo, sem acento, até 4 caracteres', () => {
    expect(normalizarSetor('utl')).toBe('UTL');
    expect(normalizarSetor('Usinágem')).toBe('USIN');
    expect(normalizarSetor('p r d')).toBe('PRD');
  });

  it('numera em sequência por setor e tipo', () => {
    const lista = atribuirTags([
      { id: 'a', setor: 'UTL', tipo: 'compressor_ar' },
      { id: 'b', setor: 'UTL', tipo: 'compressor_ar' },
      { id: 'c', setor: 'UTL', tipo: 'motor_eletrico' },
      { id: 'd', setor: 'PRD', tipo: 'compressor_ar' },
    ], siglas);
    expect(lista.map((e) => e.tag)).toEqual(['UTL-CMP-001', 'UTL-CMP-002', 'UTL-MOT-001', 'PRD-CMP-001']);
  });

  it('respeita número já informado e continua depois dele', () => {
    const lista = atribuirTags([
      { id: 'a', setor: 'UTL', tipo: 'compressor_ar', numero: 7 },
      { id: 'b', setor: 'UTL', tipo: 'compressor_ar' },
    ], siglas);
    expect(lista.map((e) => e.tag)).toEqual(['UTL-CMP-007', 'UTL-CMP-008']);
    expect(proximoNumero(lista, 'UTL', 'compressor_ar')).toBe(9);
  });
});

describe('validação com sugestão', () => {
  const valido = { id: 'x', setor: 'UTL', tipo: 'compressor_ar', numero: 1, descricao: 'Compressor 1', tag: 'UTL-CMP-001' };

  it('aceita equipamento correto', () => {
    expect(validarEquipamento(valido, tipos, [valido])).toEqual([]);
  });

  it('sugere setor corrigido', () => {
    const p = validarEquipamento({ ...valido, setor: 'utl' }, tipos);
    expect(p[0]).toMatchObject({ campo: 'setor', sugestao: 'UTL' });
  });

  it('aponta setor vazio ou curto demais', () => {
    expect(validarEquipamento({ ...valido, setor: '' }, tipos)[0].campo).toBe('setor');
    expect(validarEquipamento({ ...valido, setor: 'A' }, tipos)[0].campo).toBe('setor');
  });

  it('sugere o tipo mais parecido', () => {
    const p = validarEquipamento({ ...valido, tipo: 'bomba' }, tipos);
    expect(p[0]).toMatchObject({ campo: 'tipo', sugestao: 'bomba_centrifuga' });
    expect(tipoMaisParecido('compresor', tipos).id).toBe('compressor_ar');
    expect(resolverTipo('Motor Elétrico', tipos)).toBe('motor_eletrico');
    expect(resolverTipo('MOT', tipos)).toBe('motor_eletrico');
  });

  it('exige descrição', () => {
    const p = validarEquipamento({ ...valido, descricao: '  ' }, tipos);
    expect(p.map((x) => x.campo)).toContain('descricao');
  });

  it('acusa TAG repetida e sugere o próximo número livre', () => {
    const outro = { ...valido, id: 'y' };
    const p = validarEquipamento(outro, tipos, [valido, outro]);
    expect(p[0]).toMatchObject({ campo: 'numero', sugestao: 2 });
  });
});

describe('entrada de dados', () => {
  it.each(['Motor\nda torre', 'Motor\r\nda torre', 'Motor\rda torre', 'Motor; "reserva"'])('preserva uma descrição ao exportar e importar: %j', (descricao) => {
    const e = { setor: 'UTL', tipo: 'motor_eletrico', descricao, fabricante: 'Fabricante fictício', modelo: 'M1' };
    const lista = lerTabela(paraCsv([e]), tipos);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject(e);
  });

  it('ignora separador dentro de aspas ao detectar o formato', () => {
    expect(lerTabela('UTL,MOT,"Motor; reserva",Fictício,M1', tipos)[0].descricao).toBe('Motor; reserva');
  });

  it('recusa aspas não fechadas em vez de importar dados partidos', () => {
    expect(() => lerTabela('UTL;MOT;"Motor\nreserva', tipos)).toThrow(/aspas sem fechamento/);
  });
  it('lê texto colado do Excel (tabulação) com cabeçalho', () => {
    const texto = 'Setor\tTipo\tDescrição\tFabricante\tModelo\nutl\tCompressor de ar\tCompressor 1\tFab X\tM1\n\n';
    const lista = lerTabela(texto, tipos);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ setor: 'UTL', tipo: 'compressor_ar', descricao: 'Compressor 1', fabricante: 'Fab X', modelo: 'M1' });
  });

  it('lê CSV com ponto e vírgula, sem cabeçalho, e mantém tipo desconhecido para a validação', () => {
    const lista = lerTabela('PRD;esteira;Esteira 1\r\nPRD;MOT;Motor 1', tipos);
    expect(lista.map((e) => e.tipo)).toEqual(['esteira', 'motor_eletrico']);
  });

  it('respeita aspas com separador dentro', () => {
    expect(quebrarLinha('UTL,motor_eletrico,"Motor, 5 cv"', ',')).toEqual(['UTL', 'motor_eletrico', 'Motor, 5 cv']);
  });
});

describe('arquivo CSV salvo pelo Excel', () => {
  it('ignora a marca BOM do início do arquivo', () => {
    const lista = lerTabela('\uFEFFsetor;tipo;descricao\nUTL;MOT;Motor 1', tipos);
    expect(lista).toHaveLength(1);
    expect(lista[0].setor).toBe('UTL');
  });
});

describe('importação com cabeçalho em outra ordem', () => {
  it('ignora capa e escolhe a aba identificada em vez da primeira não vazia', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { lerXlsx } = await import('../src/logica/entrada.js');
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Capa').addRow(['Lista fictícia de máquinas']);
    const aba = wb.addWorksheet('Cadastro');
    aba.addRow(['Setor', 'Tipo', 'Descrição']);
    aba.addRow(['UTL', 'MOT', 'Motor fictício']);
    expect(await lerXlsx(await wb.xlsx.writeBuffer(), tipos, ExcelJS)).toMatchObject([{ descricao: 'Motor fictício' }]);
  });

  it('aceita tabela sem cabeçalho, mas não importa uma capa isolada', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { lerXlsx } = await import('../src/logica/entrada.js');
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Capa').addRow(['Exemplo fictício']);
    expect(await lerXlsx(await wb.xlsx.writeBuffer(), tipos, ExcelJS)).toEqual([]);
    wb.addWorksheet('Dados').addRow(['UTL', 'tipo_desconhecido', 'Equipamento fictício']);
    expect(await lerXlsx(await wb.xlsx.writeBuffer(), tipos, ExcelJS)).toMatchObject([{ tipo: 'tipo_desconhecido', descricao: 'Equipamento fictício' }]);
  });
  it('acha as colunas pelo nome e ignora linhas acima do cabeçalho', async () => {
    const { lerMatriz } = await import('../src/logica/entrada.js');
    const matriz = [
      ['AVISO: texto qualquer'],
      ['TAG', 'Setor', 'Tipo', 'Descrição', 'Fabricante', 'Modelo'],
      ['UTL-CMP-001', 'UTL', 'Compressor de ar', 'Compressor 1', 'Fab A', 'M1'],
    ];
    expect(lerMatriz(matriz, tipos)).toMatchObject([{ setor: 'UTL', tipo: 'compressor_ar', descricao: 'Compressor 1', fabricante: 'Fab A', modelo: 'M1' }]);
  });

  it('lê a aba Equipamentos de uma planilha .xlsx', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { lerXlsx } = await import('../src/logica/entrada.js');
    const wb = new ExcelJS.Workbook();
    const aba = wb.addWorksheet('Equipamentos');
    aba.addRow(['Setor', 'Tipo', 'Descrição']);
    aba.addRow(['prd', 'MOT', 'Motor da esteira']);
    const lista = await lerXlsx(await wb.xlsx.writeBuffer(), tipos, ExcelJS);
    expect(lista).toMatchObject([{ setor: 'PRD', tipo: 'motor_eletrico', descricao: 'Motor da esteira' }]);
  });
});
