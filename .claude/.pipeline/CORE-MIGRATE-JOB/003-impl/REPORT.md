# W1 — Implementação (GREEN) — CORE-MIGRATE-JOB (Slice A)

**Resultado:** 24/24 testes do migrate verdes + typecheck limpo.

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `src/modules/{auth,contracts,financial,notifications,partners,programs}/public-api/migrate.ts` | 6× porta pública `applyMigrations(connStr)` — `open*Mysql({applyMigrations:true})` + `close` (ADR-0006) |
| `src/jobs/migrate/migrate.ts` | Orquestrador puro `runMigrations` (fail-fast + callback `onMigrated`) |
| `src/jobs/migrate/config.ts` | `readMigrateConfig` (lê `MIGRATE_DATABASE_URL`) |
| `src/jobs/migrate/run.ts` | Entrypoint one-shot (exit 0/78/1, `process.exitCode`) |

## Arquivos editados

- `compose.yaml` — service `migrate` (`<<: *x-job-base`, profile `jobs`, wrapper `$(cat)`, secret `migrate_database_url`) + secret top-level.
- `scripts/setup-secrets.ts` — `migrate_database_url` em `DATABASE_URL_SECRETS`.
- `package.json` — script `job:migrate` (consistente com `job:contracts:sweep`/`job:financial:*`).

## Roteamento por agente (pedido do Gabriel)

- **docker-compose-expert** — implementou o service `migrate`; teste `migrate-compose` 14/14.
- **pnpm-workspace-expert** — decidiu+adicionou `job:migrate` (jobs têm script dedicado no repo); **sem dep nova, lockfile intacto**.
- **nodejs-runtime-expert** — **runtime aprovado** (0 Blocker/Major). Confirmou que os 6 drivers fecham o pool internamente no caminho de erro (sem leak) e o fail-fast não deixa pool vivo dos módulos anteriores.

## Correções aplicadas após os agentes

- **Minor-3 (nodejs-expert)** — observabilidade: `runMigrations` ganhou callback `onMigrated`; `run.ts` loga `[migrate] <m>: ok` por módulo (operador vê o progresso antes de um fail-fast). +2 testes.
- Comentário do compose corrigido (`outbox` → `notifications` como 6º módulo).
- `command: []` artificial removido do compose; a causa raiz (teste spread de `null`) foi corrigida tornando o `asArr` null-safe em `migrate-compose.test.ts`.

## Não-regressão

Guard CA9 verde: as 5 compositions HTTP mantêm `applyMigrations: true` — o Slice A **não** inverte o boot (Slice B).
