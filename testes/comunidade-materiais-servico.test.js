import { beforeEach, it, expect, vi } from 'vitest';
const credencialFicticia = sufixo => ['token',sufixo,'ficticio'].join('-');
const mocks=vi.hoisted(()=>({ cliente:vi.fn(), configuracao:vi.fn() }));
vi.mock('../src/servicos/catalogo.js',()=>({ clienteCatalogo:mocks.cliente,configuracao:mocks.configuracao }));
import { rpcComunidade } from '../src/servicos/comunidade-materiais.js';
beforeEach(()=>{vi.resetAllMocks();mocks.configuracao.mockReturnValue({configurado:true});});
it('fixa o token da conta conferida em uma operação privada',async()=>{
 const header=vi.fn().mockResolvedValue({data:'comentario-ficticio',error:null});
 const rpc=vi.fn().mockReturnValue({setHeader:header});
 mocks.cliente.mockResolvedValue({auth:{getSession:async()=>({data:{session:{user:{id:'conta-a'},access_token:credencialFicticia('a')}}})},rpc});
 expect(await rpcComunidade('enviar',{p_texto:'Exemplo'},{usuarioId:'conta-a',vigente:()=>true})).toBe('comentario-ficticio');
 expect(header).toHaveBeenCalledWith('Authorization','Bearer token-a-ficticio');
});
it('não envia rascunho da conta anterior quando a sessão mudou antes da requisição',async()=>{
 const rpc=vi.fn();mocks.cliente.mockResolvedValue({auth:{getSession:async()=>({data:{session:{user:{id:'conta-b'},access_token:credencialFicticia('b')}}})},rpc});
 await expect(rpcComunidade('enviar',{p_texto:'Rascunho A'},{usuarioId:'conta-a',vigente:()=>true})).rejects.toThrow('conta mudou');expect(rpc).not.toHaveBeenCalled();
});
it('invalida consulta privada abandonada durante a leitura da sessão',async()=>{
 let atual=true;const rpc=vi.fn();mocks.cliente.mockResolvedValue({auth:{getSession:async()=>{atual=false;return{data:{session:{user:{id:'conta-a'},access_token:credencialFicticia('a')}}};}},rpc});
 await expect(rpcComunidade('listar',{p_vista:'meus'},{usuarioId:'conta-a',vigente:()=>atual})).rejects.toThrow();expect(rpc).not.toHaveBeenCalled();
});
