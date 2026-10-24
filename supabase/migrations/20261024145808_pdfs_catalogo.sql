-- PDFs comunitários: arquivo imutável, validação no servidor e decisão da revisão lida.
begin;
alter table public.catalogo_modelos
  add column conteudo_versao bigint not null default 1,
  add column pdf_reserva text unique,
  add column pdf_caminho text,
  add column pdf_sha256 text,
  add column pdf_tamanho integer,
  add constraint catalogo_pdf_completo check (
    (pdf_caminho is null and pdf_sha256 is null and pdf_tamanho is null) or
    (pdf_caminho is not null and pdf_reserva is not null and pdf_caminho = pdf_reserva
      and pdf_sha256 is not null and pdf_sha256 ~ '^[0-9a-f]{64}$'
      and pdf_tamanho is not null and pdf_tamanho between 1 and 5000000)
  );

create function catalogo_privado.versionar_conteudo()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.situacao='pendente' and new.pdf_reserva is not null and new.pdf_caminho is null then
    raise exception 'Conclua a validação do PDF antes de enviar.' using errcode='22023';
  end if;
  if row(new.dados,new.situacao,new.pdf_reserva,new.pdf_caminho,new.pdf_sha256)
    is distinct from row(old.dados,old.situacao,old.pdf_reserva,old.pdf_caminho,old.pdf_sha256) then
    new.conteudo_versao := old.conteudo_versao + 1;
  else new.conteudo_versao := old.conteudo_versao;
  end if;
  return new;
end;
$$;
revoke all on function catalogo_privado.versionar_conteudo() from public,anon,authenticated;
create trigger catalogo_conteudo_versao before update on public.catalogo_modelos
  for each row execute function catalogo_privado.versionar_conteudo();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogo-pdfs','catalogo-pdfs',false,5000000,array['application/pdf']);

create policy catalogo_pdf_upload on storage.objects for insert to authenticated
with check (bucket_id='catalogo-pdfs' and exists (
  select 1 from public.catalogo_modelos m where m.pdf_reserva=name and m.autor_id=(select auth.uid())
    and m.situacao in ('rascunho','rejeitado') and m.pdf_caminho is null
));
create policy catalogo_pdf_leitura on storage.objects for select to anon,authenticated
using (bucket_id='catalogo-pdfs'
  and storage.allow_any_operation(array['object.get_authenticated_info','object.get_authenticated']) and exists (
  select 1 from public.catalogo_modelos m where m.pdf_reserva=name and (
    m.autor_id=(select auth.uid()) or
    (m.pdf_caminho=name and (m.situacao='aprovado' or public.catalogo_e_moderador()))
  )
));
-- Sem UPDATE/DELETE: nem o autor pode trocar os bytes já enviados.

create function public.catalogo_reservar_pdf(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.catalogo_modelos%rowtype; v_autor uuid := auth.uid();
begin
  if v_autor is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
  select * into v from public.catalogo_modelos where id=p_id for update;
  if not found or v.autor_id<>v_autor or v.situacao not in ('rascunho','rejeitado') then
    raise exception 'Crie uma nova versão para anexar outro PDF.' using errcode='42501';
  end if;
  if v.pdf_caminho is not null then
    return pg_catalog.jsonb_build_object('caminho',v.pdf_caminho,'sha256',v.pdf_sha256,'tamanho',v.pdf_tamanho,'validado',true);
  end if;
  if v.pdf_reserva is null then
    update public.catalogo_modelos set pdf_reserva=v_autor::text || '/' || p_id::text || '/' || pg_catalog.gen_random_uuid()::text || '.pdf',
      atualizado_em=pg_catalog.now() where id=p_id returning * into v;
  end if;
  return pg_catalog.jsonb_build_object('caminho',v.pdf_reserva,'versao',v.conteudo_versao);
end;
$$;
revoke all on function public.catalogo_reservar_pdf(uuid) from public,anon;
grant execute on function public.catalogo_reservar_pdf(uuid) to authenticated;

-- Somente o finalizador confiável chama esta função após autenticar o usuário e ler o PDF.
create function public.catalogo_vincular_pdf(p_id uuid,p_autor uuid,p_versao bigint,p_sha256 text,p_tamanho integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.catalogo_modelos%rowtype;
begin
  select * into v from public.catalogo_modelos where id=p_id for update;
  if not found or v.autor_id is distinct from p_autor then
    raise exception 'Arquivo indisponível.' using errcode='42501';
  end if;
  if v.pdf_caminho is not null and v.pdf_sha256=p_sha256 then
    return pg_catalog.jsonb_build_object('caminho',v.pdf_caminho,'sha256',v.pdf_sha256,'tamanho',v.pdf_tamanho);
  end if;
  if v.situacao not in ('rascunho','rejeitado') or v.pdf_caminho is not null or v.pdf_reserva is null
    or v.conteudo_versao is distinct from p_versao then
    raise exception 'O modelo mudou. Abra o rascunho novamente.' using errcode='40001';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' or p_tamanho is null or p_tamanho not between 1 and 5000000
    or not exists(select 1 from storage.objects where bucket_id='catalogo-pdfs' and name=v.pdf_reserva) then
    raise exception 'PDF inválido ou ausente.' using errcode='22023';
  end if;
  update public.catalogo_modelos set pdf_caminho=pdf_reserva,pdf_sha256=p_sha256,pdf_tamanho=p_tamanho,
    atualizado_em=pg_catalog.now() where id=p_id returning * into v;
  return pg_catalog.jsonb_build_object('caminho',v.pdf_caminho,'sha256',v.pdf_sha256,'tamanho',v.pdf_tamanho);
end;
$$;
revoke all on function public.catalogo_vincular_pdf(uuid,uuid,bigint,text,integer) from public,anon,authenticated;
grant execute on function public.catalogo_vincular_pdf(uuid,uuid,bigint,text,integer) to service_role;

-- Remove a assinatura antiga para não deixar uma aprovação alternativa sem versão.
drop function public.catalogo_decidir(uuid,boolean,text);
create function public.catalogo_decidir(p_id uuid,p_aprovar boolean,p_motivo text default '',p_versao bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.catalogo_modelos%rowtype;
begin
  if auth.uid() is null or not public.catalogo_e_moderador() then
    raise exception 'Somente a moderação pode decidir.' using errcode='42501';
  end if;
  if p_aprovar is null or p_motivo is null or pg_catalog.length(p_motivo)>2000
    or (not p_aprovar and pg_catalog.length(pg_catalog.btrim(p_motivo))=0) then
    raise exception 'Informe o parecer.' using errcode='22023';
  end if;
  select * into v from public.catalogo_modelos where id=p_id for update;
  if not found or v.situacao<>'pendente' then raise exception 'Modelo fora da revisão.' using errcode='22023'; end if;
  if (p_versao is not null and v.conteudo_versao<>p_versao) or (v.pdf_reserva is not null and p_versao is null) then
    raise exception 'O conteúdo mudou. Confira a versão atual.' using errcode='40001';
  end if;
  if p_aprovar and v.pdf_reserva is not null and v.pdf_caminho is null then
    raise exception 'O PDF ainda não foi validado.' using errcode='22023';
  end if;
  update public.catalogo_modelos set situacao=case when p_aprovar then 'aprovado' else 'rejeitado' end,
    motivo=case when p_aprovar then '' else pg_catalog.btrim(p_motivo) end,
    revisado_por=auth.uid(),atualizado_em=pg_catalog.now() where id=p_id;
end;
$$;
revoke all on function public.catalogo_decidir(uuid,boolean,text,bigint) from public,anon;
grant execute on function public.catalogo_decidir(uuid,boolean,text,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
