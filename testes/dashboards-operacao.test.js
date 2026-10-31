import { it, expect, describe } from 'vitest';
import { fonteDaOperacao } from '../src/logica/dashboards/fonte-operacao.js';
import { calcularManutencao } from '../src/logica/dashboards/manutencao.js';
import { calcularConfiabilidade } from '../src/logica/dashboards/confiabilidade.js';
import { calcularCustos } from '../src/logica/dashboards/custos.js';
import { FILTRO_VAZIO, mesesParciais } from '../src/logica/dashboards/filtros.js';
import { gerarHtmlDashboards } from '../src/saida/dashboards-html.js';
import { criarOperacao, validarOperacao } from '../src/logica/operacao.js';

// Base fictícia no formato salvo pela importação.
function base() {
  const op = criarOperacao();
  const imp = { importacao: 'imp1' };
  op.ativos.push({ tag: 'DEMO-01', descricao_ativo: 'Motor fictício', familia: 'Motor', setor: 'Setor A', ...imp });
  op.ordens_servico.push(
    { numero_os: 'OS-1', tag: 'DEMO-01', equipamento: null, atividade: 'Inspeção', tipo_manutencao: 'PREVENTIVA', prioridade: 'ALTA', status: 'ABERTA', responsavel: null, data_abertura: '2026-09-20', data_prevista: '2026-10-01', data_conclusao: null, horas_estimadas: 2, horas_restantes: 2, ...imp },
    { numero_os: 'OS-2', tag: 'PLANO-02', equipamento: null, atividade: 'Troca', tipo_manutencao: 'CORRETIVA', prioridade: 'MEDIA', status: 'CONCLUIDA', responsavel: null, data_abertura: '2026-10-02', data_prevista: '2026-10-05', data_conclusao: '2026-10-04', horas_estimadas: 1, horas_restantes: 0, ...imp },
  );
  op.falhas.push(
    // Iniciada em setembro e encerrada em outubro: 10 h antes de 01/10 e 6 h depois.
    { referencia_falha: 'F-1', tag: 'DEMO-01', equipamento: null, numero_os: 'OS-1', descricao_falha: 'Vazamento', causa: null, acao: null, inicio_falha: '2026-09-30T14:00:00', fim_falha: '2026-10-01T06:00:00', inicio_reparo: '2026-09-30T15:00:00', fim_reparo: '2026-10-01T06:00:00', ...imp },
    { referencia_falha: 'F-2', tag: 'DEMO-01', equipamento: null, numero_os: null, descricao_falha: 'Ruído', causa: null, acao: null, inicio_falha: '2026-10-10T08:00:00', fim_falha: '2026-10-10T10:00:00', inicio_reparo: null, fim_reparo: null, ...imp },
  );
  op.custos_manutencao.push(
    { referencia_lancamento: 'C-1', data_lancamento: '2026-10-03', tag: null, equipamento: null, setor: 'Setor A', categoria_custo: 'MATERIAL', valor_realizado: 300, documento_origem: null, ...imp },
    { referencia_lancamento: 'C-2', data_lancamento: '2026-10-20', tag: null, equipamento: null, setor: 'Setor B', categoria_custo: 'TERCEIROS', valor_realizado: 200, documento_origem: null, ...imp },
  );
  op.orcamento.push(
    { competencia: '2026-10', setor: null, categoria_custo: 'MATERIAL', valor_orcado: 400, ...imp },
    { competencia: '2026-10', setor: null, categoria_custo: 'TERCEIROS', valor_orcado: 100, ...imp },
  );
  expect(validarOperacao(op)).toBe(true);
  return op;
}
const plano = [{ tag: 'PLANO-02', descricao: 'Bomba do plano', familia: 'Bomba', setor: 'Setor B' }, { tag: 'DEMO-01', descricao: 'Outro nome', familia: 'X', setor: 'Outro' }];

describe('dashboards com os dados da base local', () => {
  it('monta a fonte pela mesma normalização, sem marcar como demonstração e sem o campo interno', () => {
    const f = fonteDaOperacao({ operacao: base(), equipamentos: plano, falhasDoApp: 3 }, '2026-10-29');
    expect(f.metadados).toMatchObject({ demonstracao: false, referencia: '2026-10-29', ultimoMesParcial: true, vazia: false, periodo: { inicio: '2026-09-20', fim: '2026-10-29' } });
    // Cadastro importado prevalece; o plano completa as TAGs que faltam.
    expect(f.bases.ativos.map(a => [a.tag, a.setor])).toEqual([['DEMO-01', 'Setor A'], ['PLANO-02', 'Setor B']]);
    expect(f.bases.ordens_servico.every(o => !('importacao' in o))).toBe(true);
    expect(f.avisos.join(' ')).toContain('3 falha(s) do registro de Falhas do app não entram');
  });

  it('base sem dados da operação fica marcada como vazia', () => {
    const f = fonteDaOperacao({ operacao: undefined, equipamentos: plano }, '2026-10-31');
    expect(f.metadados.vazia).toBe(true);
    expect(f.metadados.periodo.inicio).toBe('2026-10-01');
    expect(f.metadados.ultimoMesParcial).toBe(false);
  });

  it('manutenção usa TAGs do plano no filtro de setor', () => {
    const f = fonteDaOperacao({ operacao: base(), equipamentos: plano }, '2026-10-29');
    const r = calcularManutencao(f, { ...FILTRO_VAZIO, setor: 'Setor B' });
    expect(r.indicadores.abertas.valor).toBe(0);
    expect(calcularManutencao(f, FILTRO_VAZIO).indicadores.atrasadas.valor).toBe(1);
  });

  it('confiabilidade: conta a falha pelo início, mas soma as horas dentro do período', () => {
    const f = fonteDaOperacao({ operacao: base(), equipamentos: plano }, '2026-10-29');
    const out = calcularConfiabilidade(f, { ...FILTRO_VAZIO, inicio: '2026-10-01', fim: '2026-10-29' });
    expect(out.indicadores.falhas.valor).toBe(1); // só F-2 começou no período
    expect(out.indicadores.indisponibilidade.valor).toBe(8); // 6 h de F-1 dentro do período + 2 h de F-2
    expect(out.indicadores.indisponibilidade.populacao).toContain('iniciada(s) antes do período');
    expect(out.indicadores.reparo.valor).toBe(6);
    const setembro = calcularConfiabilidade(f, { ...FILTRO_VAZIO, inicio: '2026-09-01', fim: '2026-09-30' });
    expect(setembro.indicadores.falhas.valor).toBe(1);
    expect(setembro.indicadores.indisponibilidade.valor).toBe(10); // recortada no fim de setembro
  });

  it('custos: orçamento geral só é comparado sem filtro de setor', () => {
    const f = fonteDaOperacao({ operacao: base(), equipamentos: plano }, '2026-10-31');
    const geral = calcularCustos(f, FILTRO_VAZIO);
    expect(geral.indicadores.orcado.valor).toBe(500);
    expect(geral.indicadores.desvio.valor).toBe(0);
    // Setores não recebem parte do orçamento geral: desvio por setor fica indefinido.
    expect(geral.porSetor.every(s => s.desvio === null)).toBe(true);
    const setor = calcularCustos(f, { ...FILTRO_VAZIO, setor: 'Setor A' });
    expect(setor.indicadores.realizado.valor).toBe(300);
    expect(setor.indicadores.orcado.estado).toBe('indefinido');
    expect(setor.indicadores.consumo.valor).toBeNull();
    expect(setor.avisos.join(' ')).toContain('não é dividido por setor');
  });

  it('marca como parcial o mês do início quando o filtro começa no meio do mês', () => {
    expect([...mesesParciais({ inicio: '2026-09-15', fim: '2026-10-31' })]).toEqual(['2026-09']);
    expect([...mesesParciais({ inicio: '2026-09-01', fim: '2026-10-29' })]).toEqual(['2026-10']);
    expect([...mesesParciais({ inicio: '2024-02-01', fim: '2024-02-29' })]).toEqual([]);
    const f = fonteDaOperacao({ operacao: base(), equipamentos: plano }, '2026-10-31');
    const r = calcularCustos(f, { ...FILTRO_VAZIO, inicio: '2026-10-15', fim: '2026-10-31' });
    expect(r.mesParcial).toBe(true);
    expect(r.indicadores.orcado.ausencias).toContain('a partir de 2026-10-15');
    expect(r.graficos.porMes[0].parcial).toBe(true);
    expect(r.indicadores.realizado.valor).toBe(200);
  });

  it('exporta HTML autônomo sem selo de demonstração e sem executar texto importado', () => {
    const op = base();
    op.ordens_servico[0].atividade = '<img src=x onerror=alert(1)>';
    op.ativos[0].descricao_ativo = '<script>alert(1)</script>';
    const f = fonteDaOperacao({ operacao: op, equipamentos: plano }, '2026-10-29');
    const html = gerarHtmlDashboards(f, FILTRO_VAZIO, new Date('2026-10-29T12:00:00Z'));
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('DEMONSTRAÇÃO ·');
    expect(html).toContain('Dados locais do PCM Direto');
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});
