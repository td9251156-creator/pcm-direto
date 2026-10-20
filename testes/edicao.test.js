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

  it.each([
    null, [], 'biblioteca', {}, { tipos: null }, { tipos: {} }, { tipos: [null] },
    { tipos: [[]] }, { tipos: [{ id: 'motor', tarefas: null }] },
    { tipos: [{ id: 'motor', tarefas: {} }] }, { tipos: [{ id: 'motor', tarefas: [null] }] },
  ])('recusa estrutura inválida sem interromper a importação: %j', (entrada) => {
    expect(verificarBibliotecaEditada(padrao, entrada).length).toBeGreaterThan(0);
  });

  it('recusa lista de tarefas ausente mesmo em um tipo que já existe', () => {
    const b = copia();
    delete b.tipos[0].tarefas;
    expect(verificarBibliotecaEditada(padrao, b).join(' ')).toMatch(/tarefas deve ser uma lista/);
  });

  it('recusa dois tipos com o mesmo código, mesmo com siglas diferentes', () => {
    const b = copia();
    b.tipos.push({ id: b.tipos[0].id, nome: 'Outro motor', sigla: 'OUT', tarefas: [] });
    expect(verificarBibliotecaEditada(padrao, b).join(' ')).toMatch(/id de tipo repetido/);
  });

  it.each(['0.5', 0, -1, null, Infinity])('recusa duração inválida: %j', (duracao) => {
    const b = copia();
    b.tipos[0].tarefas[0].duracao_horas = duracao;
    expect(verificarBibliotecaEditada(padrao, b).join(' ')).toMatch(/duracao_horas/);
  });

  it.each(['descricao', 'especialidade', 'origem', 'versao'])('exige texto preenchido em %s', (campo) => {
    const b = copia();
    for (const valor of ['  ', {}, 1]) {
      b.tipos[0].tarefas[0][campo] = valor;
      expect(verificarBibliotecaEditada(padrao, b).length).toBeGreaterThan(0);
    }
  });

  it('recusa códigos com caracteres que não pertencem ao formato documentado', () => {
    const b = copia();
    b.tipos[0].id = 'motor"invalido';
    b.tipos[0].tarefas[0].id = 'MOT|01';
    const problemas = verificarBibliotecaEditada(padrao, b).join(' ');
    expect(problemas).toMatch(/id do tipo/);
    expect(problemas).toMatch(/id da tarefa/);
  });

  it('recusa observação que não seja texto', () => {
    const b = copia();
    b.tipos[0].tarefas[0].observacao = {};
    expect(verificarBibliotecaEditada(padrao, b).join(' ')).toMatch(/observacao deve ser um texto/);
  });

  it('não tenta converter campos em objetos para montar a mensagem de erro', () => {
    const b = copia();
    const invalido = JSON.parse('{"toString": null}');
    b.tipos[0].id = invalido;
    b.tipos[0].tarefas[0].id = invalido;
    b.tipos[0].tarefas[0].periodicidade = invalido;
    expect(verificarBibliotecaEditada(padrao, b).length).toBeGreaterThan(0);
  });

  it.each(['nome', 'sigla'])('recusa %s do tipo que não seja texto preenchido', (campo) => {
    const b = copia();
    for (const valor of ['  ', {}, 1]) {
      b.tipos[0][campo] = valor;
      expect(verificarBibliotecaEditada(padrao, b).length).toBeGreaterThan(0);
    }
  });

  it('permite tipo novo sem tarefas e observação opcional, sem alterar o arquivo recebido', () => {
    const b = copia();
    b.tipos.push({ id: 'redutor', nome: 'Redutor', sigla: 'RED', tarefas: [] });
    delete b.tipos[0].tarefas[0].observacao;
    const antes = JSON.stringify(b);
    expect(verificarBibliotecaEditada(padrao, b)).toEqual([]);
    expect(JSON.stringify(b)).toBe(antes);
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
