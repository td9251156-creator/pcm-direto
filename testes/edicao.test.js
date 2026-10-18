import { describe, it, expect } from 'vitest';
import padrao from '../src/dados/biblioteca.json';
import {
  verificarTarefa, verificarBibliotecaEditada, podeApagarTarefa, podeApagarTipo, novoTipo, novaTarefa,
} from '../src/logica/edicao.js';

const copia = () => JSON.parse(JSON.stringify(padrao));
const seg = padrao.tipos[3].tarefas.find((t) => t.seguranca && t.periodicidade === 'Mensal');

describe('edição da biblioteca no app', () => {
  it('a biblioteca original passa na verificação', () => {
    expect(verificarBibliotecaEditada(padrao, padrao)).toEqual([]);
  });

  it('não deixa afrouxar nem desmarcar tarefa de segurança original', () => {
    expect(verificarTarefa(padrao, { ...seg, periodicidade: 'Trimestral' }).ok).toBe(false);
    expect(verificarTarefa(padrao, { ...seg, seguranca: false }).ok).toBe(false);
    expect(verificarTarefa(padrao, { ...seg, periodicidade: 'Semanal' }).ok).toBe(true);
  });

  it('não deixa apagar tarefa de segurança original nem tipo original', () => {
    expect(podeApagarTarefa(padrao, seg.id)).toBe(false);
    expect(podeApagarTarefa(padrao, 'MOT-01')).toBe(true);
    expect(podeApagarTipo(padrao, 'motor_eletrico', []).ok).toBe(false);
  });

  it('acusa biblioteca importada que retira tarefa de segurança', () => {
    const b = copia();
    b.tipos[3].tarefas = b.tipos[3].tarefas.filter((t) => t.id !== seg.id);
    expect(verificarBibliotecaEditada(padrao, b).join(' ')).toMatch(seg.id);
  });

  it('cria tipo novo com sigla única e tarefa com origem do usuário', () => {
    const b = copia();
    expect(novoTipo(b, 'Redutor', 'red')).toMatchObject({ ok: true, tipo: { id: 'redutor', sigla: 'RED' } });
    expect(novoTipo(b, 'Outro motor', 'MOT').ok).toBe(false);
    const r = novoTipo(b, 'Redutor', 'RED');
    b.tipos.push(r.tipo);
    const t = novaTarefa(b, r.tipo);
    expect(t.id).toBe('RED-01');
    expect(t.origem).toMatch(/usuário/);
    expect(podeApagarTipo(padrao, 'redutor', [{ tipo: 'redutor' }]).ok).toBe(false);
    expect(podeApagarTipo(padrao, 'redutor', []).ok).toBe(true);
  });
});
