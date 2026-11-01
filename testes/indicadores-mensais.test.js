import { describe, it, expect } from 'vitest';
import { indicadoresMensais, mesFechado, ativosDosIndicadores } from '../src/logica/indicadores-mensais.js';
import { criarGestao, validarGestao } from '../src/logica/gestao.js';
import { criarBackup, verificarBackup } from '../src/logica/backup.js';
import padrao from '../src/dados/biblioteca.json';
const falha = (id, data = '2026-09-01') => ({ id, equipamentoId: 'eq1', tag: 'MOT-001', data, sintoma: 'Fictício', causa: '', acao: '', peca: '', responsavelId: '', horasParada: 99 });
const base = () => ({ ...criarGestao(), versao: 2, indicadoresMensais: [{ equipamentoId: 'eq1', tag: 'MOT-001', mes: '2026-09', horasPlanejadas: 720, horasParada: 6 }], falhas: [1,2,3].map(i => ({ ...falha(`f${i}`), dataConclusao: '2026-09-20', horasReparo: 2 })) });
// Exemplo numérico do procedimento PCM-MAN-017 (dados fictícios do próprio documento).
const imp = (ref, tag, ini, fim, ir = null, fr = null) => ({ referencia_falha: ref, tag, equipamento: null, numero_os: null, descricao_falha: null, causa: null, acao: null,
  inicio_falha: ini, fim_falha: fim, inicio_reparo: ir, fim_reparo: fr, peca: null, responsavel: null, importacao: 'i1' });
function gestaoProcedimento() {
  const g = { ...criarGestao(), versao: 3, indicadoresMensais: [
    { equipamentoId: 'bmb', tag: 'BMB-01', mes: '2026-01', horasPlanejadas: 600, horasParada: null },
    { equipamentoId: 'bmb', tag: 'BMB-01', mes: '2026-02', horasPlanejadas: 560, horasParada: null },
    { equipamentoId: 'cmp', tag: 'CMP-02', mes: '2026-02', horasPlanejadas: 500, horasParada: null }] };
  g.operacao = { versao: 1, ativos: [], ordens_servico: [], custos_manutencao: [], orcamento: [], importacoes: [], falhas: [
    imp('B1', 'BMB-01', '2026-01-05T08:00:00', '2026-01-05T12:00:00', '2026-01-05T09:00:00', '2026-01-05T12:00:00'),
    imp('B2', 'BMB-01', '2026-01-12T10:00:00', '2026-01-12T13:00:00', '2026-01-12T11:00:00', '2026-01-12T13:00:00'),
    // Atravessa o mês: 2 h em janeiro e 4 h em fevereiro; reparo de 5 h fica todo em janeiro.
    imp('B3', 'BMB-01', '2026-01-31T22:00:00', '2026-02-01T04:00:00', '2026-01-31T23:00:00', '2026-02-01T04:00:00'),
    imp('C1', 'CMP-02', '2026-01-20T08:00:00', '2026-01-20T13:00:00', '2026-01-20T09:00:00', '2026-01-20T13:00:00'),
    imp('C2', 'CMP-02', '2026-02-10T06:00:00', '2026-02-10T14:00:00', '2026-02-10T08:00:00', '2026-02-10T14:00:00'),
    imp('C3', 'CMP-02', '2026-02-28T12:00:00', null)] };
  return g;
}
const mensal = (g, id, tag, mes) => indicadoresMensais(g, id, mes, '2026-10-27', tag);

describe('indicadores pelo procedimento PCM-MAN-017', () => {
  it('BMB-01 em janeiro e fevereiro: corta a falha na virada do mês e conta N e reparo no mês de início', () => {
    const g = gestaoProcedimento();
    expect(mensal(g, 'bmb', 'BMB-01', '2026-01')).toMatchObject({ hp: 600, hi: 9, horasOperadas: 591, falhas: 3, mtbf: 197, mttr: 3.33, disponibilidade: 98.5 });
    expect(mensal(g, 'bmb', 'BMB-01', '2026-02')).toMatchObject({ hp: 560, hi: 4, horasOperadas: 556, falhas: 0, mtbf: null, mttr: null, disponibilidade: 99.29 });
  });
  it('CMP-02: sem HP só calcula o MTTR; falha aberta vale até o fim do mês, fica provisória e fora do MTTR', () => {
    const g = gestaoProcedimento();
    expect(mensal(g, 'cmp', 'CMP-02', '2026-01')).toMatchObject({ hp: null, hi: 5, horasOperadas: null, falhas: 1, mtbf: null, mttr: 4, disponibilidade: null });
    expect(mensal(g, 'cmp', 'CMP-02', '2026-02')).toMatchObject({ hp: 500, hi: 20, horasOperadas: 480, falhas: 2, mtbf: 240, mttr: 6, disponibilidade: 96, provisoria: true });
  });
  it('falhas do app: usa data e hora; sem hora usa as horas de parada da falha; sem nada, HI fica sem dado', () => {
    const g = { ...criarGestao(), versao: 2, indicadoresMensais: [{ equipamentoId: 'eq1', tag: 'MOT-001', mes: '2026-09', horasPlanejadas: 720, horasParada: null }] };
    const f = (id, extra) => ({ id, equipamentoId: 'eq1', tag: 'MOT-001', data: '2026-09-10', sintoma: 'Fictício', causa: '', acao: '', peca: '', responsavelId: '', horasParada: null, dataConclusao: '', horasReparo: null, horaInicio: '', horaFim: '', ...extra });
    g.falhas = [f('a', { horaInicio: '08:00', dataConclusao: '2026-09-10', horaFim: '10:30', horasReparo: 2 }), f('b', { horasParada: 1.5, dataConclusao: '2026-09-11', horasReparo: 1 })];
    const r = mensal(g, 'eq1', 'MOT-001', '2026-09');
    expect(r).toMatchObject({ hi: 4, horasOperadas: 716, falhas: 2, mtbf: 358, mttr: 1.5 });
    expect(r.alertas.join(' ')).toMatch(/horas de parada informadas/);
    g.falhas.push(f('c', {}));
    expect(mensal(g, 'eq1', 'MOT-001', '2026-09')).toMatchObject({ hi: null, mtbf: null, disponibilidade: null, falhas: 3 });
  });
  it('dado incoerente não calcula; HP zero dá disponibilidade sem dado; mês sem falha com HP vale 100%', () => {
    const g = gestaoProcedimento();
    g.operacao.falhas.push(imp('X', 'BMB-01', '2026-03-05T10:00:00', '2026-03-05T08:00:00'));
    g.indicadoresMensais.push({ equipamentoId: 'bmb', tag: 'BMB-01', mes: '2026-03', horasPlanejadas: 0, horasParada: null }, { equipamentoId: 'bmb', tag: 'BMB-01', mes: '2026-04', horasPlanejadas: 400, horasParada: null });
    const r = mensal(g, 'bmb', 'BMB-01', '2026-03');
    expect(r).toMatchObject({ hi: null, mtbf: null, mttr: null, disponibilidade: null });
    expect(r.alertas.join(' ')).toMatch(/fim antes do início/);
    expect(mensal(g, 'bmb', 'BMB-01', '2026-04')).toMatchObject({ hi: 0, falhas: 0, disponibilidade: 100, mtbf: null });
  });
  it('não conta duas vezes a falha importada do 008 gerado pelo próprio app, nem falhas de outra TAG', () => {
    const g = gestaoProcedimento();
    g.falhas = [{ id: 'B1', equipamentoId: 'bmb', tag: 'BMB-01', data: '2026-01-05', sintoma: 'Fictício', causa: '', acao: '', peca: '', responsavelId: '', horasParada: null, dataConclusao: '2026-01-05', horasReparo: 3, horaInicio: '08:00', horaFim: '12:00' }];
    expect(mensal(g, 'bmb', 'BMB-01', '2026-01')).toMatchObject({ falhas: 3, hi: 9 });
  });
  it('não calcula mês atual ou futuro e reconhece virada de ano sem fuso', () => {
    for (const m of ['2026-10', '2026-11']) expect(indicadoresMensais(gestaoProcedimento(), 'bmb', m, '2026-10-27', 'BMB-01').mtbf).toBeNull();
    expect(mesFechado('2025-12', '2026-01-01')).toBe(true); expect(mesFechado('2026-13', '2027-01-01')).toBe(false);
  });  it('mantém ativos removidos e não duplica por TAG ou edição',()=>{const g=base();expect(ativosDosIndicadores([],g)).toEqual([{id:'eq1',tag:'MOT-001',removido:true}]);g.falhas[0].sintoma='Corrigido';expect(ativosDosIndicadores([{id:'eq1',tag:'NOVA'}],g)).toHaveLength(1);});
  it('valida extensão v2 e mantém gestão1 intacta',()=>{expect(validarGestao(criarGestao())).toBe(true);expect(validarGestao(base())).toBe(true);const g=base();g.versao=1;expect(validarGestao(g)).toBe(false);});
  it('recusa conclusão anterior à falha e durações inválidas',()=>{const g=base();g.falhas[0].dataConclusao='2026-08-31';expect(validarGestao(g)).toBe(false);g.falhas[0].dataConclusao='2026-09-02';g.falhas[0].horasReparo=-1;expect(validarGestao(g)).toBe(false);});
  it('recusa totais duplicados, mês inválido e parada maior que planejada',()=>{const g=base();g.indicadoresMensais.push({...g.indicadoresMensais[0]});expect(validarGestao(g)).toBe(false);g.indicadoresMensais.pop();g.indicadoresMensais[0].mes='2026-13';expect(validarGestao(g)).toBe(false);g.indicadoresMensais[0].mes='2026-09';g.indicadoresMensais[0].horasParada=721;expect(validarGestao(g)).toBe(false);});
  it('backup preserva integralmente extensão e rejeita corrupção sem mutar original',()=>{
    const e={equipamentos:[],ajustes:{},execucoes:{},capacidade:{},inicio:'2026-01-01',exemplo:false,biblioteca:structuredClone(padrao),gestao:base()};const b=criarBackup(e);expect(verificarBackup(b,padrao).ok).toBe(true);expect(verificarBackup(b,padrao).rascunho.gestao).toEqual(e.gestao);b.rascunho.gestao.indicadoresMensais[0].horasParada=-1;expect(verificarBackup(b,padrao).ok).toBe(false);expect(e.gestao.indicadoresMensais[0].horasParada).toBe(6);
  });
});
