# Referência — GitHub Actions

Doc oficial do **GitHub Actions** importada do repositório open-source `github/docs`. Fonte canônica para o agente [`github-actions-expert`](../../../.claude/agents/github-actions-expert.md) e para qualquer trabalho em `.github/workflows/`.

> Quando código (workflow YAML) e esta referência discordarem, **a referência vence** — é a doc oficial publicada em <https://docs.github.com/en/actions>.

---

## Procedência

| Campo            | Valor                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Repositório      | [`github/docs`](https://github.com/github/docs) — `content/actions/`  |
| Commit de origem | `1e2b51575e49fba2d5e575cea650a7dbe830ed80`                            |
| Data do snapshot | 2026-06-02                                                            |
| Site renderizado | <https://docs.github.com/en/actions>                                  |
| Licença          | Conteúdo de docs sob **CC BY 4.0** (ver `LICENSE` em `github/docs`)   |

Para atualizar o snapshot, repetir o `git sparse-checkout` de `content/actions` + `data/reusables/actions` + `data/variables` e atualizar o commit/data acima.

---

## ⚠️ Esquema Liquid — leia antes de usar

O `github/docs` **não** guarda prosa pronta nos arquivos de `content/`. O conteúdo real é montado em tempo de build a partir de _includes_ e _variáveis_ via [Liquid](https://shopify.github.io/liquid/). Por isso, os arquivos aqui carregam **placeholders não-resolvidos**:

| Tag no markdown                                          | Resolve para…                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `{% data reusables.actions.<path> %}`                    | conteúdo de `_reusables/<path>.md` (ponto vira `/`)                            |
| `{% data variables.product.prodname_actions %}`          | `GitHub Actions` (ver `_variables/product.yml`)                               |
| `{% data variables.product.prodname_dotcom %}`           | `GitHub`                                                                       |
| `{% ifversion fpt %}…{% endif %}`                        | trecho para Free/Pro/Team (`fpt`) — o que vale para repo público padrão       |
| `{% ifversion ghes %}` / `{% ifversion ghec %}`          | trechos só para Enterprise Server / Cloud — ignorar salvo contexto enterprise |
| `{% raw %}…{% endraw %}`                                 | bloco literal (protege `${{ … }}` de ser interpretado como Liquid)            |

**Como ler na prática:** ao topar um `{% data reusables.actions.workflows.section-triggering-a-workflow %}`, abra `_reusables/workflows/section-triggering-a-workflow.md`. Reusables podem aninhar outros reusables — siga recursivamente. Para a versão já-resolvida e limpa de uma página, consulte o site renderizado correspondente em `docs.github.com/en/actions/...`.

---

## Mapa de navegação

```
github-actions/
├── index.md          # landing oficial
├── get-started/      (6)    quickstart, conceitos essenciais
├── concepts/         (32)   workflows, runners, security, billing — o "porquê"
├── how-tos/          (123)  guias por tarefa (escrever, reusar, deployar, runners, monitorar)
├── reference/        (26)   ⭐ especificação técnica — núcleo normativo
├── tutorials/        (55)   walkthroughs CI/CD por linguagem, migração, packages
├── _reusables/       (483)  includes Liquid referenciados por content/
└── _variables/       (28)   .yml de variáveis (prodname_*, etc.)
```

### ⭐ `reference/` — núcleo que o agente mais usa

**`reference/workflows-and-actions/`**

- [`workflow-syntax.md`](reference/workflows-and-actions/workflow-syntax.md) — **referência primária**: `name`, `on`, `jobs`, `steps`, `runs-on`, `permissions`, `env`, `concurrency`, `strategy/matrix`, `defaults`, `if`, `needs`.
- [`events-that-trigger-workflows.md`](reference/workflows-and-actions/events-that-trigger-workflows.md) — todos os eventos (`push`, `pull_request`, `workflow_dispatch`, `schedule`, `workflow_call`, …) e seus filtros.
- [`contexts.md`](reference/workflows-and-actions/contexts.md) — `github`, `env`, `vars`, `secrets`, `needs`, `inputs`, `matrix`, `runner`, `job`, `steps`.
- [`expressions.md`](reference/workflows-and-actions/expressions.md) — operadores, `${{ }}`, funções (`contains`, `startsWith`, `fromJSON`, `hashFiles`, status checks).
- [`dependency-caching.md`](reference/workflows-and-actions/dependency-caching.md) — `actions/cache`, chaves, `restore-keys` (base do cache pnpm store nos nossos workflows).
- [`reusing-workflow-configurations.md`](reference/workflows-and-actions/reusing-workflow-configurations.md) — `workflow_call`, reusable workflows, composite actions.
- [`workflow-commands.md`](reference/workflows-and-actions/workflow-commands.md) — `::set-output::`/`$GITHUB_OUTPUT`, `$GITHUB_ENV`, `::error::`, masking.
- [`deployments-and-environments.md`](reference/workflows-and-actions/deployments-and-environments.md) — `environment:`, protection rules (usado no `deploy-docs.yml`).
- [`metadata-syntax.md`](reference/workflows-and-actions/metadata-syntax.md) — `action.yml` (autoria de actions).
- [`variables.md`](reference/workflows-and-actions/variables.md) · [`workflow-cancellation.md`](reference/workflows-and-actions/workflow-cancellation.md) · [`dockerfile-support.md`](reference/workflows-and-actions/dockerfile-support.md)

**`reference/security/`**

- [`secure-use.md`](reference/security/secure-use.md) — **leitura obrigatória** para hardening: pin de actions por SHA, `permissions` mínimas, untrusted input, `pull_request_target`.
- [`oidc.md`](reference/security/oidc.md) — OpenID Connect (base do deploy Pages via `id-token: write`).
- [`secrets.md`](reference/security/secrets.md) — secrets de repo/ambiente/org, masking.

**`reference/runners/`** — `github-hosted-runners.md` (specs do `ubuntu-latest`), `larger-runners.md`, `self-hosted-runners.md`.

**Outros:** [`limits.md`](reference/limits.md) — limites de concorrência, tempo, tamanho de artefato.

---

## Relação com o projeto

- Workflows ativos: [`.github/workflows/test-and-quality.yml`](../../../.github/workflows/test-and-quality.yml) e [`.github/workflows/deploy-docs.yml`](../../../.github/workflows/deploy-docs.yml).
- CI de pnpm: ver também [`../pnpm/continuous-integration.md`](../pnpm/continuous-integration.md) (corepack, cache do store, `--frozen-lockfile`).
- Supply-chain (pin de actions, `permissions`): [ADR-0011](../../architecture/adr/0011-supply-chain-hardening.md).
