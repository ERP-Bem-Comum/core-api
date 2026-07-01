# W1 — GREEN · FIN-PAYABLE-VIEW-BACKFILL (#236)

Disciplinas: `ports-and-adapters` (core) + `drizzle-orm-expert` (reader SELECT) + `nodejs-fs-scripter` (job).

## Mudanças
| Arquivo | Mudança |
| :-- | :-- |
| `src/jobs/financial/payable-view-backfill/backfill.ts` | core `backfillPayableViews` (upsert em lote, `{applied,failed}`) — puro. |
| `.../reader.ts` | `readPayableBackfillRecords` — SELECT `fin_payables ⋈ fin_documents` → PayableView[] (status via `documentStatusToViewStatus`; enum/dueDate inválido → skip). Extraído p/ ser testável. |
| `.../run.ts` | job entrypoint fino (reader + backfill; exit codes sysexits). |
| `package.json` | script `job:financial:payable-view-backfill`. |
| `tests/.../backfill.test.ts` | CA1/CA2/CA3 (in-memory, idempotência). |
| `tests/.../backfill.integration.test.ts` | CA4 e2e gated `MYSQL_INTEGRATION` (seed via Document.create+repo → reader → backfill → assert). |

## Design
Backfill cobre o GAP do worker (payables sem evento no `fin_outbox`); upsert **preserva status** (não clobbera linhas do worker). Idempotente (upsert por payableId).

## Verificação
backfill unit: 3/3 GREEN; `typecheck`+`format`+`lint` verdes; suíte **3313 pass / 0 fail**. Integração gated (Docker/CI).
