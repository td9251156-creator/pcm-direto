<p align="center"><img src="public/icones/logo.svg" alt="PCM Direto" width="160"></p>

# PCM Direto

Ferramenta aberta de Planejamento e Controle de Manutenção, em português, para uma fábrica com até 100 ativos. Interface Gestão, com comunidade na abertura e tema claro.

- **Comunidade:** modelos PCMD, exemplos e biblioteca técnica para download; catálogo online com publicações, curtidas, comentários, denúncias e moderação no Supabase.
- **Fábrica privada:** cadastros, planos, criticidade, execuções e falhas ficam no IndexedDB deste navegador, sem sincronização da base operacional.
- **Planejar:** equipamentos por cadastro, colagem, CSV ou XLSX, criticidade com cinco notas, capacidade e revisões com vigência e prévia do impacto.
- **Executar:** ocorrências previstas, registro rápido, cancelamento preservado e histórico. Execuções antigas permanecem como legado sem vínculo presumido.
- **Documentos:** cópias preenchidas dos seis modelos originais PCMD com uma data de corte comum; exportações anteriores em Outros formatos.
- **Meus dados:** backup JSON versão 3 e restauração com prévia; aceita versões 1 e 2 e preserva os originais locais na migração.
- PWA para computador e celular; operação local e documentos offline após carregamento. Comunidade entre aparelhos exige internet.
- Licença MIT. HTML, CSS, JavaScript e Vite, sem framework.

> **Aviso:** O material apoia a organização do PCM e não substitui a avaliação de profissional habilitado nem o texto oficial das normas. Periodicidades são base genérica a validar com manual do fabricante.

## Como usar

1. Abra Comunidade para baixar modelos ou Mais → Primeiros passos → Começar meu PCM. O exemplo fica isolado dos dados de trabalho.
2. Cadastre organização, setores e equipamentos; avalie a criticidade e atribua responsáveis quando disponíveis.
3. Em Planejar, confira tarefas e capacidade; informe elaborador, vigência e resumo e confira o impacto antes de ativar a revisão.
4. Em Executar, selecione a ocorrência e use Feito hoje ou informe os detalhes. Registre falhas em Mais → Falhas.
5. Em Documentos, gere o pacote PCMD e confira no editor antes da aprovação.
6. Baixe backups em Mais → Meus dados. Limpar o navegador, mudar a origem ou trocar de aparelho exige restauração de backup.

Não publique TAGs, nomes ou registros privados na comunidade. A configuração de produção contém somente chave pública publishable/anon; nunca use chave secret/service_role no navegador.

Reformulação em validação: veja [decisões atuais](docs/REFORMULACAO.md) e [evidências e limites](docs/VALIDACAO-REFORMULACAO.md). O plano completo depende de validação humana e documental.

### Formato para colar do Excel ou importar CSV

Colunas, nesta ordem, com ou sem linha de cabeçalho:

```
setor;tipo;descricao;fabricante;modelo
UTL;compressor_ar;Compressor da linha de ar;Fabricante Exemplo;CX-100
```

Tipos aceitos na biblioteca inicial: `motor_eletrico`, `compressor_ar`, `bomba_centrifuga`, `ponte_rolante`.
O separador pode ser ponto e vírgula, vírgula ou tabulação (o padrão ao copiar do Excel).

## Interface de gestão

- **Cadastros:** organização/setores, pessoas/funções, consulta das frequências e tipos, metas e requisitos.
- **Criticidade:** cinco notas por ativo, limites A/B editáveis, sem alterar tarefas de segurança.
- **Plano Mestre:** tarefas ativas e responsáveis, com busca e próximas ocorrências do cronograma atual.
- **Mensal:** janeiro a dezembro do ano consultado; horas, previsto e realizado com vínculo explícito.
- **Falhas:** registro e correção de sintoma, causa provável, ação, parada e responsável.

Pessoas podem ser editadas e inativadas. Preencha e salve cada formulário; os rascunhos dos demais
formulários de Cadastros são preservados ao salvar outro cadastro na mesma tela. Remover um ativo
não apaga os registros anteriores: eles ficam identificados como fora da lista atual.
Metas não definidas permanecem vazias. O app não calcula MTBF, MTTR ou disponibilidade sem regras
técnicas aprovadas. Referências começam não verificadas; nenhuma conformidade é certificada.

**Você fornecerá os modelos Excel e Word.** Esta entrega não cria templates PCMD. A Entrega informa
quais modelos ainda faltam, mantendo a planilha e o resumo anteriores. Esses arquivos antigos ainda
não contêm os cadastros novos; use o backup completo para guardar tudo. O
[guia para criar seus modelos](docs/INTERFACE-E-MODELOS.md) descreve campos e vínculos de cada documento.

## Como rodar no seu computador

Pré-requisito: [Node.js LTS](https://nodejs.org/) instalado.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

Outros comandos:

| Comando           | O que faz                                          |
|-------------------|----------------------------------------------------|
| `npm test`        | Roda os testes automáticos                         |
| `npm run lint`    | Verifica o código                                  |
| `npm run build`   | Gera a versão final na pasta `dist/`               |
| `npm run preview` | Abre a versão final localmente                     |

## Logo e ícones

O logo fica em [`public/icones/logo.svg`](public/icones/logo.svg). Os ícones do aplicativo
(`icone-192.png`, `icone-512.png` e `icone-maskable-512.png`) são imagens geradas a partir dele.
Para trocar o logo, substitua esses quatro arquivos mantendo os nomes.
As letras do logo usam a fonte DejaVu Sans Bold (licença livre do projeto DejaVu), convertidas em desenho
para aparecerem iguais em qualquer aparelho.

## Biblioteca técnica

As tarefas de manutenção ficam em um único arquivo: [`src/dados/biblioteca.json`](src/dados/biblioteca.json).
Veja [BIBLIOTECA.md](BIBLIOTECA.md) para entender o formato e o checklist de revisão.

## Documentos do projeto

[ROADMAP.md](ROADMAP.md) · [DECISOES.md](DECISOES.md) · [CONTRIBUTING.md](CONTRIBUTING.md) ·
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) · [LICENSE](LICENSE)

[Lista priorizada de melhorias](docs/MELHORIAS.md), com problemas encontrados e próximas rodadas.
[Histórico das revisões e melhorias](docs/REVISOES.md).

[Estratégia de evolução com agentes](docs/EVOLUCAO-CONTINUA.md) · [Fila de trabalho atual](docs/FILA.md).

## Sobre o autor

**Thiago Oliveira Lima** — Engenheiro de Produção com mais de 10 anos em manutenção industrial no setor automotivo,
com experiência em PCM, análise de falhas (8D, MASP, FMEA), auditorias ISO e indicadores de manutenção.
[linkedin.com/in/thiagooliveiralima94](https://linkedin.com/in/thiagooliveiralima94)

Parte do código deste projeto foi escrita com ajuda de IA e revisada pelo autor.

## Licença

[MIT](LICENSE) — Copyright (c) 2026 Thiago Oliveira Lima.
