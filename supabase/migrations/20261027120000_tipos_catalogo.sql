-- Amplia somente os tipos aceitos; preserva as demais validações do catálogo.
begin;

create or replace function catalogo_privado.dados_validos(p_dados jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_tarefa jsonb;
begin
  if pg_catalog.jsonb_typeof(p_dados) is distinct from 'object' then return false; end if;
  if not (p_dados ?& array['titulo','tipo_base','fabricante','modelo','descricao','caracteristicas','apelido','tarefas'])
    or (p_dados - array['titulo','tipo_base','fabricante','modelo','descricao','caracteristicas','apelido','tarefas']) <> '{}'::jsonb then return false; end if;
  if not catalogo_privado.texto_valido(p_dados->'titulo',120,true)
    or not catalogo_privado.texto_valido(p_dados->'tipo_base',80,true)
    or not (p_dados->>'tipo_base' = any(array['motor_eletrico','compressor_ar','bomba_centrifuga','ponte_rolante','transportador_correia','ventilador_exaustor','unidade_hidraulica','outro']))
    or not catalogo_privado.texto_valido(p_dados->'fabricante',120)
    or not catalogo_privado.texto_valido(p_dados->'modelo',120)
    or not catalogo_privado.texto_valido(p_dados->'descricao',2000,true)
    or not catalogo_privado.texto_valido(p_dados->'caracteristicas',4000)
    or not catalogo_privado.texto_valido(p_dados->'apelido',60)
    or pg_catalog.jsonb_typeof(p_dados->'tarefas') is distinct from 'array' then return false; end if;
  if pg_catalog.jsonb_array_length(p_dados->'tarefas') > 50 then return false; end if;
  for v_tarefa in select value from pg_catalog.jsonb_array_elements(p_dados->'tarefas') loop
    if pg_catalog.jsonb_typeof(v_tarefa) is distinct from 'object' then return false; end if;
    if not (v_tarefa ?& array['descricao','periodicidade','especialidade','duracao_horas','seguranca','origem','versao','observacao'])
      or (v_tarefa - array['descricao','periodicidade','especialidade','duracao_horas','seguranca','origem','versao','observacao']) <> '{}'::jsonb then return false; end if;
    if not catalogo_privado.texto_valido(v_tarefa->'descricao',2000,true)
      or not catalogo_privado.texto_valido(v_tarefa->'periodicidade',80,true)
      or not (v_tarefa->>'periodicidade' = any(array['Diária','Semanal','Quinzenal','Mensal','Bimestral','Trimestral','Semestral','Anual']))
      or not catalogo_privado.texto_valido(v_tarefa->'especialidade',120,true)
      or pg_catalog.jsonb_typeof(v_tarefa->'duracao_horas') is distinct from 'number'
      or pg_catalog.jsonb_typeof(v_tarefa->'seguranca') is distinct from 'boolean'
      or not catalogo_privado.texto_valido(v_tarefa->'origem',500,true)
      or not catalogo_privado.texto_valido(v_tarefa->'versao',80,true)
      or not catalogo_privado.texto_valido(v_tarefa->'observacao',2000) then return false; end if;
    if (v_tarefa->>'duracao_horas')::numeric <= 0 or (v_tarefa->>'duracao_horas')::numeric > 1000 then return false; end if;
  end loop;
  return true;
exception when others then
  return false;
end;
$$;

commit;
