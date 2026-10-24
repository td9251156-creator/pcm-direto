import { describe, expect, it } from 'vitest';
import { htmlFichaModelo } from '../src/saida/ficha-pdf.js';
import biblioteca from '../src/dados/biblioteca.json';

describe('Ficha dos campos para impressão e PDF local', () => {
  it('preserva todas as tarefas, fontes, observações e segurança sem truncar', () => {
    const tipo = biblioteca.tipos.find(t => t.id === 'ponte_rolante');
    const html = htmlFichaModelo({ titulo: tipo.nome, tarefas: tipo.tarefas, aviso: 'Aviso próprio da biblioteca' }, 'Biblioteca local 0.1.0', 'logo.svg');
    expect(html).toContain('Aviso próprio da biblioteca');
    for (const t of tipo.tarefas) {
      expect(html).toContain(t.id); expect(html).toContain(t.descricao);
      expect(html).toContain(t.origem); expect(html).toContain(t.observacao);
    }
    expect(html.match(/· SEGURANÇA/g).length).toBe(tipo.tarefas.filter(t => t.seguranca).length);
    const longa = htmlFichaModelo({ titulo: 'Δ · μm', tarefas: Array.from({ length: 100 }, (_, i) => ({ ...tipo.tarefas[0], id: `ITEM-${i}`, observacao: 'Texto longo '.repeat(500) + `fim-${i}` })) }, 'Versão local', 'logo.svg');
    expect(longa).toContain('fim-99'); expect(longa).toContain('Δ · μm');
    expect(html).toContain('não é um plano aprovado');
  });
  it('texto de colaborador não vira HTML ou script na ficha', () => {
    const malicioso = '</title><script>alert(1)</script><img src=x onerror=alert(1)>';
    const html = htmlFichaModelo({ titulo: malicioso, descricao: malicioso, fabricante: malicioso, tarefas: [{ descricao: malicioso, origem: malicioso, observacao: malicioso, periodicidade: 'Mensal', especialidade: 'Elétrica', duracao_horas: .5, versao: '1' }] }, malicioso, 'logo.svg');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;'); expect(html).toContain('0,5 h por execução');
  });
});
