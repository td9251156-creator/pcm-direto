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
        '40001': 'O modelo mudou em outra aba. Atualize a lista e confira o conteúdo novamente.',
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
// Consultas dentro do callback do Auth podem bloquear o SDK; reagimos fora dele.
export async function observarSessaoCatalogo(aoMudar) {
  const c = await clienteCatalogo();
  let ativo = true;
  const pendentes = new Set();
  const { data: { subscription } } = c.auth.onAuthStateChange((evento, sessao) => {
    const prazo = setTimeout(() => {
      pendentes.delete(prazo);
      if (ativo) aoMudar(sessao, evento);
    }, 0);
    pendentes.add(prazo);
  });
  return () => {
    ativo = false;
    for (const prazo of pendentes) clearTimeout(prazo);
    pendentes.clear();
    subscription.unsubscribe();
  };
}
export async function entrarCatalogo(email) {
  const c = await clienteCatalogo();
  await conferir(c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname + '#catalogo' } }));
}
export async function sairCatalogo() { const c = await clienteCatalogo(); await conferir(c.auth.signOut({ scope: 'local' })); }
const COLUNAS = 'id,autor_id,original_id,dados,situacao,motivo,criado_em,atualizado_em,conteudo_versao,pdf_reserva,pdf_caminho,pdf_sha256,pdf_tamanho';
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
export async function decidirModelo(id, aprovar, motivo = '', versao = null) { const c = await clienteCatalogo(); await conferir(c.rpc('catalogo_decidir', { p_id: id, p_aprovar: aprovar, p_motivo: motivo, p_versao: versao })); }

export async function conferirArquivoPdf(arquivo) {
  if (!arquivo || arquivo.size < 1 || arquivo.size > 5000000) throw new Error('Escolha um PDF de até 5 MB.');
  const cabecalho = await arquivo.slice(0, 8).text();
  if (!/^%PDF-(1\.[0-7]|2\.0)/.test(cabecalho)) throw new Error('O arquivo escolhido não tem formato PDF.');
  return arquivo;
}
export async function anexarPdfModelo(id, arquivo, vigente = () => true) {
  await conferirArquivoPdf(arquivo);
  const bytes = await arquivo.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  const c = await clienteCatalogo();
  const conferirSessao = () => { if (!vigente()) throw new Error('A sessão mudou. Abra o rascunho novamente.'); };
  conferirSessao();
  const reserva = await conferir(c.rpc('catalogo_reservar_pdf', { p_id: id }));
  conferirSessao();
  if (reserva.validado) {
    if (reserva.sha256 !== hash) throw new Error('Já existe outro PDF neste modelo. Arquive-o e crie uma nova versão para trocar o arquivo.');
    return reserva;
  }
  const envio = await c.storage.from('catalogo-pdfs').upload(reserva.caminho, arquivo, { contentType: 'application/pdf', cacheControl: '0', upsert: false });
  // Uma resposta perdida pode deixar o objeto enviado; o servidor compara o hash antes de vinculá-lo.
  const duplicado = envio.error && (envio.error.status === 409 ||
    ['409', 'Duplicate', 'ResourceAlreadyExists', 'KeyAlreadyExists'].includes(String(envio.error.statusCode || envio.error.error)));
  if (envio.error && !duplicado) await conferir(Promise.resolve(envio));
  conferirSessao();
  const resultado = await c.functions.invoke('catalogo-finalizar-pdf', { body: { id, sha256: hash } });
  if (resultado.error) {
    let mensagem;
    try { mensagem = (await resultado.error.context?.json())?.erro; } catch { /* Sem corpo de erro legível. */ }
    throw new Error(mensagem || 'O PDF não foi validado. O rascunho foi mantido; tente anexar novamente.');
  }
  conferirSessao();
  if (!resultado.data?.pdf?.caminho) throw new Error('O PDF não foi vinculado. Abra o rascunho novamente.');
  return resultado.data.pdf;
}
export async function baixarPdfModelo(caminho) {
  const c = await clienteCatalogo();
  return conferir(c.storage.from('catalogo-pdfs').download(caminho, {}, { cache: 'no-store' }));
}
export async function interacoesModelo(id) { const c=await clienteCatalogo(); return await conferir(c.from('catalogo_interacoes').select('curtidas,comentarios').eq('modelo_id',id).maybeSingle())??{curtidas:0,comentarios:0}; }
export async function minhaCurtida(id,autorId) { const c=await clienteCatalogo();return !!(await conferir(c.from('catalogo_curtidas').select('modelo_id').eq('modelo_id',id).eq('autor_id',autorId).maybeSingle())); }
export async function curtirModelo(id,curtir) {const c=await clienteCatalogo();await conferir(c.rpc('catalogo_curtir',{p_id:id,p_curtir:curtir}));}
export async function listarComentarios(id) {const c=await clienteCatalogo();return await conferir(c.from('catalogo_comentarios').select('id,apelido,texto,situacao,criado_em').eq('modelo_id',id).order('criado_em',{ascending:false}).limit(50))??[];}
export async function comentarModelo(id,texto,apelido) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_comentar',{p_id:id,p_texto:texto,p_apelido:apelido}));}
export async function denunciarModelo(id,motivo) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_denunciar',{p_id:id,p_motivo:motivo}));}
export async function moderarComentario(id,aprovar) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_moderar_comentario',{p_id:id,p_aprovar:aprovar}));}
export async function listarDenuncias() {const c=await clienteCatalogo();return await conferir(c.from('catalogo_denuncias').select('id,modelo_id,motivo,criado_em').eq('situacao','aberta').order('criado_em').limit(50))??[];}
export async function resolverDenuncia(id) {const c=await clienteCatalogo();return conferir(c.rpc('catalogo_resolver_denuncia',{p_id:id}));}
