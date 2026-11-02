import { describe, it, expect } from 'vitest';
import anterior from '../src/dados/biblioteca-0.2.0.json';
import padrao from '../src/dados/biblioteca.json';
import { atualizarBibliotecaAnterior, verificarBibliotecaEditada, verificarBibliotecaCompativel } from '../src/logica/edicao.js';
const copia = x => JSON.parse(JSON.stringify(x));

describe('publicação aditiva das propostas de máquinas', () => {
  it('não permite burlar a segurança nova trocando somente a versão por 0.2.0', () => {
    for (const remover of [true, false]) {
      const bib = copia(padrao); bib.versao = '0.2.0';
      const tipo = bib.tipos.find(t => t.tarefas.some(x => x.id === 'IEL-04'));
      if (remover) tipo.tarefas = tipo.tarefas.filter(t => t.id !== 'IEL-04');
      else tipo.tarefas.find(t => t.id === 'IEL-04').seguranca = false;
      expect(verificarBibliotecaCompativel(padrao, atualizarBibliotecaAnterior(bib, padrao)).length).toBeGreaterThan(0);
    }
  });

  it('preserva as 64 tarefas anteriores, acrescenta o lote e não altera a entrada', () => {
    const bib = copia(anterior);
    bib.tipos[0].tarefas[0].descricao = 'Inspeção definida pela equipe';
    const antes = copia(bib);
    const nova = atualizarBibliotecaAnterior(bib, padrao);
    expect(bib).toEqual(antes);
    expect(nova.tipos).toHaveLength(47);
    expect(nova.tipos.flatMap(t => t.tarefas)).toHaveLength(380);
    for (const tipo of antes.tipos) for (const tarefa of tipo.tarefas) {
      expect(nova.tipos.find(t => t.id === tipo.id).tarefas.find(t => t.id === tarefa.id)).toEqual(tarefa);
    }
    expect(verificarBibliotecaEditada(padrao, nova)).toEqual([]);
    expect(atualizarBibliotecaAnterior(nova, padrao)).toBe(nova);
  });
  it('não repara silenciosamente tarefa de segurança removida ou afrouxada', () => {
    for (const remover of [true, false]) {
      const bib = copia(anterior);
      const tipo = bib.tipos.find(t => t.tarefas.some(x => x.seguranca));
      const tarefa = tipo.tarefas.find(t => t.seguranca);
      if (remover) tipo.tarefas = tipo.tarefas.filter(t => t !== tarefa);
      else tarefa.seguranca = false;
      expect(atualizarBibliotecaAnterior(bib, padrao)).toBe(bib);
      expect(verificarBibliotecaEditada(padrao, bib).length).toBeGreaterThan(0);
    }
  });
  it('mantém arquivos com conflito de código ou sigla intactos para conciliação', () => {
    for (const campo of ['id', 'sigla']) {
      const bib = copia(anterior);
      const tipo = copia(padrao.tipos[7]);
      if (campo === 'id') tipo.sigla = 'ZZZ';
      else tipo.id = 'tipo_personalizado';
      tipo.tarefas = [];
      bib.tipos.push(tipo);
      const antes = copia(bib);
      expect(atualizarBibliotecaAnterior(bib, padrao)).toBe(bib);
      expect(bib).toEqual(antes);
    }
  });
  it('não migra arquivos inválidos nem versões desconhecidas', () => {
    for (const bib of [null, {}, { ...copia(anterior), versao: 'personalizada' }]) {
      expect(atualizarBibliotecaAnterior(bib, padrao)).toBe(bib);
    }
  });
});
