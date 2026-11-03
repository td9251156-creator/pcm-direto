-- Diagnóstico somente leitura, para administrador: não cria contas nem grava modelos.
-- Cada categoria oferecida em src/logica/catalogo.js deve retornar aceito=true.
-- Não executar supabase/testes/*.sql no projeto real: esses arquivos são para bancos descartáveis.
select tipo,
  catalogo_privado.dados_validos(jsonb_build_object(
    'titulo','Verificação fictícia sem gravação',
    'tipo_base',tipo,
    'fabricante','','modelo','','descricao','Somente validação de contrato',
    'caracteristicas','','apelido','','tarefas','[]'::jsonb
  )) as aceito
from unnest(array[
  'motor_eletrico','compressor_ar','bomba_centrifuga','ponte_rolante',
  'transportador_correia','ventilador_exaustor','unidade_hidraulica','outro'
]) as tipo;
