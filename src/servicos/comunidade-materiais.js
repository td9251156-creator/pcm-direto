import { clienteCatalogo, configuracao } from './catalogo.js';
export async function rpcComunidade(nome, parametros = {}, opcoes = {}) {
  try {
    if(!configuracao().configurado){const erro=new Error('As conversas ainda não estão disponíveis.');erro.indisponivel=true;throw erro;}
    const privada = ['enviar','retirar','denunciar','moderar','denuncias_listar','denuncia_resolver'].includes(nome) || (nome==='listar' && parametros.p_vista!=='publicos');
    const vigente = () => !opcoes.vigente || opcoes.vigente();
    if(!vigente())throw new Error('A conta mudou. Confira a conversa antes de continuar.');
    const c = await clienteCatalogo(); let token;
    if(privada){
      const r=await c.auth.getSession();const sessao=r.data?.session;
      if(r.error||!vigente()||!opcoes.usuarioId||sessao?.user.id!==opcoes.usuarioId||!sessao?.access_token)throw new Error('A conta mudou. Entre novamente antes de continuar.');
      token=sessao.access_token;
    }
    if(!vigente())throw new Error('A conta mudou. Confira a conversa antes de continuar.');
    let consulta=c.rpc('comunidade_' + nome,parametros);
    // Fixa o token da conta conferida: uma troca de sessão não pode enviar seu rascunho como outra pessoa.
    if(token)consulta=consulta.setHeader('Authorization','Bearer '+token);
    const r=await consulta;
    if (r.error) {
      const erro = new Error(({ '42501': 'Entre com um e-mail confirmado ou confira sua permissão.', '22023': 'Confira os campos e se a pergunta original ainda está publicada.', '23505': 'Este envio mudou. Atualize os campos antes de tentar novamente.', '54000': 'O limite de envios foi atingido. Aguarde antes de tentar novamente.', '55000': 'As conversas ainda não estão disponíveis.' })[r.error.code] || 'Não foi possível concluir a operação. Tente novamente.');
      erro.indisponivel = ['PGRST202','PGRST205','42883','55000'].includes(r.error.code); throw erro;
    }
    return r.data;
  } catch (e) {
    if (e.indisponivel || (e instanceof Error && !['TypeError','AbortError'].includes(e.name))) throw e;
    throw new Error('Não foi possível conectar às conversas. A leitura e os downloads continuam disponíveis.', { cause: e });
  }
}
export async function entrarNaConversa(email, codigo, prefixo) {
  const c = await clienteCatalogo();
  const retorno = new URL(prefixo + 'comunidade/acesso/', location.href);
  if (/^PCM-MAN-(00[1-9]|01[0-9])$/.test(codigo || '')) retorno.searchParams.set('assunto', codigo);
  const r = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: retorno.href } });
  if (r.error) throw new Error('Não foi possível enviar o link de acesso. Aguarde e tente novamente.');
}


/** Confirma o próprio link recebido; uma sessão anterior não é prova de sucesso. */
export async function confirmarAcessoConversa() {
  const url = new URL(location.href);
  const parametros = url.searchParams;
  const codigo = parametros.get('code');
  const fluxo = parametros.get('sb_flow_id');
  const hash = new URLSearchParams(url.hash.slice(1));
  const erroNoRetorno = ['error', 'error_code', 'error_description'].some(c => parametros.has(c) || hash.has(c));
  const assunto = parametros.get('assunto');
  const limpa = new URL(url.pathname, url.origin);
  if (/^PCM-MAN-(00[1-9]|01[0-9])$/.test(assunto || '')) limpa.searchParams.set('assunto', assunto);
  // Não deixa códigos ou descrições do provedor na URL, inclusive quando o acesso falha.
  history.replaceState(history.state, '', limpa.href);
  const falha = () => new Error('Não foi possível confirmar este link. Solicite outro e abra na mesma janela em que informou o e-mail.');
  // Mesmo formato aceito pelo SDK: rejeitar antes evita tocar o verificador de outro fluxo.
  const fluxoInvalido = parametros.has('sb_flow_id') && !/^[a-zA-Z0-9_-]{8,64}$/.test(fluxo || '');
  if (erroNoRetorno || !codigo || parametros.getAll('code').length !== 1 || parametros.getAll('sb_flow_id').length > 1 || fluxoInvalido) throw falha();
  try {
    const c = await clienteCatalogo();
    const opcoes = parametros.has('sb_flow_id') ? { flowId: fluxo } : undefined;
    const r = await c.auth.exchangeCodeForSession(codigo, opcoes);
    const usuario = r.data?.session?.user?.id;
    if (r.error || !usuario || r.data.user?.id !== usuario) throw falha();
  } catch {
    throw falha();
  }
}
