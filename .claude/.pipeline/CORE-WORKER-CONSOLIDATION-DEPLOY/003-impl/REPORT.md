# W1 — Implementação (GREEN) · CORE-WORKER-CONSOLIDATION-DEPLOY

**Agente:** docker-compose-expert (compose) + edição de doc.

## Mudanças

### `compose.yaml` (core-api)
- Seção `workers` reescrita: **6 serviços standalone → 3 serviços de grupo**:
  - `worker-outbox` (`WORKER_GROUP=outbox`) — secrets contracts + partners.
  - `worker-projections` (`WORKER_GROUP=projections`) — secrets contracts + partners + financial.
  - `worker-email` (`WORKER_GROUP=email`) — secrets auth + partners + smtp_pass; env `EMAIL_*` preservado.
- Cada grupo executa `src/workers/runner/run.ts` (não mais o `run.ts` por-worker); herda `x-worker-base` (restart, cap_drop ALL, read_only, no-new-privileges, tmpfs, depends_on mysql+http healthy).
- Comentários "5 workers" → "3 workers consolidados (grupos)" (linhas 22, 39); header da seção reescrito com a aritmética 9→3 pools + rationale (dedup por connection-string, ADR-0014).

### `handbook/incidents/0001-*.md`
- §6.3: item **Consolidação dos workers** (6→3 proc, 9→3 pools) marcado `[x]`, ligando #407 (Fatia 1 código + Fatia 2 deploy) à causa #2.

## Descoberta (correção de escopo)

O lado **ERP-INFRA já estava feito** na branch `feat/worker-consolidation-407` (não-mergeada, 4 commits sobre `origin/main`):
- 3 taskdefs consolidados (`worker-{outbox,projections,email}.taskdef.json`) — `WORKER_GROUP` + secrets conferem 1:1 com este compose (ex.: `worker-outbox` = CONTRACTS + PARTNERS).
- Runbook `docs/runbooks/worker-consolidation-407.md`: modelo 5→3, **5 taskdefs antigos mantidos p/ rollback** (remoção é `delete-service` em runtime, não no repo), payable-view entra em prod pela 1ª vez (backfill rastreado).
- **Validação x99 (2026-07-10)** do runner: outbox 2/2, projections 3/3 (3 conexões = 1 pool), email 1/1; `WORKER_GROUP` inválido → exit 78; backfill exit 0.

→ `000-request.md` corrigido: NÃO remover taskdefs (contra a decisão de rollback); o compose do core-api era a peça faltante.

## Validação local (sem docker)

Docker não instalado neste Mac → `docker compose config` indisponível; validação estrutural:

```
WORKER_GROUP:            3   (outbox, projections, email)
src/workers/runner/run.ts: 3 nos serviços (+1 no comentário)
run.ts standalone:       0
serviços de grupo:       worker-outbox, worker-projections, worker-email
legados remanescentes:   nenhum
```

Sintaxe YAML completa (anchors `<<: *x-worker-base` resolvidos) + CA-1..CA-6 → validados via `docker compose config` no x99/CI (teste `tests/infra/worker-runner-compose.test.ts`). Pendente: subir os 3 grupos via compose no x99.

## Estado

GREEN estrutural no core-api. Próximo: W2 (review read-only) + W3 (gate local; teste de infra skipa sem docker) + validação x99 do compose.
