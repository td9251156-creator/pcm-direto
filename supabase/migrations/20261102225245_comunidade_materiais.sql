-- Conversas por material. Não recebe inventário, backups ou dados operacionais.
-- Preparada para revisão; a configuração nasce desativada.
begin;
create schema comunidade_pcm;
revoke all on schema comunidade_pcm from public,anon,authenticated;
create table comunidade_pcm.configuracao(id boolean primary key default true check(id),ativo boolean not null default false);
insert into comunidade_pcm.configuracao values(true,false);
create table comunidade_pcm.assuntos(codigo text primary key check(codigo ~ '^PCM-MAN-(00[1-9]|01[0-9])$'));
insert into comunidade_pcm.assuntos select 'PCM-MAN-'||lpad(n::text,3,'0') from generate_series(1,19) n;
create table comunidade_pcm.comentarios(
 id uuid primary key default gen_random_uuid(),codigo text not null references comunidade_pcm.assuntos(codigo),
 autor_id uuid not null references auth.users(id) on delete cascade,
 resposta_a uuid references comunidade_pcm.comentarios(id) on delete cascade,
 apelido text not null check(length(apelido)<=60),texto text not null check(length(texto)<=2000),
 situacao text not null default 'pendente' check(situacao in('pendente','aprovado','oculto','retirado')),
 criado_em timestamptz not null default now(),nonce uuid not null,
 unique(autor_id,nonce),check(situacao='retirado' or (length(btrim(apelido))>=1 and length(btrim(texto))>=1))
);
create index comunidade_assunto_situacao on comunidade_pcm.comentarios(codigo,situacao,criado_em desc,id);
create index comunidade_autor_data on comunidade_pcm.comentarios(autor_id,criado_em desc);
create index comunidade_respostas on comunidade_pcm.comentarios(resposta_a,situacao);
create table comunidade_pcm.denuncias(
 id uuid primary key default gen_random_uuid(),comentario_id uuid not null references comunidade_pcm.comentarios(id) on delete cascade,
 autor_id uuid not null references auth.users(id) on delete cascade,motivo text not null check(length(btrim(motivo)) between 1 and 500),
 situacao text not null default 'aberta' check(situacao in('aberta','resolvida')),criado_em timestamptz not null default now(),unique(comentario_id,autor_id)
);
create index comunidade_denuncias_autor on comunidade_pcm.denuncias(autor_id,criado_em desc);
create index comunidade_denuncias_abertas on comunidade_pcm.denuncias(situacao,criado_em);
alter table comunidade_pcm.configuracao enable row level security;
alter table comunidade_pcm.assuntos enable row level security;
alter table comunidade_pcm.comentarios enable row level security;
alter table comunidade_pcm.denuncias enable row level security;
revoke all on all tables in schema comunidade_pcm from public,anon,authenticated;
-- O esquema privado não deve ser exposto no Data API. As projeções abaixo não retornam autor_id/e-mail.
-- SECURITY DEFINER é restrito a este esquema para validar autoria, serializar limites e projetar campos públicos.
create function comunidade_pcm.ativa() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select ativo from comunidade_pcm.configuracao where id),false);
$$;
create function comunidade_pcm.conta(p_exigir_ativo boolean default true) returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid=auth.uid();
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Entre com um e-mail confirmado.' using errcode='42501';end if;
 if p_exigir_ativo and not comunidade_pcm.ativa() then raise exception 'Conversas indisponíveis.' using errcode='55000';end if;
 return u;
end;$$;
create function comunidade_pcm.listar(p_codigo text,p_vista text default 'publicos',p_pagina integer default 0)
returns table(id uuid,codigo text,resposta_a uuid,apelido text,texto text,situacao text,criado_em timestamptz,proprio boolean,publicado boolean)
language plpgsql stable security definer set search_path='' as $$
declare u uuid=auth.uid();
begin
 if p_vista is null or p_vista not in('publicos','meus','moderacao') or p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Consulta inválida.' using errcode='22023';end if;
 if p_vista='publicos' and not exists(select 1 from comunidade_pcm.assuntos a where a.codigo=p_codigo) then raise exception 'Material inválido.' using errcode='22023';end if;
 if p_vista<>'publicos' then u=comunidade_pcm.conta(false);end if;
 if p_vista='moderacao' and not public.catalogo_e_moderador() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 if p_vista='publicos' and not comunidade_pcm.ativa() then return;end if;
 if p_vista='publicos' then
  return query with raizes as(select c.id,c.criado_em from comunidade_pcm.comentarios c where c.codigo=p_codigo and c.resposta_a is null and c.situacao='aprovado' order by c.criado_em desc,c.id offset p_pagina*10 limit 10)
   select c.id,c.codigo,c.resposta_a,c.apelido,c.texto,c.situacao,c.criado_em,coalesce(c.autor_id=u,false),true
   from comunidade_pcm.comentarios c join raizes r on c.id=r.id or c.resposta_a=r.id
   where c.situacao='aprovado' order by r.criado_em desc,r.id,(c.resposta_a is null) desc,c.criado_em,c.id;
 else
  return query select c.id,c.codigo,c.resposta_a,c.apelido,c.texto,c.situacao,c.criado_em,c.autor_id=u,
   c.situacao='aprovado' and (c.resposta_a is null or exists(select 1 from comunidade_pcm.comentarios pai where pai.id=c.resposta_a and pai.situacao='aprovado'))
   from comunidade_pcm.comentarios c where (p_codigo is null or c.codigo=p_codigo) and
   (case when p_vista='meus' then c.autor_id=u and c.situacao<>'retirado' else c.situacao='pendente' end)
   order by c.criado_em,c.id offset p_pagina*20 limit 20;
 end if;
end;$$;
create function comunidade_pcm.enviar(p_codigo text,p_apelido text,p_texto text,p_resposta_a uuid,p_nonce uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid=comunidade_pcm.conta();anterior comunidade_pcm.comentarios;novo uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,117));
 if p_nonce is null or p_apelido is null or p_texto is null or length(btrim(p_apelido)) not between 1 and 60 or position('@' in p_apelido)>0 or length(btrim(p_texto)) not between 1 and 2000 or not exists(select 1 from comunidade_pcm.assuntos where codigo=p_codigo) then raise exception 'Confira material, apelido e mensagem.' using errcode='22023';end if;
 select * into anterior from comunidade_pcm.comentarios where autor_id=u and nonce=p_nonce;
 if found then
  if anterior.codigo=p_codigo and anterior.apelido=btrim(p_apelido) and anterior.texto=btrim(p_texto) and anterior.resposta_a is not distinct from p_resposta_a then return anterior.id;end if;
  raise exception 'O envio já foi usado com outro conteúdo.' using errcode='23505';
 end if;
 if (select count(*) from comunidade_pcm.comentarios where autor_id=u and criado_em>now()-interval '1 hour')>=5 or
    (select count(*) from comunidade_pcm.comentarios where autor_id=u and criado_em>now()-interval '1 day')>=20 then raise exception 'Limite de mensagens atingido. Tente mais tarde.' using errcode='54000';end if;
 if p_resposta_a is not null then
  perform 1 from comunidade_pcm.comentarios where id=p_resposta_a and codigo=p_codigo and resposta_a is null and situacao='aprovado' for update;
  if not found then raise exception 'Responda a uma pergunta publicada deste material.' using errcode='22023';end if;
  if (select count(*) from comunidade_pcm.comentarios where resposta_a=p_resposta_a)>=50 then raise exception 'Limite de respostas atingido.' using errcode='54000';end if;
 end if;
 insert into comunidade_pcm.comentarios(codigo,autor_id,resposta_a,apelido,texto,nonce) values(p_codigo,u,p_resposta_a,btrim(p_apelido),btrim(p_texto),p_nonce) returning id into novo;
 return novo;
end;$$;
create function comunidade_pcm.retirar(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid=comunidade_pcm.conta(false);
begin
 update comunidade_pcm.comentarios set situacao='retirado',texto='',apelido='' where id=p_id and autor_id=u;
 if not found then raise exception 'Comentário indisponível para esta conta.' using errcode='42501';end if;
end;$$;
create function comunidade_pcm.denunciar(p_id uuid,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid=comunidade_pcm.conta();
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,117));
 if p_motivo is null or length(btrim(p_motivo)) not between 1 and 500 then raise exception 'Informe o motivo.' using errcode='22023';end if;
 if not exists(select 1 from comunidade_pcm.comentarios c where c.id=p_id and c.situacao='aprovado' and (c.resposta_a is null or exists(select 1 from comunidade_pcm.comentarios pai where pai.id=c.resposta_a and pai.situacao='aprovado'))) then raise exception 'Comentário indisponível.' using errcode='22023';end if;
 if exists(select 1 from comunidade_pcm.denuncias where autor_id=u and comentario_id=p_id) then return;end if;
 if (select count(*) from comunidade_pcm.denuncias where autor_id=u and criado_em>now()-interval '1 day')>=10 then raise exception 'Limite de denúncias atingido.' using errcode='54000';end if;
 insert into comunidade_pcm.denuncias(comentario_id,autor_id,motivo) values(p_id,u,btrim(p_motivo));
end;$$;
create function comunidade_pcm.moderar(p_id uuid,p_aprovar boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid=comunidade_pcm.conta(false);c comunidade_pcm.comentarios;
begin
 if not public.catalogo_e_moderador() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 if p_aprovar is null then raise exception 'Informe a decisão.' using errcode='22023';end if;
 select * into c from comunidade_pcm.comentarios where id=p_id and situacao<>'retirado' for update;
 if not found then raise exception 'Comentário indisponível.' using errcode='22023';end if;
 if p_aprovar and c.resposta_a is not null then
  perform 1 from comunidade_pcm.comentarios where id=c.resposta_a and situacao='aprovado' for share;
  if not found then raise exception 'A pergunta original não está publicada.' using errcode='22023';end if;
 end if;
 update comunidade_pcm.comentarios set situacao=case when p_aprovar then 'aprovado' else 'oculto' end where id=p_id;
end;$$;
create function comunidade_pcm.denuncias_listar(p_pagina integer default 0)
returns table(id uuid,comentario_id uuid,codigo text,motivo text,texto text,criado_em timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare u uuid=comunidade_pcm.conta(false);
begin
 if not public.catalogo_e_moderador() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 if p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Página inválida.' using errcode='22023';end if;
 return query select d.id,d.comentario_id,c.codigo,d.motivo,c.texto,d.criado_em from comunidade_pcm.denuncias d join comunidade_pcm.comentarios c on c.id=d.comentario_id where d.situacao='aberta' order by d.criado_em,d.id offset p_pagina*20 limit 20;
end;$$;
create function comunidade_pcm.denuncia_resolver(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid=comunidade_pcm.conta(false);
begin
 if not public.catalogo_e_moderador() then raise exception 'Acesso restrito.' using errcode='42501';end if;
 update comunidade_pcm.denuncias set situacao='resolvida' where id=p_id;
 if not found then raise exception 'Denúncia indisponível.' using errcode='22023';end if;
end;$$;
create function comunidade_pcm.resumo() returns table(codigo text,comentarios bigint,atualizado_em timestamptz)
language sql stable security definer set search_path='' as $$
 select c.codigo,count(*),max(c.criado_em) from comunidade_pcm.comentarios c where comunidade_pcm.ativa() and c.situacao='aprovado' and
 (c.resposta_a is null or exists(select 1 from comunidade_pcm.comentarios pai where pai.id=c.resposta_a and pai.situacao='aprovado')) group by c.codigo;
$$;
create function public.comunidade_ativa() returns boolean language sql stable security invoker set search_path='' as $$ select * from comunidade_pcm.ativa(); $$;
create function public.comunidade_listar(p_codigo text,p_vista text default 'publicos',p_pagina integer default 0) returns table(id uuid,codigo text,resposta_a uuid,apelido text,texto text,situacao text,criado_em timestamptz,proprio boolean,publicado boolean) language sql stable security invoker set search_path='' as $$ select * from comunidade_pcm.listar(p_codigo,p_vista,p_pagina); $$;
create function public.comunidade_enviar(p_codigo text,p_apelido text,p_texto text,p_resposta_a uuid,p_nonce uuid) returns uuid language sql volatile security invoker set search_path='' as $$ select * from comunidade_pcm.enviar(p_codigo,p_apelido,p_texto,p_resposta_a,p_nonce); $$;
create function public.comunidade_retirar(p_id uuid) returns void language sql volatile security invoker set search_path='' as $$ select * from comunidade_pcm.retirar(p_id); $$;
create function public.comunidade_denunciar(p_id uuid,p_motivo text) returns void language sql volatile security invoker set search_path='' as $$ select * from comunidade_pcm.denunciar(p_id,p_motivo); $$;
create function public.comunidade_moderar(p_id uuid,p_aprovar boolean) returns void language sql volatile security invoker set search_path='' as $$ select * from comunidade_pcm.moderar(p_id,p_aprovar); $$;
create function public.comunidade_denuncias_listar(p_pagina integer default 0) returns table(id uuid,comentario_id uuid,codigo text,motivo text,texto text,criado_em timestamptz) language sql stable security invoker set search_path='' as $$ select * from comunidade_pcm.denuncias_listar(p_pagina); $$;
create function public.comunidade_denuncia_resolver(p_id uuid) returns void language sql volatile security invoker set search_path='' as $$ select * from comunidade_pcm.denuncia_resolver(p_id); $$;
create function public.comunidade_resumo() returns table(codigo text,comentarios bigint,atualizado_em timestamptz) language sql stable security invoker set search_path='' as $$ select * from comunidade_pcm.resumo(); $$;
revoke all on all functions in schema comunidade_pcm from public,anon,authenticated;
grant usage on schema comunidade_pcm to anon,authenticated;
revoke all on function public.comunidade_ativa() from public,anon,authenticated;
grant execute on function public.comunidade_ativa() to anon,authenticated;
grant execute on function comunidade_pcm.ativa() to anon,authenticated;
revoke all on function public.comunidade_listar(text,text,integer) from public,anon,authenticated;
grant execute on function public.comunidade_listar(text,text,integer) to anon,authenticated;
grant execute on function comunidade_pcm.listar(text,text,integer) to anon,authenticated;
revoke all on function public.comunidade_enviar(text,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.comunidade_enviar(text,text,text,uuid,uuid) to authenticated;
grant execute on function comunidade_pcm.enviar(text,text,text,uuid,uuid) to authenticated;
revoke all on function public.comunidade_retirar(uuid) from public,anon,authenticated;
grant execute on function public.comunidade_retirar(uuid) to authenticated;
grant execute on function comunidade_pcm.retirar(uuid) to authenticated;
revoke all on function public.comunidade_denunciar(uuid,text) from public,anon,authenticated;
grant execute on function public.comunidade_denunciar(uuid,text) to authenticated;
grant execute on function comunidade_pcm.denunciar(uuid,text) to authenticated;
revoke all on function public.comunidade_moderar(uuid,boolean) from public,anon,authenticated;
grant execute on function public.comunidade_moderar(uuid,boolean) to authenticated;
grant execute on function comunidade_pcm.moderar(uuid,boolean) to authenticated;
revoke all on function public.comunidade_denuncias_listar(integer) from public,anon,authenticated;
grant execute on function public.comunidade_denuncias_listar(integer) to authenticated;
grant execute on function comunidade_pcm.denuncias_listar(integer) to authenticated;
revoke all on function public.comunidade_denuncia_resolver(uuid) from public,anon,authenticated;
grant execute on function public.comunidade_denuncia_resolver(uuid) to authenticated;
grant execute on function comunidade_pcm.denuncia_resolver(uuid) to authenticated;
revoke all on function public.comunidade_resumo() from public,anon,authenticated;
grant execute on function public.comunidade_resumo() to anon,authenticated;
grant execute on function comunidade_pcm.resumo() to anon,authenticated;
commit;
