# PCM Direto

[Português](README.md) · [Portal](https://pcmdireto.me/) · [Try the app](https://pcmdireto.me/app.html#inicio) · [Contribute](CONTRIBUTING.en.md)

Free, MIT-licensed maintenance planning software for technicians and small operations with up to 100 assets. The interface is in Brazilian Portuguese. The app runs in the browser and supports offline operation after its resources have loaded.

It includes asset registration and TAG validation, preventive plans, plan revisions, task execution, failure records and local backups. The library provides 19 free PCM-MAN templates: 16 Excel files and three Word documents. 47 equipment types contain 380 reference tasks with declared source and version. Generic maintenance tasks must be checked against manufacturer instructions and qualified professional assessment.

**Test version:** templates are under development (R00). Generated documents require review. The app does not certify regulatory compliance or guarantee outcomes.

Operational data stays in this browser; clearing site data or changing devices requires an external backup. Public community browsing, optional accounts and explicitly submitted public contributions use Supabase. They do not synchronize private factory records. Do not publish real asset tags, people, records or backups.

Use Git and Node.js 24. Run `npm ci`, then `npm run dev`. Run `npm run verificar` for lint, unit tests and a production build. Browser checks are described in the contribution guide.

Contributions can include usability reports, documentation, maintenance content with sources, or code. No paid tools or AI account are required. English reports are welcome. Human validation remains pending; the presence of tests does not establish field validation.

[License](LICENSE) · [Security reporting](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Credits and third-party licenses](CREDITOS.md).
