# Contributing to PCM Direto

[Português](CONTRIBUTING.md). The product interface and implementation comments stay in Brazilian Portuguese; English bug reports and discussions are welcome.

You can test the example, improve a guide, propose a maintenance task with its source and version, or contribute code. No paid service or AI tool is required.

1. Check existing issues and discuss the goal, allowed scope and acceptance criteria with the maintainer.
2. Fork the repository, clone your fork and create a branch such as `contrib/my-change`. Use Git and Node.js 24.
3. Run `npm ci` and `npm run dev`; open the printed address. Use fictional data only.
4. Add a regression test for a bug and meaningful tests for new rules. Run `npm run verificar` for lint, unit tests and build.
5. For UI, storage, offline or document changes, run `npm ci --prefix ferramentas/navegador`, `node ferramentas/navegador/node_modules/playwright/cli.js install chromium`, then `npm run test:navegador`. See [browser setup](docs/TESTES-NAVEGADOR.md).
6. Open a pull request explaining Before, After, How to test, Risks, actual checks and limitations. Review and integration are separate steps; the maintainer decides what is merged. Never push directly to main.

On a constrained machine, set `VITEST_MAX_WORKERS=1` for verification; do not raise test timeouts or skip assertions to pass checks. Agent branch helpers are optional tooling for agents, not requirements for human contributions.

If you use AI assistance, disclose relevant use in the PR and understand and review the result. Never send factory records, secrets or real backups to external tools. Preserve safety tasks, data compatibility, original templates and attribution. Do not invent normative requirements or claim compliance.

By contributing, you agree to the [MIT license](LICENSE) and [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately through [SECURITY.md](SECURITY.md), not public issues. Contributor credit requires consent; a nickname or anonymity is available.

[Discussions](https://github.com/td9251156-creator/pcm-direto/discussions) · [Starter task drafts](docs/PRIMEIRAS-CONTRIBUICOES.md) · [Governance](docs/GOVERNANCA.md).
