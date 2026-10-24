import { configuracaoCatalogo, validarModeloCatalogo } from '../logica/catalogo.js';

let instancia;
export const configuracao = () => configuracaoCatalogo(import.meta.env);
async function requisitar(url, opcoes = {}) {
  const controlador = new AbortController();
  const cancelar = () => controlador.abort();
  opcoes.signal?.addEventListener('abort', cancelar, { once: true });
  if (opcoes.signal?.aborted) cancelar();
  const prazo = setTimeout(cancelar, 15000);
  try { return await fetch(url, { ...opcoes, signal: controlador.signal }); }
  finally { clearTimeout(prazo); opcoes.signal?.removeEventListener('abort', cancelar); }
}
export async function clienteCatalogo() {
  const c = configuracao();
  if (!c.configurado) throw new Error(c.erro || 'O catálogo online ainda não foi conectado.');
  if (!instancia) {
    const { createClient } = await import('@supabase/supabase-js');
    instancia = createClient(c.url, c.chave, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, global: { fetch: requisitar } });
  }
  return instancia;
}
async function conferir(operacao) {
  try {
    const r = await operacao;
    if (r.error) {
      const mensagens = {
        '42501': 'Sua conta não tem permissão para esta operação ou o modelo mudou de situação. Atualize a lista.',
        '22023': 'Confira os campos do modelo, a origem das tarefas e o motivo do parecer.',
        '54000': 'O limite de modelos ativos ou propostas pendentes foi atingido. Retire propostas antes de enviar novas.',
      };
      throw new Error(mensagens[r.error.code] || 'Não foi possível concluir a operação online. Confira sua conexão e tente novamente.');
    }
    return r.data;
  } catch (erro) {
    if (erro instanceof Error && !['TypeError', 'AbortError'].includes(erro.name)) throw erro;
    throw new Error('A conexão com o catálogo falhou ou excedeu o tempo de espera. Seus dados locais foram mantidos.', { cause: erro });
  }
}
export async function sessaoCatalogo() { const c = await clienteCatalogo(); return (await conferir(c.auth.getSession()))?.session || null; }
export async function entrarCatalogo(email) {
  const c = await clienteCatalogo();
  await conferir(c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname + '#catalogo' } }));
}
export async function sairCatalogo() { const c = await clienteCatalogo(); await conferir(c.auth.signOut({ scope: 'local' })); }
const COLUNAS = 'id,autor_id,original_id,dados,situacao,motivo,criado_em,atualizado_em';
export async function listarCatalogo({ busca = '', pagina = 0, meus = false, moderacao = false, usuarioId = '' } = {}) {
  const c = await clienteCatalogo(); let q = c.from('catalogo_modelos').select(COLUNAS).order('atualizado_em', { ascending: false });
  if (meus) { if (!usuarioId) throw new Error('Entre na sua conta para consultar seus modelos.'); q = q.eq('autor_id', usuarioId); }
  else q = q.eq('situacao', moderacao ? 'pendente' : 'aprovado');
  if (busca.trim()) q = q.ilike('dados->>titulo', '%' + busca.trim().slice(0, 120).replace(/[\\%_]/g, '\\$&') + '%');
  const deslocamento = Math.max(0, Math.floor(Number(pagina) || 0)) * 20;
  return await conferir(q.range(deslocamento, deslocamento + 19)) || [];
}
export async function moderadorCatalogo() { const c = await clienteCatalogo(); return !!(await conferir(c.rpc('catalogo_e_moderador'))); }
export async function salvarModelo(dados, id = null, originalId = null) {
  const problemas = validarModeloCatalogo(dados); if (problemas.length) throw new Error(problemas[0]);
  const c = await clienteCatalogo(); return await conferir(c.rpc('catalogo_salvar', { p_dados: dados, p_id: id, p_original_id: originalId }));
}
export async function enviarModelo(id) { const c = await clienteCatalogo(); await conferir(c.rpc('catalogo_enviar', { p_id: id })); }
export async function retirarModelo(id) { const c = await clienteCatalogo(); await conferir(c.rpc('catalogo_retirar', { p_id: id })); }
export async function decidirModelo(id, aprovar, motivo = '') { const c = await clienteCatalogo(); await conferir(c.rpc('catalogo_decidir', { p_id: id, p_aprovar: aprovar, p_motivo: motivo })); }
export async function interacoesModelo(id) { const c=await clienteCatalogo(); return await conferir(c.from('catalogo_interacoes').select('curtidas,comentarios').eq('modelo_id',id).maybeSingle())??{curtidas:0,comentarios:0}; }
export async function minhaCurtida(id,autorId) { const c=await clienteCatalogo();return !!(await conferir(c.from('catalogo_curtidas').select('modelo_id').eq('modelo_id',id).eq('autor_id',autorId).maybeSingle())); }
export async function curtirModelo(id,curtir) {const c=await clienteCatalogo();await conferir(c.rpc('catalogo_curtir',{p_id:id,p_curtir:curtir}));}
export async function listarComentarios(id) {const c=await clienteCatalogo();return await conferir(c.from('catalogo_comentarios').select('id,apelido,texto,situacao,criado_em').eq('modelo_id',id).order('criado_em',{ascending:false}).limit(50))??[];}
export async function comentarModelo(id,texto,apelido) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_comentar',{p_id:id,p_texto:texto,p_apelido:apelido}));}
export async function denunciarModelo(id,motivo) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_denunciar',{p_id:id,p_motivo:motivo}));}
export async function moderarComentario(id,aprovar) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_moderar_comentario',{p_id:id,p_aprovar:aprovar}));}
export async function listarDenuncias() {const c=await clienteCatalogo();return await conferir(c.from('catalogo_denuncias').select('id,modelo_id,motivo,criado_em').eq('situacao','aberta').order('criado_em').limit(50))??[];}
export async function resolverDenuncia(id) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_resolver_denuncia',{p_id:id}));}
