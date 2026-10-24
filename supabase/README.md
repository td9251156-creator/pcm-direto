# Banco do catálogo colaborativo

A migração cria somente o catálogo de modelos compartilháveis. Equipamentos específicos, TAGs,
registros de falhas, pessoas da fábrica e backups locais não entram neste banco.

## Aplicação

No SQL Editor do projeto Supabase, execute `migrations/202610230001_catalogo.sql` uma única vez.
Depois aplique `migrations/202610240002_interacoes.sql` para curtidas, comentários e denúncias,
e `migrations/202610240003_contagens.sql` para a visão com RLS e agregação privada.
No projeto do mantenedor essas estruturas já foram conferidas em 24/10/2026;
não repetir migrações em banco existente sem inspecionar tabelas e histórico primeiro.
Habilite a autenticação por e-mail no painel e configure os endereços de retorno do aplicativo.
Depois que o mantenedor criar sua conta, copie o UUID dela em Authentication → Users e execute,
como administrador, substituindo o UUID fictício:

```sql
insert into public.catalogo_moderadores(user_id)
values ('00000000-0000-0000-0000-000000000000');
```

Não conceda `service_role` ao navegador. As chaves públicas do Supabase não permitem escrita
direta: autores e moderadores usam as funções abaixo, com identidade conferida no banco.

## Contratos

- Tabela `catalogo_modelos`: `id`, `autor_id`, `original_id`, `dados`, `situacao`, `motivo`,
  `revisado_por`, `criado_em`, `atualizado_em`.
- `dados` contém exatamente `titulo`, `tipo_base`, `fabricante`, `modelo`, `descricao`,
  `caracteristicas`, `apelido` e `tarefas`. Textos opcionais são strings vazias; tarefas podem ser `[]`.
- `tipo_base`: `motor_eletrico`, `compressor_ar`, `bomba_centrifuga`, `ponte_rolante` ou `outro`.
- Cada tarefa contém exatamente `descricao`, `periodicidade`, `especialidade`, `duracao_horas`,
  `seguranca`, `origem`, `versao` e `observacao`.
- `catalogo_salvar(p_dados jsonb, p_id uuid = null, p_original_id uuid = null) → uuid`.
- `catalogo_enviar(p_id uuid) → void`.
- `catalogo_decidir(p_id uuid, p_aprovar boolean, p_motivo text = '', p_versao bigint = null) → void`. A versão lida é obrigatória para modelos com PDF.
- `catalogo_retirar(p_id uuid) → void`: pendente volta a rascunho; demais ficam arquivados.
- `catalogo_e_moderador() → boolean`: informa somente se a conta atual é moderadora.

Anônimos leem apenas aprovados. Autores leem também seus modelos. Moderadores veem a fila.
Modelos aprovados não podem ser editados: uma alteração cria nova versão e nova revisão.
Arquivar uma versão pública não altera as cópias locais que outras pessoas já fizeram.
Há limite de 100 modelos ativos e cinco envios pendentes por conta. Isso não é teto de custos
nem substitui limites de autenticação, monitoramento e configuração da conta do provedor.

Interações usam RPCs `catalogo_curtir`, `catalogo_comentar`, `catalogo_denunciar`,
`catalogo_moderar_comentario` e `catalogo_resolver_denuncia`. Não há escrita direta nas tabelas.
Comentários começam pendentes e têm limite de dez por hora por usuário. Denúncias só podem ser
lidas pelo autor ou moderadores. A visão `catalogo_interacoes` divulga apenas contagens de modelos
aprovados; ela deliberadamente agrega curtidas sem expor os autores. A chave pública não substitui
RLS. Não desative as políticas para resolver falhas de login.

## Teste em Postgres descartável

Com Node.js e Docker local disponíveis, execute na raiz do repositório:

```sh
docker pull postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb
node scripts/verificar-catalogo-banco.mjs
```

O runner exige essa imagem previamente baixada, cria um container sem rede nem portas
publicadas, monta `supabase` somente para leitura e remove o container e seus volumes ao
terminar. A autenticação `trust` é exclusiva desse banco descartável, sem dados reais.
O comando termina com erro se Docker, inicialização, SQL ou limpeza falharem.

`testes/catalogo.sql` exige um banco vazio e recusa bancos com `auth.users`. Ele cria um substituto
mínimo da autenticação e carrega a migração. **Nunca executar esse teste em projeto Supabase real.**

```sh
psql -v ON_ERROR_STOP=1 -f supabase/testes/catalogo.sql
```

O teste usa três identidades fictícias, troca os papéis `anon`/`authenticated`, verifica RLS e
chama as funções reais. Os dados de teste são revertidos ao terminar. O esquema permanece
no banco descartável para inspeção. Validação de login por e-mail ainda exige projeto configurado.

## PDFs comunitários

A migração `20261024145808_pdfs_catalogo.sql` acrescenta metadados fora de `dados` e cria
o bucket privado `catalogo-pdfs` (5.000.000 bytes, application/pdf). Uma reserva por modelo
gera caminho próprio; clientes não podem sobrescrever ou apagar o arquivo. SELECT aceita
somente as operações GET/HEAD do Storage, com autoria, moderação ou publicação aprovada.
Não permite listagem nem URLs assinadas. Arquivar revoga novas leituras públicas.

`catalogo-finalizar-pdf` deve ser implantada com `verify_jwt=true`, a partir de `functions/`.
Ela chama getUser, deriva o caminho do modelo, abre o PDF com pdf-lib 1.17.1, recusa senha,
limita a 200 páginas e confere SHA256. O cliente administrativo separado chama
`catalogo_vincular_pdf`, cuja execução é exclusiva de service_role. Não aceite caminho ou URL
do cliente. As chaves administrativas vêm das variáveis padrão do Supabase, sem novas chaves
no código do site. O parser confere estrutura; não faz análise antivírus.

`catalogo_reservar_pdf` e o finalizador permitem retomar uma resposta perdida pelo hash.
Uma seleção diferente exige arquivar e criar uma nova versão; o arquivo antigo é preservado.
Reservas sem vínculo permanecem ligadas ao rascunho para retomada, sem limpeza destrutiva
automática. Limites do projeto também se aplicam: este desenho não estabelece teto de custos.

`scripts/verificar-pdfs-banco.mjs` usa PGlite 0.5.11 exclusivamente em memória e substitutos
locais de auth/storage. Confere funções reais, RLS, bloqueio de escrita e decisão com versão.
O parser real abre as quatro fichas e recusa um PDF falso. O teste não substitui a API real de
Storage. As ferramentas ficam no pacote isolado `ferramentas/navegador`, fora do aplicativo.
