import { describe, it, expect } from 'vitest';
import { normalizarFonte } from '../src/logica/dashboards/fonte.js';
import { FILTRO_VAZIO } from '../src/logica/dashboards/filtros.js';
import { calcularManutencao } from '../src/logica/dashboards/manutencao.js';
import { visaoHtml, visaoManutencao } from '../src/saida/dashboards-visao.js';

describe('HTML das visões', () => {
  it('não executa texto importado como HTML', () => {
    const f = normalizarFonte({
      metadados: { data_referencia: '2026-10-29', periodo: { inicio: '2026-01-01', fim: '2026-10-29' } },
      bases: { ativos: [{ tag: 'A', setor: 'S', familia: 'F' }], ordens_servico: [
        { numero_os: '<img src=x onerror=alert(1)>', tag: 'A', atividade: '<script>alert(1)</script>', prioridade: 'ALTA', status: 'ABERTA', data_abertura: '2026-10-01', data_prevista: '2026-10-05', horas_restantes: 1 }] },
    });
    const html = visaoHtml(visaoManutencao(calcularManutencao(f, FILTRO_VAZIO)));
    expect(html).not.toMatch(/<script|<img/i);
    expect(html).toContain('&lt;script&gt;');
  });
  it('mostra "Sem dados" em vez de zero quando o cálculo é indefinido e não usa recursos externos', () => {
    const f = normalizarFonte({ metadados: { data_referencia: '2026-10-29', periodo: { inicio: '2026-01-01', fim: '2026-10-29' } }, bases: {} });
    const html = visaoHtml(visaoManutencao(calcularManutencao(f, FILTRO_VAZIO)));
    expect(html).toContain('Sem dados');
    expect(html).not.toMatch(/https?:\/\//);
  });
});
