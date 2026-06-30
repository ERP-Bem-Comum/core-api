# W1 — Implementação (CTR-SWEEPER-JOB-LOCK)

**Resultado:** 🟢 GREEN — disciplina `drizzle-schema-author` + `nodejs-process-runner`.

## Mudança

- `contracts/.../schemas/mysql.ts` — tabela `ctrJobRuns` (PK `job_name`+`run_key`, `started_at`) + tipos.
- `migrations/mysql/0015_*.sql` — gerada por `db:generate` + CHARSET/COLLATE manual.
- `contracts/.../repos/job-run.drizzle.ts` — `claimJobRun(handle, jobName, runKey, now)`: `INSERT IGNORE`
  → `affectedRows>0` (adquiriu) / `0` (já reivindicado). Boundary → `Result`.
- `src/jobs/contracts/sweeper/run.ts` — antes do sweep, `claimJobRun('contracts-sweeper', <data UTC>)`;
  se não adquiriu → skip com exit 0; erro de claim → exit 1. Backstop sobre o cron singleton (ADR-0041).

## Incidente de working tree (consertado)

Durante o W1, `persistence/repos/` (contracts) foi movido p/ `migrations/mysql/repos/` (causa não
determinada; não reproduziu). Restaurado do HEAD (`git checkout HEAD -- .../repos/`) + diretório errado
removido + `job-run.drizzle.ts` recriado no lugar certo. Verificado: `repos/` íntegro, sem recorrência.

## Execução

```
pnpm run typecheck / lint → verde
test:integration (contracts) → 88/88 — inclui claimJobRun (adquire/não-adquire contra MySQL real)
```

Piloto da coordenação de jobs (1 módulo — contracts). O backfill/financial pode adotar depois.
