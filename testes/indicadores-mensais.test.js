import { describe, it, expect } from 'vitest';
import { indicadoresMensais, mesFechado, ativosDosIndicadores } from '../src/logica/indicadores-mensais.js';
import { criarGestao, validarGestao } from '../src/logica/gestao.js';
import { criarBackup, verificarBackup } from '../src/logica/backup.js';
import padrao from '../src/dados/biblioteca.json';
const falha = (id, data = '2026-09-01') => ({ id, equipamentoId: 'eq1', tag: 'MOT-001', data, sintoma: 'Fictício', causa: '', acao: '', peca: '', responsavelId: '', horasParada: 99 });
const base = () => ({ ...criarGestao(), versao: 2, indicadoresMensais: [{ equipamentoId: 'eq1', tag: 'MOT-001', mes: '2026-09', horasPlanejadas: 720, horasParada: 6 }], falhas: [1,2,3].map(i => ({ ...falha(`f${i}`), dataConclusao: '2026-09-20', horasReparo: 2 })) });
const calcular = g => indicadoresMensais(g, 'eq1', '2026-09', '2026-10-27');
describe('indicadores mensais aprovados', () => {
  it('usa total conferido independente das paradas individuais e exemplo aprovado', () => {
    const r = calcular(base()); expect(r.horasOperadas).toBe(714); expect(r.mtbf).toBe(238); expect(r.mttr).toBe(2); expect(r.disponibilidade).toBeCloseTo(99.1666666667);
  });
  it('atribui falha à ocorrência e reparo inteiro à conclusão, mesmo entre meses', () => {
    const g=base(); g.falhas=[{...falha('f','2026-08-31'),dataConclusao:'2026-09-01',horasReparo:12}, {...falha('g'),dataConclusao:'2026-10-01',horasReparo:9}];
    const r=calcular(g); expect(r.falhas).toBe(1);expect(r.mttr).toBe(12);expect(r.reparosConcluidos).toBe(1);
  });
  it('não infere conclusão, duração nem totais em dados antigos',()=>{
    const g=criarGestao();g.falhas=[falha('f')];const r=calcular(g);expect(r.semConclusao).toBe(1);expect(r.mttr).toBeNull();expect(r.mtbf).toBeNull();expect(r.disponibilidade).toBeNull();
  });
  it('recusa MTTR parcial quando um reparo concluído não tem duração',()=>{const g=base();g.falhas[0].horasReparo=null;expect(calcular(g).mttr).toBeNull();expect(calcular(g).semDuracao).toBe(1);});
  it('soma excessiva não produz infinito nem NaN e não altera a entrada',()=>{const g=base();g.falhas.forEach(f=>{f.horasReparo=Number.MAX_VALUE;});const antes=structuredClone(g);expect(calcular(g).mttr).toBeNull();expect(g).toEqual(antes);});
  it('reparo é independente dos totais mensais e dos ativos de mesmo TAG',()=>{const g=base();g.indicadoresMensais=[];g.falhas.push({...falha('outro'),equipamentoId:'eq2',dataConclusao:'2026-09-20',horasReparo:100});expect(calcular(g).mttr).toBe(2);expect(calcular(g).falhas).toBe(3);expect(calcular(g).mtbf).toBeNull();});
  it('zero de parada e reparo são conhecidos, zero falhas não cria MTBF',()=>{const g=base();g.indicadoresMensais[0].horasParada=0;g.falhas.forEach(f=>{f.horasParada=0;f.horasReparo=0;});expect(calcular(g).falhas).toBe(3);expect(calcular(g).mttr).toBe(0);expect(calcular(g).disponibilidade).toBe(100);g.falhas=[];expect(calcular(g).mtbf).toBeNull();});
  it('não calcula mês atual ou futuro e reconhece virada de ano sem fuso',()=>{for(const m of ['2026-10','2026-11'])expect(indicadoresMensais(base(),'eq1',m,'2026-10-27').mtbf).toBeNull();expect(mesFechado('2025-12','2026-01-01')).toBe(true);expect(mesFechado('2026-13','2027-01-01')).toBe(false);});
  it('mantém ativos removidos e não duplica por TAG ou edição',()=>{const g=base();expect(ativosDosIndicadores([],g)).toEqual([{id:'eq1',tag:'MOT-001',removido:true}]);g.falhas[0].sintoma='Corrigido';expect(calcular(g).falhas).toBe(3);expect(ativosDosIndicadores([{id:'eq1',tag:'NOVA'}],g)).toHaveLength(1);});
  it('valida extensão v2 e mantém gestão1 intacta',()=>{expect(validarGestao(criarGestao())).toBe(true);expect(validarGestao(base())).toBe(true);const g=base();g.versao=1;expect(validarGestao(g)).toBe(false);});
  it('recusa conclusão anterior à falha e durações inválidas',()=>{const g=base();g.falhas[0].dataConclusao='2026-08-31';expect(validarGestao(g)).toBe(false);g.falhas[0].dataConclusao='2026-09-02';g.falhas[0].horasReparo=-1;expect(validarGestao(g)).toBe(false);});
  it('recusa totais duplicados, mês inválido e parada maior que planejada',()=>{const g=base();g.indicadoresMensais.push({...g.indicadoresMensais[0]});expect(validarGestao(g)).toBe(false);g.indicadoresMensais.pop();g.indicadoresMensais[0].mes='2026-13';expect(validarGestao(g)).toBe(false);g.indicadoresMensais[0].mes='2026-09';g.indicadoresMensais[0].horasParada=721;expect(validarGestao(g)).toBe(false);});
  it('backup preserva integralmente extensão e rejeita corrupção sem mutar original',()=>{
    const e={equipamentos:[],ajustes:{},execucoes:{},capacidade:{},inicio:'2026-01-01',exemplo:false,biblioteca:structuredClone(padrao),gestao:base()};const b=criarBackup(e);expect(verificarBackup(b,padrao).ok).toBe(true);expect(verificarBackup(b,padrao).rascunho.gestao).toEqual(e.gestao);b.rascunho.gestao.indicadoresMensais[0].horasParada=-1;expect(verificarBackup(b,padrao).ok).toBe(false);expect(e.gestao.indicadoresMensais[0].horasParada).toBe(6);
  });
});
