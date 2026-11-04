import { describe, it, expect } from 'vitest';
import { MODELOS_V2 } from '../src/dados/modelos-v2.js';
import { CAMINHOS_COMUNIDADE, modelosDoCaminho, acessoAoPcm } from '../src/logica/entrada-comunidade.js';

describe('entrada por necessidade', () => {
  it('mantém as sugestões aprovadas, em ordem e sem repetição na mesma lista', () => {
    const esperados = [['003','002','004'],['004','003','006'],['008','009','011'],['002','005','016']];
    CAMINHOS_COMUNIDADE.forEach((c,i) => {
      const codigos = modelosDoCaminho(MODELOS_V2,{caminho:c.id}).map(m=>m.codigo.slice(-3));
      expect(codigos).toEqual(esperados[i]); expect(new Set(codigos).size).toBe(3);
    });
    expect(modelosDoCaminho(MODELOS_V2).map(m=>m.codigo.slice(-3))).toEqual(esperados[1]);
  });
  it('busca fora das sugestões e permite voltar ao catálogo completo sem alterar sua fonte', () => {
    const antes = structuredClone(MODELOS_V2);
    expect(modelosDoCaminho(MODELOS_V2,{busca:'ESTOQUE peças'}).map(m=>m.codigo)).toEqual(['PCM-MAN-010']);
    expect(modelosDoCaminho(MODELOS_V2,{busca:'zzzinexistente'})).toEqual([]);
    expect(modelosDoCaminho(MODELOS_V2,{todos:true})).toHaveLength(19);
    expect(modelosDoCaminho(MODELOS_V2,{caminho:'falhas',busca:' '})).toHaveLength(3);
    expect(MODELOS_V2).toEqual(antes);
  });
  it('encontra a sigla OS sem confundir custos ou o artigo os', () => {
    for (const busca of ['OS', 'o.s.', '(O.S.)', 'OS serviço', 'PCM MAN 004']) {
      expect(modelosDoCaminho(MODELOS_V2, { busca }).map(m => m.codigo), busca).toEqual(['PCM-MAN-004']);
    }
  });
  it('encontra modelos por formato e combina formato com finalidade', () => {
    expect(modelosDoCaminho(MODELOS_V2, { busca: 'Excel' })).toHaveLength(16);
    expect(modelosDoCaminho(MODELOS_V2, { busca: 'Word' })).toHaveLength(3);
    expect(modelosDoCaminho(MODELOS_V2, { busca: 'Excel OS' }).map(m => m.codigo)).toEqual(['PCM-MAN-004']);
    expect(modelosDoCaminho(MODELOS_V2, { busca: 'Word OS' })).toEqual([]);
  });
  it('decide o acesso pela demonstração, revisão salva e configuração iniciada, nessa ordem', () => {
    const e={programacao:{revisoes:[]},equipamentos:[],gestao:{organizacao:{nome:''}},metadados:{passo:1}};
    expect(acessoAoPcm(e)).toMatchObject({novo:true,rota:'assistente'});
    e.metadados.passo=2;expect(acessoAoPcm(e).titulo).toBe('Continuar configuração');
    e.metadados.passo=1;e.gestao.organizacao.nome='Fábrica fictícia';expect(acessoAoPcm(e).rota).toBe('assistente');
    e.gestao.organizacao.nome='';e.equipamentos=[{id:'ficticio'}];expect(acessoAoPcm(e).titulo).toBe('Continuar configuração');
    e.programacao.revisoes=[{vigencia:'2099-01-01'}];expect(acessoAoPcm(e).titulo).toBe('Continuar minha semana');
    expect(acessoAoPcm(e,true)).toEqual({rota:'semana',titulo:'Continuar o exemplo',exemplo:true});
  });
});
