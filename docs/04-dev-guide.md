# 04 — Guia do dev

> Comandos derivados de [`package.json`](../package.json) e [`CLAUDE.md`](../CLAUDE.md). **Sempre `pnpm`,
> nunca `npm`** (ADR-0012; há hook que bloqueia `npm`).

## 1. Setup

```bash
pnpm install                    # respeita pnpm-lock.yaml + corepack (ADR-0011/0012)
pnpm install --frozen-lockfile  # CI
```

Node.js 24 LTS + TypeScript 6, ESM puro (`NodeNext`), zero transpilação em dev: os scripts rodam via
`node --experimental-strip-types`.

## 2. Qualidade (gate)

```bash
pnpm run typecheck      # tsc --noEmit (strict completo)
pnpm run lint           # eslint . (typescript-eslint strict + type-checked)
pnpm run lint:fix
pnpm run format         # prettier --write .
pnpm run format:check   # prettier --check .
pnpm test               # node:test + --experimental-strip-types  (tests/**/*.test.ts)
```

`pnpm test` roda só unit/integration em memória. Testes que exigem Docker (sufixo `.e2e.ts` ou flags de
integração) ficam **fora** do glob — ver §5.

## 3. Servidor HTTP

```bash
pnpm run serve          # sobe Fastify (default driver memory). /docs = OpenAPI UI; /health
```

Env relevantes: `PORT`, `AUTH_DRIVER`/`AUTH_DATABASE_URL`, `CONTRACTS_DRIVER`/`CONTRACTS_DATABASE_URL`/
`CONTRACTS_READER_URL` (dual-pool, ADR-0026), `S3_*` (storage, ADR-0019). Detalhes em [02](./02-http-api.md).

## 4. Banco & secrets

```bash
pnpm run db:generate         # Drizzle Kit → migrations contracts (mysql)
pnpm run db:generate:auth    # migrations auth
pnpm run secrets:setup       # gera ./secrets/*.txt para docker compose
```

MySQL 8.4 via [`compose.yaml`](../compose.yaml) (+ MinIO para storage). Isolamento por prefixo de tabela:
`ctr_*` (contracts), `auth_*` (auth), `outbox` (ADR-0014). **Journal de migrations por módulo**
(`__drizzle_migrations_contracts` / `__drizzle_migrations_auth`) — necessário quando dois módulos
compartilham o DB `core`.

## 5. Testes de integração & E2E (Docker)

```bash
pnpm run test:integration              # contracts: sobe MySQL --wait + migrations + repos Drizzle
pnpm run test:integration:infra        # suite mysql-compose (COMPOSE_INTEGRATION=1 + override compose.ci.yaml)
pnpm run test:integration:auth         # auth (MYSQL_INTEGRATION=1)
pnpm run test:integration:storage      # storage S3 contra MinIO
pnpm run test:integration:notifications
pnpm run test:e2e:auth                 # smoke E2E: server real + MySQL + fetch (scripts/e2e/auth.sh)
pnpm run test:e2e:contracts            # smoke E2E contracts: dual-pool + RBAC + fetch
```

Os scripts E2E sobem o compose, iniciam o server real e fazem teardown (`trap`) mesmo em falha. Exigem
Docker; não entram no `pnpm test`.

**Opt-in por env var:** suites de integração descobertas pelo glob (ex.: `tests/infra/mysql-compose.test.ts`)
só executam o bootstrap quando a flag correspondente está setada (`COMPOSE_INTEGRATION`, `MYSQL_INTEGRATION`,
`STORAGE_INTEGRATION`, …). Sem a flag a suite fica `skipped` — nunca `failed` — então `pnpm test` puro
permanece verde mesmo com o Docker daemon vivo. Use sempre o script `test:integration:*` dedicado.

## 6. Como o trabalho anda

**Não existe pipeline W0→W3, ticket com `STATE.json`, wave nem spec-kit** — foram removidos em 2026-08-06.
Trabalho novo não abre ticket de processo: faz a mudança, roda o gate da §2 e commita. Decisão nova vira
ADR em `handbook/architecture/adr/`; achado fora do escopo atual vira issue no GitHub, pela skill
[`issue-report`](../.claude/skills/issue-report/SKILL.md).

O harness é só primitivas nativas do Claude Code — `.claude/rules/` (carregam por path), `.claude/skills/`,
`.claude/agents/`, `.claude/hooks/` + `settings.json`. Ver [`CLAUDE.md`](../CLAUDE.md) §"Harness".

Documentação tem gates próprios: `pnpm run docs:links` (link morto), `pnpm run docs:index` (derivados das
inquiries) e o de lápide, que exige declarar em [`handbook/redirects.json`](../handbook/redirects.json)
todo `.md` citado que for apagado ou movido.

## 7. Estrutura do repositório (resumo)

```
src/
├── server.ts                 # entrypoint HTTP (composition root)
├── shared/                   # kernel (VOs), http/ (app, errors, reply), primitives (Result), ports
├── jobs/ workers/            # one-shot (sweeper, backfill) e long-running (outbox, projeções)
└── modules/<m>/              # auth, contracts, partners, programs, financial, budget-plans, notifications
    ├── domain/ application/ adapters/ public-api/
tests/                        # mirror de src/; *.test.ts (unit), *.e2e.ts (E2E Docker), cleanup/ (invariantes)
handbook/                     # acervo: architecture/adr/, decisions/, domain_questions/, inquiries/, reference/<tech>/
docs/                         # esta documentação consolidada
.claude/                      # rules/, skills/, agents/, hooks/ + settings.json
scripts/                      # ci/, handbook/, e2e/, setup-secrets
```
