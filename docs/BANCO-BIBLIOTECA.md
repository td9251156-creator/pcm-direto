# Banco da Biblioteca PCM v2 (Supabase)

Modelo pronto para guardar a Biblioteca PCM v2 (modelos PCM-MAN-001 a 019) no mesmo projeto Supabase do catálogo
da comunidade. **Nada foi aplicado no ambiente online.** O app continua usando os arquivos em
`public/modelos/biblioteca-v2/` e o manifesto `src/dados/biblioteca-pcm-v2.json`; o banco é o próximo passo para
atualizar a biblioteca sem nova versão do app.

## O que é guardado
Só metadados públicos dos modelos e os próprios arquivos. Nenhum dado de fábrica, pessoa ou operação.

| Objeto | Para que serve |
|---|---|
| `biblioteca_versoes` | Versões da biblioteca (ex.: 2.0.1): `desenvolvimento`, `publicada` (no máximo uma) ou `retirada` |
| `biblioteca_modelos` | Um modelo por versão: código, título, grupo, formato, revisão (R00), arquivo, SHA-256, tamanho e estrutura (abas, tabelas, campos) |
| `biblioteca_campos` (visão) | Estrutura em linhas: modelo, aba, tabela `tb_pcm_...`, intervalo, linha de dados, campo e ordem |
| Storage `biblioteca-v2` | Arquivos em `<versão>/<arquivo>`; leitura só da versão publicada; sem troca nem exclusão de bytes |

Regras de segurança:
- Visitantes leem apenas a versão publicada.
- Alterações só por moderadores (tabela `catalogo_moderadores`), pelas funções `biblioteca_criar_versao`,
  `biblioteca_registrar_modelo` e `biblioteca_publicar_versao`. Não há escrita direta nas tabelas.
- Uma versão só é publicada com os 19 modelos. Depois de publicada ela fica imutável: corrigir exige versão nova.
- O app deve conferir o SHA-256 registrado antes de usar um arquivo baixado.

## Arquivos
- `supabase/migrations/20261101120000_biblioteca_v2.sql`: tabelas, visão, RLS e funções.
- `supabase/migrations/20261101120100_biblioteca_v2_arquivos.sql`: bucket e regras do Storage.
- `supabase/carga/biblioteca_v2.sql`: carga dos 19 modelos atuais como versão **em desenvolvimento**, gerada por
  `node scripts/gerar-carga-biblioteca.mjs` (rode de novo sempre que o manifesto mudar; um teste confere).
- `supabase/testes/biblioteca.sql`: teste em Postgres descartável (carga, RLS, funções, publicação e imutabilidade).

## Como aplicar (somente com autorização do mantenedor)
1. Teste local em Postgres descartável vazio: `psql -v ON_ERROR_STOP=1 -f supabase/testes/biblioteca.sql`.
   Não foi executado nesta máquina (não há Postgres instalado).
2. No Supabase: rode as duas migrações e a carga no SQL Editor (ou `supabase db push`), como administrador.
3. Envie os 19 arquivos para `biblioteca-v2/2.0.1/` com um usuário moderador.
4. Publique com `select public.biblioteca_publicar_versao('2.0.1');`, somente quando os modelos saírem do desenvolvimento.

## Próximos passos no app (não implementados)
- Ler a versão publicada (`biblioteca_modelos`) e oferecer a atualização da biblioteca, com conferência do SHA-256 e
  cópia offline; sem rede, continuar com os arquivos embutidos.
- Gerar o manifesto local a partir do banco, para que preenchimento e importação usem a mesma estrutura.
