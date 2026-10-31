import {describe,it,expect} from 'vitest';
import {acessoAtual} from '../src/navegacao.js';

describe('localização na navegação',()=>{
  it('agrupa subtelas sem perder o acesso direto',()=>{
    for(const rota of ['equipamentos','cadastros','criticidade','revisao','plano','mensal','impressao'])expect(acessoAtual(rota,false)).toBe('planejar');
    expect(acessoAtual('execucao',false)).toBe('executar');
    expect(acessoAtual('catalogo',false)).toBe('comunidade');
    expect(acessoAtual('modelos',false)).toBe('entrega');
    expect(acessoAtual('entrega-modelos',false)).toBe('entrega');
    for(const rota of ['semana','executar','ativos','falhas','planejar','biblioteca','entrega','dados'])expect(acessoAtual(rota,false)).toBe(rota);
  });
  it('indica Mais para os acessos que ficam fora da barra do celular',()=>{
    for(const rota of ['cadastros','plano','modelos','comunidade','biblioteca','apoio','assistente','dashboards'])expect(acessoAtual(rota,true)).toBe('mais');
    expect(acessoAtual('execucao',true)).toBe('executar');
    for(const rota of ['semana','executar','ativos','falhas'])expect(acessoAtual(rota,true)).toBe(rota);
  });
  it('trata endereços desconhecidos como a abertura da comunidade',()=>{
    expect(acessoAtual('inexistente',false)).toBe('comunidade');
    expect(acessoAtual('',true)).toBe('mais');
  });
});
