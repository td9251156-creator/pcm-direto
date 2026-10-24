-- A visão respeita RLS; uma função privada divulga somente agregados de modelos aprovados.
begin;
create function catalogo_privado.contar_interacoes(p_id uuid)
returns table(curtidas bigint, comentarios bigint)
language sql stable security definer set search_path='' as $$
 select
  (select count(*) from public.catalogo_curtidas c where c.modelo_id=p_id),
  (select count(*) from public.catalogo_comentarios c where c.modelo_id=p_id and c.situacao='aprovado')
 where exists(select 1 from public.catalogo_modelos m where m.id=p_id and m.situacao='aprovado');
$$;
revoke all on function catalogo_privado.contar_interacoes(uuid) from public;
grant usage on schema catalogo_privado to anon,authenticated;
grant execute on function catalogo_privado.contar_interacoes(uuid) to anon,authenticated;
create or replace view public.catalogo_interacoes with(security_invoker=true) as
select m.id as modelo_id,c.curtidas,c.comentarios
from public.catalogo_modelos m
cross join lateral catalogo_privado.contar_interacoes(m.id) c
where m.situacao='aprovado';
commit;
