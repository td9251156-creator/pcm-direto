import { describe, it, expect } from 'vitest';
import demo from '../src/dados/demo-dashboards.json';
import { normalizarFonte } from '../src/logica/dashboards/fonte.js';
import { FILTRO_VAZIO } from '../src/logica/dashboards/filtros.js';
import { gerarHtmlDashboards, nomeDoArquivo, resumoDaExportacao } from '../src/saida/dashboards-html.js';

const fonte = () => normalizarFonte(structuredClone(demo));

describe('Baixar HTML dos dashboards', () => {
  it('é autônomo: sem script, sem recurso externo e com as três visões', () => {
    const html = gerarHtmlDashboards(fonte(), FILTRO_VAZIO, new Date('2026-10-31T12:00:00Z'));
    expect(html).not.toMatch(/<script|<link|<iframe|src="https?:|href="https?:|@import|url\(/i);
    expect(html).toContain("default-src 'none'");
    for (const t of ['Manutenção e Programação', 'Confiabilidade', 'Custos']) expect(html).toContain(`<h2>${t}</h2>`);
    expect(html).toContain('DEMONSTRAÇÃO');
    expect(html).toContain('29/10/2026');
    expect(html).toContain('31/10/2026');
    expect(html).toContain('R$');
  });
  it('registra os filtros e avisa quando uma visão não os aceita', () => {
    const html = gerarHtmlDashboards(fonte(), { ...FILTRO_VAZIO, tag: 'DEMO-ATV-001' });
    expect(html).toContain('TAG: DEMO-ATV-001');
    expect(html).toMatch(/sem suporte nesta visão[^<]*tag/i);
  });
  it('o cabeçalho mostra o período filtrado e avisa o que o período não muda em Manutenção', () => {
    const html = gerarHtmlDashboards(fonte(), { ...FILTRO_VAZIO, inicio: '2026-03-01', fim: '2026-03-31' });
    expect(html).toContain('<dt>Período</dt><dd>01/03/2026 a 31/03/2026</dd>');
    expect(html).toMatch(/sempre a posição na referência/);
    expect(gerarHtmlDashboards(fonte(), FILTRO_VAZIO)).toContain('29/10/2026 (padrão)');
  });
  it('resumo prévio informa o que entra e não inclui registros brutos', () => {
    const r = resumoDaExportacao(fonte(), FILTRO_VAZIO);
    expect(r.visoes).toHaveLength(3);
    expect(r.conteudo).toMatch(/não são incluídos/);
    expect(nomeDoArquivo(fonte())).toBe('PCM-Direto_Dashboards_DEMO.html');
    expect(gerarHtmlDashboards(fonte(), FILTRO_VAZIO)).not.toContain('DEMO-OS-00001"');
  });
});
