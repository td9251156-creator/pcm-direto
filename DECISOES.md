# Decisões do projeto

## Nome
**PCM Direto** (nome definitivo). Antes da publicação, conferir disponibilidade no Registro.br e no INPI.

## Escopo do MVP
- Entrada: cadastro manual, colar do Excel e CSV.
- TAGs padronizadas e validação ao vivo.
- Biblioteca de 4 tipos de equipamento em um único JSON, com periodicidades genéricas.
- Plano preventivo, cronograma anual de carga balanceada e ficha de falha mínima.
- Saída: .xlsx (Leia-me, Resumo, Equipamentos, Plano, Cronograma, Ficha de Falha) e .docx de resumo.
- 4 telas (Início, Equipamentos, Revisão, Entrega), PWA instalável, rascunho no navegador.
- Fora do MVP: login, servidor, banco de dados, indicadores, normas e integração com outros sistemas.

## Tecnologia
HTML, CSS e JavaScript puro, sem framework. Vite só para rodar localmente e gerar a versão publicada.
Bibliotecas: ExcelJS (.xlsx) e docx (.docx), ambas MIT. Hospedagem no GitHub Pages, custo zero.

## Identidade visual
Manual final da marca, versão 02 / outubro de 2026. Azul #0B2A5B e azul profundo #071C3D;
laranja sinal #E2701F e laranja texto #B85600. Tipografia Archivo e IBM Plex Mono, servida localmente
com as licenças OFL. Logos oficiais sem distorção, cantos discretos e entradas em azul-claro.
Cores centralizadas em src/marca.js; segurança e legibilidade dos estados permanecem preservadas.
A página #marca reúne as regras e os downloads originais fornecidos pelo mantenedor.
Alteração preparada localmente; publicação continua dependendo de autorização explícita.

## Licença
MIT — Copyright (c) 2026 Thiago Oliveira Lima. Uso, cópia e modificação livres, sem garantia.

## Governança
- Mantenedor único: Thiago Oliveira Lima, que decide o que entra no projeto.
- Mudanças por *pull request*, com lint e testes passando no GitHub Actions.
- Mudanças na biblioteca técnica precisam indicar a origem de cada tarefa.
- Contato público: pcmdireto@gmail.com.

## Riscos conhecidos

### Backup completo

Formato JSON identificado por aplicativo e versão. Validar lista, biblioteca e marcações antes de
confirmar a substituição. A restauração guarda temporariamente o par anterior de chaves locais;
se a escrita for interrompida, a próxima abertura recupera esse par. Falta de espaço não autoriza
descartar os originais. Nenhum dado é enviado para fora do navegador.

### Primeira versão do checklist

Registrar somente a última marcação por equipamento e tarefa, com data até hoje e observação
técnica sem dados pessoais. O mantenedor autorizou começar sem fotos e sem assinatura.
Marcação de execução não altera frequência, tarefa de segurança nem cronograma. As chaves antigas
do rascunho são mantidas; o novo campo opcional `execucoes` começa vazio nos rascunhos antigos.

### Recuperação de dados locais

Ao abrir, validar biblioteca e estrutura do rascunho antes de usá-los. Rascunhos antigos válidos
continuam aceitos, inclusive listas vazias. Não sobrescrever dados danificados sem guardar uma cópia
com a chave e o conteúdo original. Avisar de forma permanente e oferecer download para recuperação.
Se o navegador impedir a cópia, impedir também a substituição do original.

### Validação da biblioteca importada (20/10/2026)

Arquivos JSON devem ser conferidos antes de substituir a biblioteca em uso: tipos e tarefas em listas,
códigos válidos e sem repetição, textos obrigatórios preenchidos e duração numérica positiva e finita.
Um arquivo recusado mantém a biblioteca atual. A conferência de formato vem antes das travas de segurança,
que continuam obrigatórias. O formato do rascunho e suas chaves de armazenamento permanecem iguais.

| Risco | Como tratamos |
|---|---|
| Periodicidades genéricas aplicadas sem validação | Aviso discreto no rodapé de todas as telas (decisão de 18/10/2026: sai o destaque amarelo para melhorar a leitura) e completo em todos os arquivos gerados; origem marcada em cada tarefa |
| Usuário afrouxar tarefa de segurança | Bloqueio no app: só aceita periodicidade igual ou mais frequente |
| Interpretação como garantia de conformidade | Nenhuma citação de norma sem fonte oficial; nenhuma promessa de conformidade |
| Perda do rascunho (limpeza do navegador) | Rascunho só no localStorage; orientar a baixar a planilha ao final |
| Dependências desatualizadas | Poucas dependências; revisar alertas do `npm audit` periodicamente |
| Planilha em versões antigas do Excel | Só funções clássicas (PROCV, ÍNDICE, CORRESP), sem macros nem matriz dinâmica |
