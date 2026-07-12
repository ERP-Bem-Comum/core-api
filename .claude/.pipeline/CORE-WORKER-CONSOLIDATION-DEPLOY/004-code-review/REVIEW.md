# W2 — Code Review (read-only) · CORE-WORKER-CONSOLIDATION-DEPLOY

**Skill:** code-reviewer. Escopo: `compose.yaml` (3 grupos) + `tests/infra/worker-runner-compose.test.ts` + consistência com `src/workers/runner/specs.ts` e os taskdefs Fargate (ERP-INFRA).

## Verificações

### Consistência compose ↔ `specs.ts` (GROUPS) — OK
| Grupo | Factories (`GROUPS`) | URLs lidas pelas factories | Secrets no compose |
| --- | --- | --- | --- |
| outbox | contracts + partners | CONTRACTS, PARTNERS | contracts, partners ✓ |
| projections | supplier + payable + contract-count | (PARTNERS+FINANCIAL), FINANCIAL, (CONTRACTS+PARTNERS) | contracts, partners, financial ✓ |
| email | email-dispatch | AUTH [+PARTNERS], EMAIL_*/SMTP_* | auth, partners, smtp_pass + env EMAIL_* ✓ |

União de secrets por grupo bate exatamente com o que as factories exigem. Todos os 5 secrets existem no `secrets:` top-level.

### Consistência compose ↔ taskdefs Fargate (ERP-INFRA `feat/worker-consolidation-407`) — OK
- `WORKER_GROUP` e secrets idênticos por grupo (ex.: `worker-outbox` = CONTRACTS+PARTNERS; `worker-email` = AUTH+PARTNERS+SMTP_PASS).
- Command único `src/workers/runner/run.ts` nos dois.

### Achado (corrigido) — `OUTBOX_CONSUMER_ID` ausente no compose
- **Severidade:** Minor (observabilidade, não corretude).
- Os taskdefs antigos davam `OUTBOX_CONSUMER_ID` distintos (`outbox-contracts`/`outbox-partners`). No grupo consolidado ambas as factories leem o **mesmo** env; o taskdef Fargate consolidado seta `OUTBOX_CONSUMER_ID=worker-outbox` (por-grupo). O compose omitia → dev usava o default `outbox-logger-default`, divergindo de prod.
- **Fix aplicado:** `OUTBOX_CONSUMER_ID: worker-outbox` no `worker-outbox` (espelha o taskdef). O claim do outbox é por-linha (lock na tabela), então compartilhar o consumer-id não afeta corretude — só unifica o label de log.

### Hardening — OK
Os 3 grupos herdam `x-worker-base`: `cap_drop [ALL]`, `read_only`, `no-new-privileges`, `tmpfs /tmp`, `depends_on mysql+http service_healthy`. CA-5 do teste cobre.

### Teste `worker-runner-compose.test.ts` — OK
- CA-1 isola os workers por diferença de `config --services` (com/sem `--profile workers`) — robusto (só os 3 têm `profiles: [workers]`).
- CA-2 exige `runner/run.ts` e nega `server.ts` + run.ts standalone; regex de escape correto.
- CA-3/CA-4/CA-5 leem `environment`/`secrets`/hardening do `config --format json` (helper trata mapa e array). CA-6 garante opt-in.
- Skip-guard `FIN-TEST-INFRA-SKIP-GUARD` — nunca falha por ambiente.

### Escopo — OK
- Os `run.ts` standalone (`src/modules/*/worker/run.ts`, `src/workers/*-projection/run.ts`) **permanecem** — são entrypoints de dev single-worker (`pnpm run worker:*`), não código morto. Fora de escopo removê-los.
- Os 5 taskdefs antigos permanecem no ERP-INFRA por decisão de rollback (runbook).

## Veredito

**APPROVED.** 1 achado Minor corrigido (consistência dev↔prod do consumer-id). Sem Blocker/Major.
