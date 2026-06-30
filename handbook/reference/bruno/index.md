# Bruno — Referência local

> **Fonte:** [docs.usebruno.com](https://docs.usebruno.com/) (repo [`usebruno/bruno-docs`](https://github.com/usebruno/bruno-docs)) · **Versão capturada:** v3 (stable, current) · **Data da captura:** 2026-06-03
>
> Esta é uma cópia local da documentação oficial do Bruno para consulta offline e referência cruzada em ADRs/PRs. **Sempre que precisar da verdade canônica, ir ao site oficial** — esta cópia é congelada e pode ficar desatualizada.

## O que é Bruno

> Bruno é um API client **Git-friendly** e **offline-first**, construído para desenvolvedores que querem workflows locais rápidos, coleções em **texto puro** e melhor colaboração via Git.

Diferente de Postman/Insomnia, o Bruno **não usa nuvem nem conta obrigatória**: cada request é um arquivo `.bru` (linguagem [Bru](./bru-lang/overview.mdx)) versionado junto do código. Isso casa diretamente com o modelo deste repositório — coleções de API podem viver ao lado de `src/`, revisadas em PR como qualquer outro artefato de texto.

**Open-source** (licença MIT no core) · API client desktop (Electron) + **CLI** (`bru`) para CI + extensão VS Code.

## Por que esta referência existe no ERP-CONTRACTS

Este repositório é `core-api` — backend modular monolith (Node.js 24 + MySQL 8 + Drizzle). A **borda HTTP** está sendo construída (ver épico `EPIC-HTTP-CORE-API` e `EPIC-CONTRACTS-HTTP`, Fastify + Zod contract-first, ADR-0025/0027/0033). Conforme as rotas (`auth`, `contracts`, `partners/collaborators`) ganham superfície HTTP, surge a necessidade de:

- **Coleções `.bru` versionadas** que exercitam os endpoints reais — smoke e2e manual reproduzível, commitado junto do código (em linha com o `scripts/e2e-collaborators.sh` e os tickets `*-HTTP-E2E-SMOKE`).
- **`bru` CLI em CI** como alternativa/complemento aos testes de integração.
- **Conversão OpenAPI ↔ Bruno** — se a borda HTTP expuser uma spec OpenAPI, o Bruno importa/sincroniza (ver [`open-api/`](./open-api/overview.mdx)).

Bruno **ainda não tem ADR de adoção** neste repo. Esta árvore foi mirroreada como material de apoio; se a equipe oficializar Bruno como ferramenta de teste de API da borda HTTP, esta referência embasa o ADR.

## Mapa de navegação

### Introduction & Getting Started

| Arquivo | Conteúdo |
| --- | --- |
| [introduction/getting-started.mdx](./introduction/getting-started.mdx) | Porta de entrada — tarefas iniciais por caso de uso |
| [introduction/quick-start.mdx](./introduction/quick-start.mdx) | Tutorial guiado completo (primeira coleção → request → test) |
| [introduction/manifesto.mdx](./introduction/manifesto.mdx) | Manifesto: API client deve ser offline-first e open-source |
| [introduction/feedback-community.mdx](./introduction/feedback-community.mdx) | Canais de comunidade |
| [get-started/bruno-basics/](./get-started/bruno-basics/) | Workspace, collection, folder, request, test, run-a-collection, download |
| [get-started/configure/](./get-started/configure/) | `settings`, `proxy-config`, `javascript-sandbox` |
| [get-started/import-export-data/](./get-started/import-export-data/) | Import/export de coleções, environments, workspace; **postman-migration**; script-translator |
| [get-started/history.mdx](./get-started/history.mdx) · [get-started/javascript-sandbox.mdx](./get-started/javascript-sandbox.mdx) | Histórico de requests · sandbox JS |

### Bru language (formato `.bru`)

| Arquivo | Conteúdo |
| --- | --- |
| [bru-lang/overview.mdx](./bru-lang/overview.mdx) | Visão geral da linguagem Bru |
| [bru-lang/language.mdx](./bru-lang/language.mdx) | Especificação da linguagem |
| [bru-lang/tag-reference.mdx](./bru-lang/tag-reference.mdx) | Referência de tags/blocos (`meta`, `get`, `headers`, `body`, `script`, `tests`, `vars`…) |
| [bru-lang/samples.mdx](./bru-lang/samples.mdx) · [bru-lang/syntax-highlighting.mdx](./bru-lang/syntax-highlighting.mdx) | Exemplos · syntax highlighting |

### Send requests

| Arquivo | Conteúdo |
| --- | --- |
| [send-requests/overview.mdx](./send-requests/overview.mdx) · [send-requests/history.mdx](./send-requests/history.mdx) | Visão geral · histórico |
| [send-requests/REST/](./send-requests/REST/) | REST: `rest-api`, `body-data`, `parameters`, `req-header`, `request-settings`, `code-generator` |
| [send-requests/graphql/](./send-requests/graphql/) | GraphQL: API, variables, query-builder |
| [send-requests/grpc/](./send-requests/grpc/) | gRPC: request, proto, streams |
| [send-requests/soap/](./send-requests/soap/) · [send-requests/websocket/](./send-requests/websocket/) | SOAP · WebSocket (create-request, message-types, ws-interface) |
| [send-requests/res-data-cookies/](./send-requests/res-data-cookies/) | Resposta: res-data, cookies, response-examples, debugging (dev-tools, timeline) |

### Variables & Secrets

| Arquivo | Conteúdo |
| --- | --- |
| [variables/overview.mdx](./variables/overview.mdx) | Escopos: collection, environment, folder, runtime, request, global, process-env, prompt |
| [variables/interpolation.mdx](./variables/interpolation.mdx) | Sintaxe `{{ }}` de interpolação |
| [secrets-management/overview.mdx](./secrets-management/overview.mdx) | Secret variables, masking, `.env` (dotenv) |
| [secrets-management/secret-managers/](./secrets-management/secret-managers/) | Providers: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault |

### Auth

| Arquivo | Conteúdo |
| --- | --- |
| [auth/overview.mdx](./auth/overview.mdx) | Visão geral dos modos de autenticação |
| [auth/basic.mdx](./auth/basic.mdx) · [auth/bearer.mdx](./auth/bearer.mdx) · [auth/digest.mdx](./auth/digest.mdx) | Basic · Bearer · Digest |
| [auth/oauth2-2.0/](./auth/oauth2-2.0/) | OAuth2 (2.0): authorization-code, client-credentials, password, system-browser, collection-level |
| [auth/oauth2/](./auth/oauth2/) | OAuth2 (legado) |
| [auth/aws-signature.mdx](./auth/aws-signature.mdx) · [auth/ntlm.mdx](./auth/ntlm.mdx) · [auth/oauth1.mdx](./auth/oauth1.mdx) · [auth/add-and-manage-certs.mdx](./auth/add-and-manage-certs.mdx) | AWS SigV4 · NTLM · OAuth1 · client certs |

### Scripting & Testing

| Arquivo | Conteúdo |
| --- | --- |
| [testing/script/getting-started.mdx](./testing/script/getting-started.mdx) | Pré/pós scripts em JS |
| [testing/script/javascript-reference.mdx](./testing/script/javascript-reference.mdx) | Referência da API de scripting |
| [testing/script/request/](./testing/script/request/) · [testing/script/response/](./testing/script/response/) | `request-object`, `sync-requests` · `response-object`, `response-query` |
| [testing/script/vars.mdx](./testing/script/vars.mdx) · [testing/script/request-chaining.mdx](./testing/script/request-chaining.mdx) | Variáveis em script · encadeamento de requests |
| [testing/script/inbuilt-libraries.mdx](./testing/script/inbuilt-libraries.mdx) · [testing/script/external-libraries.mdx](./testing/script/external-libraries.mdx) · [testing/script/whitelisting-modules.mdx](./testing/script/whitelisting-modules.mdx) | Libs embutidas/externas · whitelist de módulos |
| [testing/tests/introduction.mdx](./testing/tests/introduction.mdx) · [testing/tests/assertions.mdx](./testing/tests/assertions.mdx) | Bloco `tests` · assertions |
| [testing/automate-test/](./testing/automate-test/) | Automação: manual-test, data-driven-testing, overview |

### Bru CLI (`bru`) — CI/CD

| Arquivo | Conteúdo |
| --- | --- |
| [bru-cli/overview.mdx](./bru-cli/overview.mdx) · [bru-cli/installation.mdx](./bru-cli/installation.mdx) | Visão geral · instalação |
| [bru-cli/runCollection.mdx](./bru-cli/runCollection.mdx) · [bru-cli/commandOptions.mdx](./bru-cli/commandOptions.mdx) | Rodar coleção · opções de comando |
| [bru-cli/builtInReporters.mdx](./bru-cli/builtInReporters.mdx) · [bru-cli/import.mdx](./bru-cli/import.mdx) · [bru-cli/proxyConfiguration.mdx](./bru-cli/proxyConfiguration.mdx) | Reporters (JUnit, etc.) · import · proxy |
| [bru-cli/gitHubCLI.mdx](./bru-cli/gitHubCLI.mdx) · [bru-cli/jenkins.mdx](./bru-cli/jenkins.mdx) | Integração GitHub Actions · Jenkins |

### OpenAPI & Converters & OpenCollection

| Arquivo | Conteúdo |
| --- | --- |
| [open-api/overview.mdx](./open-api/overview.mdx) | Importar/exportar/sincronizar OpenAPI (OAS) |
| [open-api/importOAS.mdx](./open-api/importOAS.mdx) · [open-api/exportOAS.mdx](./open-api/exportOAS.mdx) · [open-api/createOAS.mdx](./open-api/createOAS.mdx) · [open-api/openapi-sync.mdx](./open-api/openapi-sync.mdx) | Import · export · create · sync |
| [converters/overview.mdx](./converters/overview.mdx) | Postman, Insomnia, OpenAPI, WSDL → Bruno |
| [opencollection-yaml/](./opencollection-yaml/) | OpenCollection (YAML): overview, structure-reference, samples |

### Git integration & Providers

| Arquivo | Conteúdo |
| --- | --- |
| [git-integration/overview.mdx](./git-integration/overview.mdx) · [git-integration/git-strategies.mdx](./git-integration/git-strategies.mdx) | Visão geral · estratégias de versionamento |
| [git-integration/using-gui/](./git-integration/using-gui/) · [git-integration/using-cli.mdx](./git-integration/using-cli.mdx) | Via GUI (intro, provider, consumer) · via CLI |
| [git-integration/azure-devops.mdx](./git-integration/azure-devops.mdx) · [git-integration/bitbucket.mdx](./git-integration/bitbucket.mdx) · [git-integration/gitlab.mdx](./git-integration/gitlab.mdx) | Azure DevOps · Bitbucket · GitLab |
| [git-providers/github.mdx](./git-providers/github.mdx) · [git-providers/overview.mdx](./git-providers/overview.mdx) | GitHub provider |

### API Docs · Debugging · Agents · VS Code · Advanced

| Arquivo | Conteúdo |
| --- | --- |
| [api-docs/overview.mdx](./api-docs/overview.mdx) | Documentação de collection/folder/request/workspace; auto-generate-docs |
| [debugging/dev-tools.mdx](./debugging/dev-tools.mdx) · [debugging/timeline.mdx](./debugging/timeline.mdx) | DevTools · timeline de requests |
| [agents/overview.mdx](./agents/overview.mdx) | Bruno + AI agents (Claude, Codex, Cursor, VS Code) — use-cases |
| [vs-code-extension/overview.mdx](./vs-code-extension/overview.mdx) | Extensão VS Code: install-config, send-req |
| [advanced-guides/visualize.mdx](./advanced-guides/visualize.mdx) · [advanced-guides/working-with-bigint.mdx](./advanced-guides/working-with-bigint.mdx) | Visualização de resposta · BigInt |

### License (Enterprise)

| Arquivo | Conteúdo |
| --- | --- |
| [license-overview.mdx](./license-overview.mdx) | Visão geral de licenciamento |
| [license-administrators/](./license-administrators/) | SAML SSO (Entra ID, Okta), SCIM provisioning, self-hosted licensing, license-portal |
| [license-end-users/activate-license.mdx](./license-end-users/activate-license.mdx) | Ativação para usuário final |

### Manifest de navegação original

| Arquivo | Conteúdo |
| --- | --- |
| [_navigation.docs.json](./_navigation.docs.json) | `docs.json` original do Mintlify — define a ordem/agrupamento das páginas no site (versões v3 e v2) |

## Notas de captura

- Captura via `git clone --depth 1` de [`usebruno/bruno-docs`](https://github.com/usebruno/bruno-docs) (`main`, push de 2026-06-01), mirror **texto-puro** (`.mdx`, `.md`, `.yaml`, `.bru`).
- **Apenas a versão v3 (current/stable)** foi espelhada. A versão **v2 (legada)**, que no repo vive em `v2/` (≈160 arquivos), **foi excluída** — consultar o site oficial se precisar da doc legada.
- Arquivos são **`.mdx`** (Mintlify): markdown com componentes JSX (`<Card>`, `<Steps>`, `<Note>`, `<Frame>`…). São legíveis como markdown; os componentes aparecem como tags inline.
- **Imagens não foram baixadas** (`images/`, ~201 MB no original). Referências `![...](/images/...)` apontam para paths que existem só no site — usar `https://docs.usebruno.com/images/...` quando necessário.
- Links internos no markdown foram preservados como paths absolutos do site (ex.: `/bru-cli/overview`) — para navegação local, mapear manualmente para o arquivo `.mdx` correspondente nesta árvore.
- Para **atualizar**: refazer o mirror substituindo este diretório (mesmo `rsync` filtrando `v2/` e binários).

## Stack referenciada cross-handbook

Bruno **não** está nas dependências atuais do `core-api` (sem ADR de adoção). Tecnologias ativas com referência própria:

- [`handbook/reference/nodejs/`](../nodejs/) — Node.js 24 LTS
- [`handbook/reference/typescript/`](../typescript/) — TypeScript 6.0
- [`handbook/reference/fastify/`](../fastify/) — HTTP server da borda (ADR-0025+)
- [`handbook/reference/zod/`](../zod/) — schemas contract-first (ADR-0027)
- [`handbook/reference/drizzle/`](../drizzle/) · [`handbook/reference/mysql/`](../mysql/) · [`handbook/reference/mysql2/`](../mysql2/) — persistência
- [`handbook/reference/pnpm/`](../pnpm/) — package manager · [`handbook/reference/docker/`](../docker/) — containers
