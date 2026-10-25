// Banco em memória, sem rede. auth/storage abaixo são substitutos exclusivamente de teste.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '../ferramentas/navegador/node_modules/@electric-sql/pglite/dist/index.js';
import { PDFDocument } from '../ferramentas/navegador/node_modules/pdf-lib/cjs/index.js';
import { conferirPdf } from '../supabase/functions/catalogo-finalizar-pdf/validacao.js';

const db = new PGlite();
const A = '10000000-0000-0000-0000-000000000001';
const B = '20000000-0000-0000-0000-000000000002';
const M = '30000000-0000-0000-0000-000000000003';
const dados = { titulo: 'Motor fictício', tipo_base: 'motor_eletrico', fabricante: '', modelo: '', descricao: 'Somente teste', caracteristicas: '', apelido: '', tarefas: [] };
const uma = async (sql, params = []) => (await db.query(sql, params)).rows[0];
async function como(role, id, acao) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec('set role ' + role);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  try { return await acao(); } finally { await db.exec('reset role'); }
}
const recusa = async (acao, codigo) => assert.rejects(acao, erro => erro.code === codigo);
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create function storage.allow_any_operation(operacoes text[]) returns boolean language sql stable as
      $$select coalesce(nullif(current_setting('teste.storage.operacao',true),''),'object.get_authenticated')=any(operacoes)$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
  `);
  for (const nome of ['202610230001_catalogo.sql', '20261024145808_pdfs_catalogo.sql']) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + nome, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users values($1),($2),($3)', [A, B, M]);
  await db.query('insert into public.catalogo_moderadores values($1)', [M]);
  await como('anon', null, () => recusa(() => db.query('select catalogo_reservar_pdf(gen_random_uuid())'), '42501'));
  const id = await como('authenticated', A, async () => (await uma('select catalogo_salvar($1::jsonb) id', [JSON.stringify(dados)])).id);
  const reserva = await como('authenticated', A, async () => (await uma('select catalogo_reservar_pdf($1) r', [id])).r);
  await como('authenticated', B, async () => {
    await recusa(() => db.query('select catalogo_reservar_pdf($1)', [id]), '42501');
    await recusa(() => db.query("insert into storage.objects(bucket_id,name) values('catalogo-pdfs',$1)", [reserva.caminho]), '42501');
  });
  await como('authenticated', A, async () => {
    await db.query("insert into storage.objects(bucket_id,name) values('catalogo-pdfs',$1)", [reserva.caminho]);
    assert.equal((await db.query("update storage.objects set name='substituto.pdf' where name=$1", [reserva.caminho])).affectedRows, 0);
    assert.equal((await db.query('delete from storage.objects where name=$1', [reserva.caminho])).affectedRows, 0);
    await recusa(() => db.query('select catalogo_enviar($1)', [id]), '22023');
    await recusa(() => db.query('select catalogo_vincular_pdf($1,$2,$3,$4,1)', [id, A, reserva.versao, 'a'.repeat(64)]), '42501');
  });
  assert.equal((await como('anon', null, () => uma('select count(*)::int n from storage.objects'))).n, 0);
  const vincular = tamanho => db.query('select catalogo_vincular_pdf($1,$2,$3,$4,$5)', [id, A, reserva.versao, 'a'.repeat(64), tamanho]);
  await como('service_role', null, async () => {
    await recusa(() => vincular(5000001), '22023');
    await vincular(5000000);
    await vincular(5000000); // Finalização repetida é idempotente.
  });
  await como('authenticated', A, async () => {
    const retomada = (await uma('select catalogo_reservar_pdf($1) r', [id])).r;
    assert.equal(retomada.validado, true);
    assert.equal(retomada.caminho, reserva.caminho);
    assert.equal(retomada.sha256, 'a'.repeat(64));
    await recusa(() => db.query("insert into storage.objects(bucket_id,name) values('catalogo-pdfs',$1)", [reserva.caminho]), '42501');
    await db.query('select catalogo_enviar($1)', [id]);
  });
  const revisao = (await uma('select conteudo_versao from catalogo_modelos where id=$1', [id])).conteudo_versao;
  await como('authenticated', M, async () => {
    assert.equal((await uma('select count(*)::int n from storage.objects')).n, 1);
    await recusa(() => db.query('select catalogo_decidir($1,true)', [id]), '40001');
    await recusa(() => db.query("select catalogo_decidir($1,true,'',$2)", [id, Number(revisao) - 1]), '40001');
    await db.query("select catalogo_decidir($1,false,'Conferir conteúdo',$2)", [id, revisao]);
  });
  await como('authenticated', A, async () => {
    await db.query('select catalogo_salvar($1::jsonb,$2)', [JSON.stringify({ ...dados, titulo: 'Revisão fictícia' }), id]);
    await db.query('select catalogo_enviar($1)', [id]);
  });
  await como('authenticated', M, async () => {
    await recusa(() => db.query("select catalogo_decidir($1,true,'',$2)", [id, revisao]), '40001');
    const atual = (await uma('select conteudo_versao from catalogo_modelos where id=$1', [id])).conteudo_versao;
    await db.query("select catalogo_decidir($1,true,'',$2)", [id, atual]);
  });
  assert.equal((await como('anon', null, () => uma('select count(*)::int n from storage.objects'))).n, 1);
  for (const operacao of ['object.list', 'object.sign']) {
    await db.query("select set_config('teste.storage.operacao',$1,false)", [operacao]);
    assert.equal((await como('anon', null, () => uma('select count(*)::int n from storage.objects'))).n, 0);
    assert.equal((await como('authenticated', A, () => uma('select count(*)::int n from storage.objects'))).n, 0);
  }
  await db.query("select set_config('teste.storage.operacao','object.get_authenticated',false)");
  await como('authenticated', A, () => db.query('select catalogo_retirar($1)', [id]));
  assert.equal((await como('anon', null, () => uma('select count(*)::int n from storage.objects'))).n, 0);
  assert.equal((await como('authenticated', A, () => uma('select count(*)::int n from storage.objects'))).n, 1);
  assert.equal((await uma("select to_regprocedure('public.catalogo_decidir(uuid,boolean,text)') antiga")).antiga, null);
  // A combinação parcial de campos não pode passar pelo CHECK com resultado NULL.
  await recusa(() => db.query('update catalogo_modelos set pdf_sha256=null where id=$1', [id]), '23514');

  for (const tipo of ['motor_eletrico', 'compressor_ar', 'bomba_centrifuga', 'ponte_rolante', 'transportador_correia', 'ventilador_exaustor', 'unidade_hidraulica']) {
    const bytes = new Uint8Array(await readFile(new URL(`../public/modelos/maquinas/pcm-modelo-${tipo}.pdf`, import.meta.url)));
    assert.match(await conferirPdf(bytes, PDFDocument), /^[a-f0-9]{64}$/);
  }
  await assert.rejects(() => conferirPdf(new TextEncoder().encode('%PDF-1.7\nlixo\n%%EOF'), PDFDocument), /não pôde ser aberto/);
  await assert.rejects(() => conferirPdf(new Uint8Array(5000001), PDFDocument), /5 MB/);
  console.log('PDFs: PostgreSQL em memória aprovou autoria, RLS, imutabilidade, limites, validação, aprovação por versão e arquivo preservado ao arquivar. Parser abriu as sete fichas e recusou PDF falso.');
} finally { await db.close(); }
