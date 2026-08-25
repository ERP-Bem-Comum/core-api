---
name: ctr-auto-expire-lock-decision
description: CTR-AUTO-EXPIRE CA5 — decisão de concorrência findExpirable: SELECT simples (sem FOR UPDATE) porque runSweep usa 2 tx separadas
metadata:
  type: project
---

CTR-AUTO-EXPIRE (issue #39, branch feat/ctr-auto-expire): `findExpirable` usa SELECT simples sem `FOR UPDATE SKIP LOCKED`.

**Why:** `runSweep` chama `findExpirable` (tx A) e depois `repo.save` por contrato (tx B) — transações separadas. Um `FOR UPDATE` dentro de tx A liberaria os locks no COMMIT da tx A, antes que o `save` em tx B ocorra. O lock não persiste entre as duas transações → não previne double-expire em cenário multi-instância. ADR-0041 §"Decisão (4)" define: coordenação multi-instância via `GET_LOCK('contracts:auto-expire:<data>', 0)` ou tabela `UNIQUE(job_name, run_date)` é F-Plus. Hoje = single-instance + cron one-shot → SELECT simples é correto.

**How to apply:** Se o sweeper migrar para multi-instância, implementar `GET_LOCK` ou tabela `ctr_job_executions(job_name VARCHAR, run_date DATE, UNIQUE(job_name, run_date))` com INSERT IGNORE — não redesenhar `findExpirable` com FOR UPDATE sem revisar o ciclo de vida da transação primeiro.

**Artefatos entregues:**
- `contract-repository.in-memory.ts` — `findExpirable` com filtro `Active+Fixed+end<cutoff`, sort `(end ASC, id ASC)`, limit
- `contract-repository.drizzle.ts` — `findExpirable` com `WHERE status='Active' AND current_period_kind='Fixed' AND current_period_end < :cutoff ORDER BY current_period_end ASC, id ASC LIMIT :n`
- `schemas/mysql.ts` — índice composto `ctr_contracts_expirable_idx(status, current_period_kind, current_period_end)`
- `migrations/mysql/0014_mysterious_randall_flagg.sql` — `CREATE INDEX ctr_contracts_expirable_idx`
- `tests/.../find-expirable.mysql.test.ts` — 6 cenários (CA1-CA5 + CA1b misto), opt-in MYSQL_INTEGRATION=1
