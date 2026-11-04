// Permissões reais do PostgreSQL em memória, sem contas ou mensagens em produção.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '../ferramentas/navegador/node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
const A='10000000-0000-4000-8000-000000000001', B='20000000-0000-4000-8000-000000000002', M='30000000-0000-4000-8000-000000000003', U='40000000-0000-4000-8000-000000000004';
const uma=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
async function como(role,id,acao) {
  assert.ok(['anon','authenticated'].includes(role)); await db.exec('set role '+role);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
  try{return await acao();}finally{await db.exec('reset role');}
}
const recusa=(acao,codigo)=>assert.rejects(acao,e=>e.code===codigo);
const enviar=(texto='Pergunta fictícia',pai=null,codigo='PCM-MAN-004',nonce=crypto.randomUUID())=>uma('select public.comunidade_enviar($1,$2,$3,$4,$5) id',[codigo,'Equipe fictícia',texto,pai,nonce]);
const listar=(vista='publicos',codigo='PCM-MAN-004',pagina=0)=>db.query('select * from public.comunidade_listar($1,$2,$3)',[codigo,vista,pagina]);
try {
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(await readFile('supabase/migrations/202610230001_catalogo.sql','utf8'));
 const nome=(await readdir('supabase/migrations')).find(n=>n.endsWith('_comunidade_materiais.sql'));
 await db.exec(await readFile('supabase/migrations/'+nome,'utf8'));
 await db.query('insert into auth.users(id) values($1),($2),($3)',[A,B,M]);await db.query('insert into auth.users values($1,null)',[U]);
 await db.query('insert into public.catalogo_moderadores values($1)',[M]);
 assert.equal((await como('anon',null,()=>uma('select comunidade_ativa() ativa'))).ativa,false);
 await como('authenticated',A,()=>recusa(()=>enviar(),'55000'));
 await db.exec('update comunidade_pcm.configuracao set ativo=true');
 await como('anon',null,async()=>{await recusa(()=>enviar(),'42501');await recusa(()=>db.query('select * from comunidade_pcm.comentarios'),'42501');});
 await como('authenticated',U,()=>recusa(()=>enviar(),'42501'));
 let raiz,filho;
 const nonce=crypto.randomUUID();
 await como('authenticated',A,async()=>{
  raiz=(await enviar('Pergunta fictícia',null,'PCM-MAN-004',nonce)).id;
  assert.equal((await enviar('Pergunta fictícia',null,'PCM-MAN-004',nonce)).id,raiz,'Repetir o mesmo envio não duplica');
  await recusa(()=>enviar('Outro conteúdo',null,'PCM-MAN-004',nonce),'23505');
  assert.equal((await listar('meus')).rows.length,1);
  await recusa(()=>enviar('x'.repeat(2001)),'22023');await recusa(()=>enviar('Falha',null,'PCM-MAN-099'),'22023');
 });
 assert.equal((await como('anon',null,()=>listar())).rows.length,0);
 await como('authenticated',B,async()=>{assert.equal((await listar('meus')).rows.length,0);await recusa(()=>listar('moderacao'),'42501');await recusa(()=>db.query('select comunidade_moderar($1,true)',[raiz]),'42501');await recusa(()=>db.query('select comunidade_retirar($1)',[raiz]),'42501');await recusa(()=>db.query('select autor_id from comunidade_pcm.comentarios'),'42501');});
 await como('authenticated',M,async()=>{assert.equal((await listar('moderacao')).rows.length,1);await db.query('select comunidade_moderar($1,true)',[raiz]);});
 const publico=(await como('anon',null,()=>listar())).rows;
 assert.equal(publico.length,1);assert.deepEqual(Object.keys(publico[0]).sort(),['id','codigo','resposta_a','apelido','texto','situacao','criado_em','proprio','publicado'].sort());assert.equal(publico[0].proprio,false);
 await como('authenticated',A,async()=>{
  filho=(await enviar('Resposta fictícia',raiz)).id;
  await recusa(()=>enviar('Terceiro nível',filho),'22023');await recusa(()=>enviar('Outro assunto',raiz,'PCM-MAN-003'),'22023');
  await enviar('Pendência 1');await enviar('Pendência 2');await enviar('Pendência 3');await recusa(()=>enviar('Excesso'),'54000');
 });
 await como('authenticated',M,()=>db.query('select comunidade_moderar($1,true)',[filho]));
 assert.equal((await como('anon',null,()=>listar())).rows.length,2);
 await como('authenticated',B,async()=>{await db.query('select comunidade_denunciar($1,$2)',[raiz,'Motivo fictício privado']);await db.query('select comunidade_denunciar($1,$2)',[raiz,'Repetição']);await recusa(()=>db.query('select * from comunidade_denuncias_listar(0)'),'42501');});
 assert.equal((await uma('select count(*)::int n from comunidade_pcm.denuncias')).n,1);
 await como('authenticated',M,async()=>{
  const d=(await db.query('select * from comunidade_denuncias_listar(0)')).rows;assert.equal(d.length,1);assert.ok(!('autor_id' in d[0]));
  await db.query('select comunidade_denuncia_resolver($1)',[d[0].id]);await db.query('select comunidade_moderar($1,false)',[raiz]);
 });
 assert.equal((await como('anon',null,()=>listar())).rows.length,0,'Ocultar pergunta também retira respostas da leitura pública');
 await como('authenticated',A,async()=>{await db.query('select comunidade_retirar($1)',[raiz]);await recusa(()=>enviar('Não burla limite ao retirar'),'54000');});
 assert.equal((await uma('select texto from comunidade_pcm.comentarios where id=$1',[raiz])).texto,'');
 await como('authenticated',M,()=>recusa(()=>db.query('select comunidade_moderar($1,true)',[filho]),'22023'));
 for(let i=0;i<25;i++)await db.query("insert into comunidade_pcm.comentarios(codigo,autor_id,apelido,texto,nonce,situacao) values('PCM-MAN-003',$1,'Fictício','Pergunta paginada',gen_random_uuid(),'aprovado')",[B]);
 assert.equal((await como('anon',null,()=>listar('publicos','PCM-MAN-003',0))).rows.length,10);
 assert.equal((await como('anon',null,()=>listar('publicos','PCM-MAN-003',2))).rows.length,5);
 assert.equal((await como('anon',null,()=>db.query('select * from comunidade_resumo()'))).rows[0].comentarios,25);
 const permissoes=(await db.query("select p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'comunidade_%'")).rows;
 assert.ok(permissoes.every(p=>!p.prosecdef),'Nenhum definer exposto no schema público');

 const pais=(await db.query("select id from comunidade_pcm.comentarios where codigo='PCM-MAN-003' and resposta_a is null order by id")).rows;
 for(let i=0;i<50;i++)await db.query("insert into comunidade_pcm.comentarios(codigo,autor_id,apelido,texto,nonce,resposta_a) values('PCM-MAN-003',$1,'Fictício','Resposta para limite',gen_random_uuid(),$2)",[B,pais[0].id]);
 await como('authenticated',M,()=>recusa(()=>enviar('Resposta excedente',pais[0].id,'PCM-MAN-003'),'54000'));
 for(let i=0;i<20;i++)await db.query("insert into comunidade_pcm.comentarios(codigo,autor_id,apelido,texto,nonce,criado_em) values('PCM-MAN-004',$1,'Fictício','Registro para limite diário',gen_random_uuid(),now()-interval '2 hours')",[M]);
 await como('authenticated',M,()=>recusa(()=>enviar('Excesso diário'),'54000'));
 await como('authenticated',B,async()=>{for(let i=0;i<9;i++)await db.query('select comunidade_denunciar($1,$2)',[pais[i].id,'Motivo fictício']);await recusa(()=>db.query('select comunidade_denunciar($1,$2)',[pais[10].id,'Excesso diário']),'54000');});
 await db.exec('update comunidade_pcm.configuracao set ativo=false');
 await como('anon',null,async()=>{assert.equal((await listar()).rows.length,0);await recusa(()=>listar('meus'),'42501');});
 await como('authenticated',A,async()=>{
  assert.ok((await listar('meus')).rows.every(r=>r.proprio));
  await recusa(()=>enviar('Novo envio durante pausa'),'55000');
  await recusa(()=>db.query('select comunidade_denunciar($1,$2)',[pais[0].id,'Motivo fictício']),'55000');
  await recusa(()=>listar('moderacao'),'42501');
  await db.query('select comunidade_retirar($1)',[filho]);
 });
 await como('authenticated',B,()=>recusa(()=>db.query('select comunidade_retirar($1)',[filho]),'42501'));
 await como('authenticated',M,async()=>{
  await listar('moderacao');
  await db.query('select comunidade_moderar($1,false)',[pais[0].id]);
  const pendentes=await db.query('select * from comunidade_denuncias_listar(0)');
  if(pendentes.rows.length)await db.query('select comunidade_denuncia_resolver($1)',[pendentes.rows[0].id]);
 });
 console.log('Conversas: moderação prévia, duas contas, visitante, limites, idempotência, um nível de resposta, retirada, denúncias privadas, pausa com retirada/moderação e bloqueio de novos envios, paginação e projeção sem autor/e-mail aprovados.');
}finally{await db.close();}
