import { it, expect } from 'vitest';
import { lerIntencaoModelo, destinoDoModelo } from '../src/logica/intencao-modelo.js';
const estado = () => ({ programacao: { revisoes: [] }, equipamentos: [], gestao: { organizacao: { nome: '' } }, metadados: { passo: 1 } });
it('aceita apenas modelos do catálogo e não altera o estado ao decidir o próximo passo', () => {
  expect(lerIntencaoModelo('?modelo=<script>')).toBeNull();
  expect(lerIntencaoModelo('?modelo=PCM-MAN-999')).toBeNull();
  const m = lerIntencaoModelo('?modelo=PCM-MAN-004');
  const e = estado(); const antes = structuredClone(e);
  expect(destinoDoModelo(m, e).rota).toBe('assistente'); expect(e).toEqual(antes);
  e.metadados.passo = 3; expect(destinoDoModelo(m, e).acao).toBe('Continuar configuração');
  e.programacao.revisoes.push({ vigencia: '2099-01-01' }); expect(destinoDoModelo(m, e).rota).toBe('executar');
  expect(destinoDoModelo(lerIntencaoModelo('?modelo=PCM-MAN-008'), e).rota).toBe('falhas');
  expect(destinoDoModelo(lerIntencaoModelo('?modelo=PCM-MAN-011'), e).rota).toBe('mensal');
});
