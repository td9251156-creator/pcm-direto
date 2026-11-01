-- Arquivos .xlsx/.docx da Biblioteca PCM v2 no Storage. Separado das tabelas para que o teste local (sem Storage) rode.
-- Caminho do objeto: <versao>/<arquivo>, ex.: 2.0.1/PCM-MAN-001_Controle-Documental_R00.xlsx.
-- Leitura pública só da versão publicada; envio só por moderador e só para versão em desenvolvimento, com o nome registrado.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('biblioteca-v2', 'biblioteca-v2', false, 20000000, array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

create policy biblioteca_arquivo_envio on storage.objects for insert to authenticated
with check (bucket_id = 'biblioteca-v2' and public.catalogo_e_moderador() and exists (
  select 1 from public.biblioteca_modelos m join public.biblioteca_versoes v on v.id = m.versao_id
  where v.situacao = 'desenvolvimento' and name = v.versao || '/' || m.arquivo
));
create policy biblioteca_arquivo_leitura on storage.objects for select to anon, authenticated
using (bucket_id = 'biblioteca-v2' and exists (
  select 1 from public.biblioteca_modelos m join public.biblioteca_versoes v on v.id = m.versao_id
  where name = v.versao || '/' || m.arquivo and (v.situacao = 'publicada' or public.catalogo_e_moderador())
));
-- Sem UPDATE/DELETE: bytes enviados não mudam; o app confere o SHA-256 registrado antes de usar o arquivo.

commit;
