# W0 — Testes RED (CTR-SWEEPER-JOB-LOCK)

**Resultado:** 🔴 RED (esperado) — disciplina `tdd-strategist`.

## Teste adicionado

`tests/modules/contracts/adapters/persistence/job-run.drizzle-mysql.test.ts` (integração, MYSQL_INTEGRATION):
`claimJobRun(handle, jobName, runKey, now)` — 1ª chamada adquire (`true`); 2ª com a mesma chave → `false`
(INSERT IGNORE bate na PK); chave diferente → `true`.

## RED

```
node --test ...job-run.drizzle-mysql.test.ts → ERR_MODULE_NOT_FOUND (job-run.drizzle.ts) — 1 fail
```

Falta (W1): tabela `ctr_job_runs` (PK `job_name`+`run_key`) + migration; adapter `claimJobRun` (INSERT
IGNORE → `affectedRows>0`); integrar no `src/jobs/contracts/sweeper/run.ts` (claim do dia antes do sweep;
se não adquiriu → skip com exit 0). Piloto da coordenação multi-instância (ADR-0041; doc de pesquisa).
