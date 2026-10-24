import { conferirPdf } from './validacao.js';
const cabecalhos = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const responder = (status, dados) => new Response(JSON.stringify(dados), { status, headers: cabecalhos });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function criarFinalizador({ createClient, PDFDocument, ambiente }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhos });
    if (req.method !== 'POST') return responder(405, { erro: 'Use POST.' });
    const autorizacao = req.headers.get('Authorization') || '';
    if (!/^Bearer \S+$/.test(autorizacao) || autorizacao.length > 4096) return responder(401, { erro: 'Entre na sua conta.' });
    try {
      const leitor = req.body?.getReader();
      let texto = ''; let tamanho = 0; const decoder = new TextDecoder();
      if (!leitor) return responder(400, { erro: 'Informe o modelo e a identificação do arquivo.' });
      while (true) {
        const parte = await leitor.read(); if (parte.done) break;
        tamanho += parte.value.length;
        if (tamanho > 4096) { await leitor.cancel(); return responder(413, { erro: 'Solicitação muito grande.' }); }
        texto += decoder.decode(parte.value, { stream: true });
      }
      texto += decoder.decode();
      let corpo;
      try { corpo = JSON.parse(texto); } catch { return responder(400, { erro: 'Solicitação inválida.' }); }
      if (!corpo || typeof corpo !== 'object' || Object.keys(corpo).sort().join(',') !== 'id,sha256'
        || !uuid.test(corpo.id) || !/^[0-9a-f]{64}$/.test(corpo.sha256)) return responder(400, { erro: 'Informe o modelo e a identificação do arquivo.' });
      const url = ambiente('SUPABASE_URL');
      const usuario = createClient(url, ambiente('SUPABASE_ANON_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: autorizacao } },
      });
      const acesso = await usuario.auth.getUser(autorizacao.slice(7));
      if (acesso.error || !acesso.data?.user) return responder(401, { erro: 'Entre novamente na sua conta.' });
      const autor = acesso.data.user.id;
      const consulta = await usuario.from('catalogo_modelos').select('autor_id,situacao,pdf_reserva,pdf_caminho,pdf_sha256,conteudo_versao').eq('id', corpo.id).single();
      const modelo = consulta.data;
      if (consulta.error || !modelo || modelo.autor_id !== autor || !modelo.pdf_reserva) return responder(403, { erro: 'Arquivo indisponível nesta conta.' });
      if (modelo.pdf_caminho && modelo.pdf_sha256 === corpo.sha256) return responder(200, { pdf: { caminho: modelo.pdf_caminho, sha256: modelo.pdf_sha256 } });
      if (!['rascunho', 'rejeitado'].includes(modelo.situacao) || modelo.pdf_caminho) return responder(409, { erro: 'Crie uma nova versão para anexar outro PDF.' });
      const download = await usuario.storage.from('catalogo-pdfs').download(modelo.pdf_reserva);
      if (download.error || !download.data) return responder(400, { erro: 'O PDF ainda não chegou. Tente anexar novamente.' });
      let hash;
      try { hash = await conferirPdf(new Uint8Array(await download.data.arrayBuffer()), PDFDocument); }
      catch (e) { return responder(400, { erro: e.message }); }
      if (hash !== corpo.sha256) return responder(409, { erro: 'Já existe outro arquivo neste rascunho. Arquive-o e crie uma nova versão para trocar o PDF.' });
      // O cliente administrativo é separado: nunca recebe o JWT do colaborador.
      const chave = ambiente('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(ambiente('SUPABASE_SECRET_KEYS') || '{}').default;
      const administrador = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
      const vinculo = await administrador.rpc('catalogo_vincular_pdf', { p_id: corpo.id, p_autor: autor, p_versao: modelo.conteudo_versao, p_sha256: hash, p_tamanho: download.data.size });
      if (vinculo.error) return responder(409, { erro: 'O modelo mudou durante o envio. Abra o rascunho novamente.' });
      return responder(200, { pdf: vinculo.data });
    } catch { return responder(503, { erro: 'Não foi possível validar o PDF agora. O rascunho foi mantido; tente novamente.' }); }
  };
}
