import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const credencialFicticia = sufixo => ['token',sufixo,'ficticio'].join('-');
const mocks=vi.hoisted(()=>({ cliente:vi.fn(), configuracao:vi.fn() }));
vi.mock('../src/servicos/catalogo.js',()=>({ clienteCatalogo:mocks.cliente,configuracao:mocks.configuracao }));
import { rpcComunidade, confirmarAcessoConversa } from '../src/servicos/comunidade-materiais.js';
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

afterEach(()=>vi.unstubAllGlobals());
function retornoFicticio(busca){
 vi.stubGlobal('location',new URL('https://exemplo.test/comunidade/acesso/?assunto=PCM-MAN-004'+busca));
 const h={state:{origem:'ficticia'},replaceState:vi.fn()};vi.stubGlobal('history',h);return h;
}
it.each(['','&error=access_denied&code=ficticio','&code=a&code=b','&code=a&sb_flow_id=x&sb_flow_id=y','&code=a&sb_flow_id=','&code=a&sb_flow_id=..%2Finvalido'])('recusa retorno inválido sem consultar sessão anterior: %s',async busca=>{
 const h=retornoFicticio(busca);const getSession=vi.fn();const exchangeCodeForSession=vi.fn();
 mocks.cliente.mockResolvedValue({auth:{getSession,exchangeCodeForSession}});
 await expect(confirmarAcessoConversa()).rejects.toThrow('mesma janela');
 expect(mocks.cliente).not.toHaveBeenCalled();expect(getSession).not.toHaveBeenCalled();expect(exchangeCodeForSession).not.toHaveBeenCalled();
 expect(h.replaceState).toHaveBeenCalledWith(h.state,'','https://exemplo.test/comunidade/acesso/?assunto=PCM-MAN-004');
});
it('troca o código uma vez, preservando o identificador do fluxo antes de limpar a URL',async()=>{
 const h=retornoFicticio('&code=codigo-ficticio&sb_flow_id=fluxo_ficticio_1234');
 const getSession=vi.fn();const exchangeCodeForSession=vi.fn(async()=>({data:{session:{user:{id:'conta-nova'}},user:{id:'conta-nova'}},error:null}));
 mocks.cliente.mockResolvedValue({auth:{getSession,exchangeCodeForSession}});
 await expect(confirmarAcessoConversa()).resolves.toBeUndefined();
 expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('codigo-ficticio',{flowId:'fluxo_ficticio_1234'});expect(getSession).not.toHaveBeenCalled();
 expect(h.replaceState).toHaveBeenCalledWith(h.state,'','https://exemplo.test/comunidade/acesso/?assunto=PCM-MAN-004');
});
it('não substitui falha do novo link por sessão antiga nem expõe erro do provedor',async()=>{
 retornoFicticio('&code=codigo-ficticio');
 const getSession=vi.fn(async()=>({data:{session:{user:{id:'conta-antiga'}}}}));
 const exchangeCodeForSession=vi.fn(async()=>({data:{session:{user:{id:'conta-antiga'}},user:{id:'conta-antiga'}},error:{message:'detalhe interno fictício'}}));
 const signOut=vi.fn();mocks.cliente.mockResolvedValue({auth:{getSession,exchangeCodeForSession,signOut}});
 await expect(confirmarAcessoConversa()).rejects.toThrow('mesma janela');expect(getSession).not.toHaveBeenCalled();expect(signOut).not.toHaveBeenCalled();
});
it('recusa resposta incompleta ou de identidades inconsistentes no código trocado',async()=>{
 retornoFicticio('&code=codigo-ficticio');
 mocks.cliente.mockResolvedValue({auth:{exchangeCodeForSession:async()=>({data:{session:{user:{id:'conta-a'}},user:{id:'conta-b'}},error:null})}});
 await expect(confirmarAcessoConversa()).rejects.toThrow('Não foi possível confirmar');
});
