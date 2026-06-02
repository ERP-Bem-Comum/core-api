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

## 2. Qualidade (gate W3)

```bash
pnpm run typecheck      # tsc --noEmit (strict completo)
pnpm run lint           # eslint . (typescript-eslint strict + type-checked)
pnpm run lint:fix
pnpm run format         # prettier --write .
pnpm run format:check   # prettier --check .
pnpm test               # node:test + --experimental-strip-types  (tests/**/*.test.ts)
```

`pnpm test` roda só unit/integration em memória. Testes que exigem Docker (sufixo `.e2e.ts` ou flags de
integração) ficam **fora** do glob — ver §6.

## 3. CLI (UX da P.O.)

A CLI valida regras de negócio sem servidor, com adapters InMemory por default:

```bash
pnpm run cli:contracts -- --help
pnpm run cli:contracts -- listar-contratos
pnpm run cli:contracts -- listar-contratos --driver mysql \
  --connection-string 'mysql://user:pass@127.0.0.1:3306/core'
pnpm run cli:financial -- --help     # módulo financial (Fase 2, em construção)
```

**Drivers** (flag `--driver`): `memory` (default; state em `./cli-state.json` ou `--no-state`) ou `mysql`
(Drizzle/mysql2; migration aplicada no boot). Ver [`.claude/rules/adapters.md`](../.claude/rules/adapters.md).

## 4. Servidor HTTP

```bash
pnpm run serve          # sobe Fastify (default driver memory). /docs = OpenAPI UI; /health
```

Env relevantes: `PORT`, `AUTH_DRIVER`/`AUTH_DATABASE_URL`, `CONTRACTS_DRIVER`/`CONTRACTS_DATABASE_URL`/
`CONTRACTS_READER_URL` (dual-pool, ADR-0026), `S3_*` (storage, ADR-0019). Detalhes em [02](./02-http-api.md).

## 5. Banco & secrets

```bash
pnpm run db:generate         # Drizzle Kit → migrations contracts (mysql)
pnpm run db:generate:auth    # migrations auth
pnpm run secrets:setup       # gera ./secrets/*.txt para docker compose
```

MySQL 8.4 via [`compose.yaml`](../compose.yaml) (+ MinIO para storage). Isolamento por prefixo de tabela:
`ctr_*` (contracts), `auth_*` (auth), `outbox` (ADR-0014). **Journal de migrations por módulo**
(`__drizzle_migrations_contracts` / `__drizzle_migrations_auth`) — necessário quando dois módulos
compartilham o DB `core`.

## 6. Testes de integração & E2E (Docker)

```bash
pnpm run test:integration              # contracts: sobe MySQL --wait + migrations + repos Drizzle
pnpm run test:integration:infra        # suite mysql-compose (COMPOSE_INTEGRATION=1 + override compose.ci.yaml)
pnpm run test:integration:auth         # auth (MYSQL_INTEGRATION=1)
pnpm run test:integration:storage      # storage S3 contra MinIO
pnpm run test:integration:notifications
pnpm run test:e2e:auth                 # smoke E2E: server real + MySQL + fetch (scripts/e2e-auth.sh)
pnpm run test:e2e:contracts            # smoke E2E contracts: dual-pool + RBAC + fetch
```

Os scripts E2E sobem o compose, iniciam o server real e fazem teardown (`trap`) mesmo em falha. Exigem
Docker; não entram no `pnpm test`.

**Opt-in por env var:** suites de integração descobertas pelo glob (ex.: `tests/infra/mysql-compose.test.ts`)
só executam o bootstrap quando a flag correspondente está setada (`COMPOSE_INTEGRATION`, `MYSQL_INTEGRATION`,
`STORAGE_INTEGRATION`, …). Sem a flag a suite fica `skipped` — nunca `failed` — então `pnpm test` puro
permanece verde mesmo com o Docker daemon vivo. Use sempre o script `test:integration:*` dedicado.

## 7. Pipeline fail-first W0→W3

Toda mudança não-trivial em produção abre um ticket em `.claude/.pipeline/<TICKET-ID>/` e passa por 4
waves: **W0** testes RED → **W1** implementação até GREEN → **W2** code review read-only (máx 3 rounds) →
**W3** gate de qualidade. Disciplina: W0 RED antes de tocar `src/`.

```bash
pnpm run pipeline:state init <TICKET> --size S          # cria STATE.json
pnpm run pipeline:state wave-start <TICKET> W0 --agent tdd-strategist
pnpm run pipeline:state wave-finish <TICKET> W0 --outcome RED --report 002-tests/REPORT.md
pnpm run pipeline:state close <TICKET>                  # exige as 4 waves done
pnpm run pipeline:status                                # dashboard de tickets
pnpm run pipeline:metrics
```

`STATE.json` é canônico; `STATE.md` é gerado. Tickets fechados são histórico auditável — **não deletar**.
Ver [`CLAUDE.md`](../CLAUDE.md) §"Pipeline" e [`.claude/skills/pipeline-maestro/`](../.claude/skills/pipeline-maestro/).

## 8. Estrutura do repositório (resumo)

```
src/
├── server.ts                 # entrypoint HTTP (composition root)
├── shared/                   # kernel (VOs), http/ (app, errors, reply), primitives (Result), ports
└── modules/<m>/              # contracts, auth, financial, notifications
    ├── domain/ application/ adapters/ public-api/ cli/
tests/                        # mirror de src/; *.test.ts (unit), *.e2e.ts (E2E Docker)
handbook/                     # fonte de verdade: adr/, domain/, reference/<tech>/, …
docs/                         # esta documentação consolidada
.claude/                      # rules/, skills/, agents/, .pipeline/, .planning/, hooks/
scripts/                      # pipeline/, e2e-*.sh, setup-secrets
```
