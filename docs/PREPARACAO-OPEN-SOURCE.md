# Preparação open source — atualização 04/11/2026

Este levantamento não atribui selo nem declara elegibilidade em programa. Referência histórica inicial: `81100416509f684e8078a988882e830fdd9adb11`. A consolidação atual parte da main integrada `eb912ddc0a8118e0f8d7afa40aa6dface400b915`; a release identifica seu commit final. Rever critérios e evidências antes de qualquer candidatura.

## GitHub Community Profile

**Implementado:** README, LICENSE MIT, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY e formulários em `.github/ISSUE_TEMPLATE` com `name` e `description`. O repositório é público, usa Git e tem Discussões habilitadas. A licença foi reconhecida como MIT na consulta ao GitHub. **Verificado em 04/11:** o endpoint público Community Profile retornou 100% e reconheceu README, licença, contribuição, código de conduta e template de PR. Os formulários YAML estão no repositório; o campo legado issue_template retornou nulo, sem reduzir o health informado. Isso não comprova acolhimento humano; arquivos existentes não comprovam acolhimento efetivo. [Checklist oficial](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories).

## OpenSSF Best Practices Passing

Fonte: [critérios completos](https://www.bestpractices.dev/en/criteria/0). Avaliar todos os MUST; atender ou justificar os SHOULD e cada N/A permitido. Esta matriz é um índice de evidências, não o preenchimento concluído do questionário.

| Área e critérios | Evidência ou pendência |
|---|---|
| Descrição, obtenção e contribuição (`description_good`, `interact`, `contribution`) | README e CONTRIBUTING; site público descrito, reconhecimento da versão integrada a conferir. |
| Licença FLOSS e localização (`floss_license`, `license_location`) | LICENSE MIT na raiz. Fontes Archivo e IBM Plex Mono têm arquivos OFL; demais atribuições em CREDITOS. Inventário completo de terceiros ainda precisa de revisão. |
| Documentação básica e interfaces (`documentation_basics`, `documentation_interface`, `english`) | README e guias em PT/EN; entradas CSV/XLSX/JSON e saídas documentadas em guias/código. Referência completa dos formatos: pendente de consolidação. |
| Discussão e histórico público (`discussion`, `repo_public`, `repo_track`, `repo_interim`, `maintained`) | Git público, PRs e Discussões. Isso não comprova participação recorrente de uma comunidade humana. |
| Versão e notas (`version_unique`, `release_notes`) | Cache de build tem hash de conteúdo; package indica 0.1.0-preview.1. Notas reconstruídas para 0.1.0-preview.1; o estado efetivo e o SHA devem ser conferidos nas releases do GitHub, sem confundir preparação com publicação. |
| Relatos e respostas (`report_process`, `report_archive`, `report_responses`, `enhancement_responses`) | Issues e formulários. Histórico de respostas nos períodos exigidos: não auditado. |
| Vulnerabilidades (`vulnerability_report_process`, `vulnerability_report_private`, `vulnerability_report_response`) | Canal privado em SECURITY. Prazo inicial observado de até 14 dias, quando aplicável ao critério: não verificado. Não prometer SLA inexistente. |
| Build, testes e avisos (`build`, `test`, `test_policy`, `tests_are_added`, `warnings`, `warnings_fixed`) | npm, ESLint, Vitest e roteiros de navegador em CI; evidências dos PRs nas notas de pré-release. Instalação por novo contribuidor ainda pendente; a consolidação registra verificações automáticas e limites reais. |
| Conhecimento de segurança (`know_secure_design`, `know_common_errors`) | Testes de permissões e recuperação ajudam como evidência técnica, mas qualificação/conhecimento dos responsáveis não foi formalmente avaliado. |
| HTTPS, entrega e criptografia (`sites_https`, `delivery_mitm`, grupo `crypto_*`) | Endereços públicos usam HTTPS. Rever configuração efetiva e aplicabilidade de cada critério; não marcar N/A para todo o grupo por usar serviço gerenciado. |
| Vulnerabilidades e credenciais (`vulnerabilities_fixed_60_days`, `no_leaked_credentials`) | Dependabot, auditoria semanal e conferidor configurados. Auditoria atual de dependências e advisors registrados em portal/SEGURANCA-CONFERIDA.md. Histórico completo de segredos não auditado nesta rodada. |
| Análise (`static_analysis`, `static_analysis_common_vulnerabilities`, `dynamic_analysis`) | ESLint e fluxos reais de navegador; confrontar cobertura e resultados com cada critério antes de declarar atendimento. |

## Programas futuros

**GSoC, como organização:** o projeto ainda precisa construir comunidade humana e equipe de mentoria. O [guia oficial](https://google.github.io/gsocguides/mentor/org-application) considera pessoas ativas, maturidade, atividade e lista de ideias própria; a [FAQ](https://developers.google.com/open-source/gsoc/faq) distingue requisitos de organizações e indivíduos. Preparar ideias só com objetivo, metodologia, cronograma e mentores disponíveis. Não assumir aceitação nem datas de 2027. Agentes de IA não contam como mentores humanos.

**Hacktoberfest:** a [edição oficial de 2026](https://hacktoberfest.com/) informa que PRs/merges não contam mais para recompensas. Tópicos e rótulos de edições anteriores não devem ser anunciados como mecanismo atual. Nenhuma inscrição ou alteração de tópico foi feita.

Sponsors, página de apoio, ofertas comerciais e eventual organização GitHub ficam para decisão posterior, com canais e disponibilidade confirmados. Testes locais de banco e API simulada não comprovam RLS, moderação ou autenticação do Supabase real.
