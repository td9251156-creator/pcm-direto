import { expect, it, vi } from 'vitest';
import { registrarAtualizacao } from '../src/servicos/atualizacao.js';
it('verifica explicitamente atualização após registrar sem forçar ativação', async () => {
  const registro={ addEventListener:vi.fn(), update:vi.fn(async()=>{}), waiting:null, installing:null };
  const serviceWorker={register:vi.fn(async()=>registro),controller:null};
  expect(await registrarAtualizacao(serviceWorker)).toBe(registro);
  expect(registro.update).toHaveBeenCalledOnce();
  expect(serviceWorker.register).toHaveBeenCalledWith('./sw.js',{updateViaCache:'none'});
});
it('mantém o registro disponível quando a verificação falha sem rede',async()=>{
  const registro={addEventListener:vi.fn(),update:vi.fn(async()=>{throw new Error('Sem rede');}),waiting:null,installing:null};
  expect(await registrarAtualizacao({register:async()=>registro,controller:null})).toBe(registro);
});
