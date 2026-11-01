import { it, expect } from 'vitest';
import { fotoValida, fotosValidas, bytesDaFoto, espacoDasFotos, LIMITES_FOTO } from '../src/logica/fotos.js';
import { criarGestao, validarGestao } from '../src/logica/gestao.js';

const jpeg = (bytes) => `data:image/jpeg;base64,${Buffer.alloc(bytes, 7).toString('base64')}`;
const foto = (id, bytes = 200_000) => ({ id, dados: jpeg(bytes), largura: 1280, altura: 960 });

it('limites aprovados no D5 e cálculo do tamanho da foto', () => {
  expect(LIMITES_FOTO).toMatchObject({ porFalha: 3, ladoMax: 1280, alvoBytes: 300_000, maxBytes: 500_000, avisoAtivoBytes: 20_000_000 });
  expect(Math.abs(bytesDaFoto(jpeg(250_000)) - 250_000)).toBeLessThanOrEqual(2);
});

it('aceita só JPEG reduzido, até 500 KB e 1.280 px, no máximo 3 por falha e sem id repetido', () => {
  expect(fotoValida(foto('a'))).toBe(true);
  for (const ruim of [{ ...foto('a'), dados: 'data:image/png;base64,AAAA' }, foto('b', 600_000), { ...foto('c'), largura: 2000 },
    { ...foto('d'), id: 'id ruim' }, { ...foto('e'), dados: 'data:image/jpeg;base64,<script>' }, null]) expect(fotoValida(ruim)).toBe(false);
  expect(fotosValidas([foto('a'), foto('b'), foto('c')])).toBe(true);
  expect(fotosValidas([foto('a'), foto('b'), foto('c'), foto('d')])).toBe(false);
  expect(fotosValidas([foto('a'), foto('a')])).toBe(false);
  expect(fotosValidas(undefined)).toBe(true);
});

it('soma o espaço por ativo para o aviso de 20 MB', () => {
  const r = espacoDasFotos([{ equipamentoId: 'e1', fotos: [foto('a', 100_000), foto('b', 100_000)] }, { equipamentoId: 'e2', fotos: [foto('c', 50_000)] }, { equipamentoId: 'e1' }]);
  expect(Math.round(r.porAtivo.get('e1') / 1000)).toBe(200);
  expect(Math.round(r.total / 1000)).toBe(250);
});

it('a base aceita fotos só na versão 2 em diante e recusa fotos inválidas', () => {
  const falha = { id: 'f1', equipamentoId: 'eq1', tag: 'TST-MOT-001', data: '2026-10-20', sintoma: 'Fictício', causa: '', acao: '', peca: '', responsavelId: '',
    horasParada: null, dataConclusao: '', horasReparo: null, horaInicio: '', horaFim: '', fotos: [foto('a')] };
  expect(validarGestao({ ...criarGestao(), versao: 2, falhas: [falha] })).toBe(true);
  expect(validarGestao({ ...criarGestao(), versao: 1, falhas: [falha] })).toBe(false);
  expect(validarGestao({ ...criarGestao(), versao: 2, falhas: [{ ...falha, fotos: [foto('a', 900_000)] }] })).toBe(false);
});
