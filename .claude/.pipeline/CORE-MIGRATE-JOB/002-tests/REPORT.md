# W0 — Testes RED — CORE-MIGRATE-JOB (Slice A)

**Skill:** `tdd-strategist`. **Resultado:** RED (a API não existe). Guard de não-regressão verde.

## Arquivos de teste

| Arquivo | CAs | Camada |
| --- | --- | --- |
| `tests/jobs/migrate/migrate.test.ts` | CA2, CA3, CA5 | unit puro (orquestrador, fakes — sem DB) |
| `tests/jobs/migrate/config.test.ts` | CA4 | unit puro (`readMigrateConfig`) |
| `tests/jobs/migrate/public-api-contract.test.ts` | CA1 | contrato (importa os 6 `public-api/migrate.ts`) |
| `tests/infra/migrate-compose.test.ts` | CA6, CA7, CA8, CA9 | meta (`docker compose config` + source) |

## Status

- **RED** (esperado): CA1-CA5 falham no import (`src/jobs/migrate/*` e os 6 `public-api/migrate.ts`
  não existem); CA6/CA7 falham (`migrate` ausente no compose); CA8 falha (`migrate_database_url`
  ausente em `setup-secrets.ts`).
- **GREEN** (guard CA9): as 5 compositions HTTP mantêm `applyMigrations: true` — confirma que o
  Slice A **não** inverte o boot (isso é o Slice B). Quebra se alguém inverter dentro deste ticket.

## API alvo (a implementar no W1)

- `src/jobs/migrate/migrate.ts` → `runMigrations(migrators, connStr): Result<string[], {module,error}>` (fail-fast).
- `src/jobs/migrate/config.ts` → `readMigrateConfig(env): Result<{connectionString}, error>` (lê `MIGRATE_DATABASE_URL`).
- `src/jobs/migrate/run.ts` → entrypoint one-shot (exit 0/78/1, `process.exitCode`).
- `src/modules/<m>/public-api/migrate.ts` (6×) → `applyMigrations(connStr): Result<true, <M>DriverError>`.
- compose: service `migrate` (profile jobs, one-shot, secret `migrate_database_url`).
- `setup-secrets.ts`: +`migrate_database_url` em `DATABASE_URL_SECRETS`.
