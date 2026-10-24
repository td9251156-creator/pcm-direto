-- Somente conhecimento público. Não armazena dados da fábrica.
begin;
create table public.catalogo_curtidas (
  modelo_id uuid not null references public.catalogo_modelos(id),
  autor_id uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  primary key(modelo_id,autor_id)
);
create table public.catalogo_comentarios (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.catalogo_modelos(id),
  autor_id uuid not null references auth.users(id),
  apelido text not null check(length(btrim(apelido)) between 1 and 60),
  texto text not null check(length(btrim(texto)) between 1 and 2000),
  situacao text not null default 'pendente' check(situacao in ('pendente','aprovado','oculto')),
  criado_em timestamptz not null default now()
);
create table public.catalogo_denuncias (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.catalogo_modelos(id),
  autor_id uuid not null references auth.users(id),
  motivo text not null check(length(btrim(motivo)) between 1 and 2000),
  situacao text not null default 'aberta' check(situacao in ('aberta','resolvida')),
  criado_em timestamptz not null default now(),
  unique(modelo_id,autor_id)
);
alter table public.catalogo_curtidas enable row level security;
alter table public.catalogo_comentarios enable row level security;
alter table public.catalogo_denuncias enable row level security;
revoke all on public.catalogo_curtidas,public.catalogo_comentarios,public.catalogo_denuncias from public,anon,authenticated;
grant select on public.catalogo_curtidas to authenticated;
grant select on public.catalogo_comentarios to anon,authenticated;
grant select on public.catalogo_denuncias to authenticated;
create policy curtidas_proprias on public.catalogo_curtidas for select to authenticated using(autor_id=auth.uid());
create policy comentarios_visiveis on public.catalogo_comentarios for select using(
  (situacao='aprovado' and exists(select 1 from public.catalogo_modelos m where m.id=modelo_id and m.situacao='aprovado'))
  or autor_id=auth.uid() or public.catalogo_e_moderador()
);
create policy denuncias_privadas on public.catalogo_denuncias for select to authenticated using(autor_id=auth.uid() or public.catalogo_e_moderador());
create index comentarios_modelo on public.catalogo_comentarios(modelo_id,criado_em);
create index comentarios_autor on public.catalogo_comentarios(autor_id,criado_em);

-- Contagem pública não expõe as identidades de quem curtiu.
create view public.catalogo_interacoes as
select m.id as modelo_id,
 (select count(*) from public.catalogo_curtidas c where c.modelo_id=m.id) as curtidas,
 (select count(*) from public.catalogo_comentarios c where c.modelo_id=m.id and c.situacao='aprovado') as comentarios
from public.catalogo_modelos m where m.situacao='aprovado';
grant select on public.catalogo_interacoes to anon,authenticated;

create function public.catalogo_curtir(p_id uuid,p_curtir boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre para curtir.' using errcode='42501'; end if;
 if not exists(select 1 from public.catalogo_modelos where id=p_id and situacao='aprovado') then raise exception 'Modelo indisponível.' using errcode='42501'; end if;
 if p_curtir is null then raise exception 'Informe a ação.' using errcode='22023'; end if;
 if p_curtir then insert into public.catalogo_curtidas(modelo_id,autor_id) values(p_id,auth.uid()) on conflict do nothing;
 else delete from public.catalogo_curtidas where modelo_id=p_id and autor_id=auth.uid(); end if;
end; $$;
create function public.catalogo_comentar(p_id uuid,p_texto text,p_apelido text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Entre para comentar.' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,1));
 if not exists(select 1 from public.catalogo_modelos where id=p_id and situacao='aprovado') then raise exception 'Modelo indisponível.' using errcode='42501'; end if;
 if p_texto is null or pg_catalog.length(pg_catalog.btrim(p_texto)) not between 1 and 2000 or p_apelido is null or pg_catalog.length(pg_catalog.btrim(p_apelido)) not between 1 and 60 then raise exception 'Confira comentário e apelido.' using errcode='22023'; end if;
 if (select count(*) from public.catalogo_comentarios where autor_id=auth.uid() and criado_em>pg_catalog.now()-interval '1 hour')>=10 then raise exception 'Limite de comentários por hora atingido.' using errcode='54000'; end if;
 insert into public.catalogo_comentarios(modelo_id,autor_id,apelido,texto) values(p_id,auth.uid(),pg_catalog.btrim(p_apelido),pg_catalog.btrim(p_texto)) returning id into v_id;
 return v_id;
end; $$;
create function public.catalogo_denunciar(p_id uuid,p_motivo text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre para denunciar.' using errcode='42501'; end if;
 if not exists(select 1 from public.catalogo_modelos where id=p_id and situacao='aprovado') then raise exception 'Modelo indisponível.' using errcode='42501'; end if;
 if p_motivo is null or pg_catalog.length(pg_catalog.btrim(p_motivo)) not between 1 and 2000 then raise exception 'Informe o motivo.' using errcode='22023'; end if;
 insert into public.catalogo_denuncias(modelo_id,autor_id,motivo) values(p_id,auth.uid(),pg_catalog.btrim(p_motivo)) on conflict(modelo_id,autor_id) do nothing;
end; $$;
create function public.catalogo_moderar_comentario(p_id uuid,p_aprovar boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.catalogo_e_moderador() then raise exception 'Acesso restrito à moderação.' using errcode='42501'; end if;
 if p_aprovar is null then raise exception 'Informe a decisão.' using errcode='22023'; end if;
 update public.catalogo_comentarios set situacao=case when p_aprovar then 'aprovado' else 'oculto' end where id=p_id;
end; $$;
create function public.catalogo_resolver_denuncia(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.catalogo_e_moderador() then raise exception 'Acesso restrito à moderação.' using errcode='42501'; end if;
 update public.catalogo_denuncias set situacao='resolvida' where id=p_id;
end; $$;
revoke all on function public.catalogo_curtir(uuid,boolean),public.catalogo_comentar(uuid,text,text),public.catalogo_denunciar(uuid,text),public.catalogo_moderar_comentario(uuid,boolean),public.catalogo_resolver_denuncia(uuid) from public,anon;
grant execute on function public.catalogo_curtir(uuid,boolean),public.catalogo_comentar(uuid,text,text),public.catalogo_denunciar(uuid,text),public.catalogo_moderar_comentario(uuid,boolean),public.catalogo_resolver_denuncia(uuid) to authenticated;
commit;
