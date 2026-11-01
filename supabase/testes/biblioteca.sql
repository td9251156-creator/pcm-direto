-- Executar SOMENTE em Postgres descartável vazio: este arquivo cria substitutos de auth.users e auth.uid().
-- psql -v ON_ERROR_STOP=1 -f supabase/testes/biblioteca.sql
-- Cobre tabelas, RLS e funções da Biblioteca PCM v2 (o Storage fica fora: exige o ambiente Supabase).
\set ON_ERROR_STOP on

do $$ begin
  if pg_catalog.to_regclass('auth.users') is not null then
    raise exception 'Teste recusado: use banco descartável vazio, nunca um projeto com auth.users.';
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_catalog.pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
\ir ../migrations/202610230001_catalogo.sql
\ir ../migrations/20261101120000_biblioteca_v2.sql
\ir ../carga/biblioteca_v2.sql

begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002');
insert into public.catalogo_moderadores(user_id) values('10000000-0000-0000-0000-000000000001');

-- Carga: 19 modelos em desenvolvimento, estrutura expandida em campos.
do $$ begin
  if (select pg_catalog.count(*) from public.biblioteca_modelos) <> 19 then raise exception 'Carga deveria ter 19 modelos.'; end if;
  if not exists (select 1 from public.biblioteca_campos where codigo='PCM-MAN-004' and tabela='tb_pcm_os' and campo='numero_os') then
    raise exception 'Visão de campos sem tb_pcm_os.numero_os.'; end if;
end $$;

-- Visitante não vê versão em desenvolvimento.
set local role anon;
do $$ begin
  if exists (select 1 from public.biblioteca_modelos) then raise exception 'Anônimo viu modelo não publicado.'; end if;
end $$;
reset role;

-- Usuário comum não altera nem publica.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$ begin
  begin perform public.biblioteca_publicar_versao('2.0.1'); raise exception 'falhou: comum publicou';
  exception when others then if sqlerrm like 'falhou%' then raise; end if; end;
  begin insert into public.biblioteca_modelos(versao_id,codigo,titulo,formato,revisao,arquivo,sha256,bytes)
    select id,'PCM-MAN-020','X','xlsx','R00','PCM-MAN-020_X_R00.xlsx',pg_catalog.repeat('a',64),1 from public.biblioteca_versoes;
    raise exception 'falhou: insert direto';
  exception when others then if sqlerrm like 'falhou%' then raise; end if; end;
end $$;

-- Moderador: versão nova incompleta não publica; a carga completa publica e fica imutável.
select pg_catalog.set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
  perform public.biblioteca_criar_versao('2.1.0','Teste fictício');
  begin perform public.biblioteca_publicar_versao('2.1.0'); raise exception 'falhou: publicou incompleta';
  exception when others then if sqlerrm like 'falhou%' then raise; end if; end;
  begin perform public.biblioteca_registrar_modelo('2.1.0','{"codigo":"PCM-MAN-001","titulo":"Fictício","formato":"xlsx","arquivo":"PCM-MAN-002_Outro_R00.xlsx","sha256":"'||pg_catalog.repeat('b',64)||'","bytes":10}'::jsonb);
    raise exception 'falhou: arquivo de outro código aceito';
  exception when others then if sqlerrm like 'falhou%' then raise; end if; end;
  perform public.biblioteca_publicar_versao('2.0.1');
  begin update public.biblioteca_modelos set titulo='Alterado' where codigo='PCM-MAN-001';
    if found then raise exception 'falhou: alterou versão publicada'; end if;
  exception when others then if sqlerrm like 'falhou%' then raise; end if; end;
end $$;
reset role;

-- Visitante vê só a publicada.
set local role anon;
do $$ begin
  if (select pg_catalog.count(*) from public.biblioteca_modelos) <> 19 then raise exception 'Anônimo deveria ver os 19 publicados.'; end if;
  if exists (select 1 from public.biblioteca_versoes where versao='2.1.0') then raise exception 'Anônimo viu versão em desenvolvimento.'; end if;
end $$;
reset role;
rollback;
\echo 'Biblioteca v2: carga, RLS, funções, publicação completa e imutabilidade aprovadas.'
