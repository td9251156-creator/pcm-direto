-- Biblioteca PCM v2 (modelos PCM-MAN) no banco: versões, modelos e estrutura (abas, tabelas e campos).
-- Só metadados públicos dos modelos; nenhum dado operacional de fábrica entra aqui.
-- Leitura pública apenas da versão publicada; escrita só por moderadores (catalogo_moderadores), por funções.
-- Depende de 202610230001_catalogo.sql (public.catalogo_e_moderador). Execute como administrador.
begin;

create schema if not exists biblioteca_privado;
revoke all on schema biblioteca_privado from public, anon, authenticated;

create table public.biblioteca_versoes (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  versao text not null unique check (versao ~ '^\d+\.\d+\.\d+$'),
  situacao text not null default 'desenvolvimento' check (situacao in ('desenvolvimento', 'publicada', 'retirada')),
  notas text not null default '' check (pg_catalog.length(notas) <= 4000),
  criada_em timestamptz not null default pg_catalog.now(),
  publicada_em timestamptz,
  publicada_por uuid references auth.users(id),
  check ((situacao = 'desenvolvimento') = (publicada_em is null))
);
-- No máximo uma versão publicada por vez: é a que o app e o site oferecem.
create unique index biblioteca_uma_publicada on public.biblioteca_versoes ((true)) where situacao = 'publicada';

create table public.biblioteca_modelos (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  versao_id uuid not null references public.biblioteca_versoes(id) on delete restrict,
  codigo text not null check (codigo ~ '^PCM-MAN-\d{3}$'),
  titulo text not null check (pg_catalog.length(titulo) between 1 and 160),
  grupo text not null default 'Documentação' check (pg_catalog.length(grupo) between 1 and 60),
  formato text not null check (formato in ('xlsx', 'docx')),
  revisao text not null check (revisao ~ '^R\d{2}$'),
  arquivo text not null check (arquivo ~ '^PCM-MAN-\d{3}_[A-Za-z0-9-]+_R\d{2}\.(xlsx|docx)$'),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes integer not null check (bytes between 1 and 20000000),
  -- Abas, tabelas (tb_pcm_...), intervalos, linha de dados e campos, como no manifesto do app.
  estrutura jsonb not null default '[]'::jsonb check (pg_catalog.jsonb_typeof(estrutura) = 'array'),
  criado_em timestamptz not null default pg_catalog.now(),
  unique (versao_id, codigo),
  check (pg_catalog.left(arquivo, 12) = codigo || '_' and pg_catalog.right(arquivo, 4) = formato)
);
create index biblioteca_modelos_codigo on public.biblioteca_modelos (codigo, versao_id);

-- Campos de cada tabela, em linhas, para o app e para conferências (ex.: "quais modelos têm o campo tag?").
create view public.biblioteca_campos with (security_invoker = true) as
  select m.versao_id, m.codigo, aba->>'nome' as aba, tab->>'nome' as tabela, tab->>'intervalo' as intervalo,
    (tab->>'linhaDados')::integer as linha_dados, campo.valor as campo, campo.ordem::integer as ordem
  from public.biblioteca_modelos m
  cross join lateral pg_catalog.jsonb_array_elements(m.estrutura) aba
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(aba->'tabelas', '[]'::jsonb)) tab
  cross join lateral pg_catalog.jsonb_array_elements_text(coalesce(tab->'campos', '[]'::jsonb)) with ordinality campo(valor, ordem);

alter table public.biblioteca_versoes enable row level security;
alter table public.biblioteca_modelos enable row level security;
revoke all on public.biblioteca_versoes, public.biblioteca_modelos from public, anon, authenticated;
revoke all on public.biblioteca_campos from public, anon, authenticated;
grant select on public.biblioteca_versoes, public.biblioteca_modelos, public.biblioteca_campos to anon, authenticated;

create policy versoes_publicas on public.biblioteca_versoes for select to anon using (situacao = 'publicada');
create policy versoes_autenticadas on public.biblioteca_versoes for select to authenticated
  using (situacao = 'publicada' or public.catalogo_e_moderador());
create policy modelos_publicos on public.biblioteca_modelos for select to anon
  using (exists (select 1 from public.biblioteca_versoes v where v.id = versao_id and v.situacao = 'publicada'));
create policy modelos_autenticados on public.biblioteca_modelos for select to authenticated
  using (public.catalogo_e_moderador() or exists (select 1 from public.biblioteca_versoes v where v.id = versao_id and v.situacao = 'publicada'));

-- Versão publicada ou retirada é imutável: corrigir um modelo exige uma versão nova.
create function biblioteca_privado.proteger_versao_fechada()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.biblioteca_versoes v where v.id = coalesce(old.versao_id, new.versao_id) and v.situacao <> 'desenvolvimento') then
    raise exception 'A versão já foi publicada ou retirada: crie uma versão nova para alterar modelos.';
  end if;
  return coalesce(new, old);
end $$;
create trigger biblioteca_modelos_fechados before insert or update or delete on public.biblioteca_modelos
  for each row execute function biblioteca_privado.proteger_versao_fechada();

/** Cria (ou devolve) uma versão em desenvolvimento. Só moderador. */
create function public.biblioteca_criar_versao(p_versao text, p_notas text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.catalogo_e_moderador() then raise exception 'Somente moderadores alteram a biblioteca.'; end if;
  select id into v_id from public.biblioteca_versoes where versao = p_versao;
  if v_id is not null then
    if (select situacao from public.biblioteca_versoes where id = v_id) <> 'desenvolvimento' then
      raise exception 'A versão % já foi publicada ou retirada.', p_versao;
    end if;
    return v_id;
  end if;
  insert into public.biblioteca_versoes (versao, notas) values (p_versao, coalesce(p_notas, '')) returning id into v_id;
  return v_id;
end $$;

/** Grava ou substitui um modelo numa versão em desenvolvimento. p_dados segue o formato do manifesto do app. */
create function public.biblioteca_registrar_modelo(p_versao text, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_versao uuid; v_id uuid; v_arquivo text := p_dados->>'arquivo';
begin
  if not public.catalogo_e_moderador() then raise exception 'Somente moderadores alteram a biblioteca.'; end if;
  select id into v_versao from public.biblioteca_versoes where versao = p_versao and situacao = 'desenvolvimento';
  if v_versao is null then raise exception 'Versão % inexistente ou já fechada.', p_versao; end if;
  insert into public.biblioteca_modelos (versao_id, codigo, titulo, grupo, formato, revisao, arquivo, sha256, bytes, estrutura)
  values (v_versao, p_dados->>'codigo', p_dados->>'titulo', coalesce(p_dados->>'grupo', 'Documentação'), p_dados->>'formato',
    pg_catalog.substring(v_arquivo from '_(R\d{2})\.'), v_arquivo, pg_catalog.lower(p_dados->>'sha256'), (p_dados->>'bytes')::integer,
    coalesce(p_dados->'abas', '[]'::jsonb))
  on conflict (versao_id, codigo) do update set titulo = excluded.titulo, grupo = excluded.grupo, formato = excluded.formato,
    revisao = excluded.revisao, arquivo = excluded.arquivo, sha256 = excluded.sha256, bytes = excluded.bytes, estrutura = excluded.estrutura
  returning id into v_id;
  return v_id;
end $$;

/** Publica uma versão completa (PCM-MAN-001 a 019) e retira a publicada anterior. */
create function public.biblioteca_publicar_versao(p_versao text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_faltam text;
begin
  if not public.catalogo_e_moderador() then raise exception 'Somente moderadores publicam a biblioteca.'; end if;
  select id into v_id from public.biblioteca_versoes where versao = p_versao and situacao = 'desenvolvimento' for update;
  if v_id is null then raise exception 'Versão % inexistente ou já fechada.', p_versao; end if;
  select pg_catalog.string_agg(c, ', ') into v_faltam from (
    select 'PCM-MAN-' || pg_catalog.lpad(n::text, 3, '0') as c from pg_catalog.generate_series(1, 19) n
    except select codigo from public.biblioteca_modelos where versao_id = v_id order by 1) f;
  if v_faltam is not null then raise exception 'Faltam modelos para publicar: %.', v_faltam; end if;
  update public.biblioteca_versoes set situacao = 'retirada' where situacao = 'publicada';
  update public.biblioteca_versoes set situacao = 'publicada', publicada_em = pg_catalog.now(), publicada_por = auth.uid() where id = v_id;
end $$;

revoke all on function public.biblioteca_criar_versao(text, text), public.biblioteca_registrar_modelo(text, jsonb),
  public.biblioteca_publicar_versao(text) from public, anon;
grant execute on function public.biblioteca_criar_versao(text, text), public.biblioteca_registrar_modelo(text, jsonb),
  public.biblioteca_publicar_versao(text) to authenticated;

commit;
