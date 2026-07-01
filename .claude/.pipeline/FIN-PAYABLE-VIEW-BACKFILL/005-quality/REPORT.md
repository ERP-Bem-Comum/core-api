# W3 — GREEN · FIN-PAYABLE-VIEW-BACKFILL (#236)

Skill: **`ts-quality-checker`**.

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` | ✅ **3313 pass · 0 fail · 18 skipped** |

Integração e2e (`backfill.integration.test.ts`: backfill + idempotência no banco) gated `MYSQL_INTEGRATION` (Docker down local → CI/VM).

## DoD

Job one-shot `payable-view-backfill` popula `fin_payable_view` do histórico (`fin_payables ⋈ fin_documents`), cobrindo o GAP do worker (payables sem evento no outbox), idempotente, sem regredir status gerido pelo worker. Script `job:financial:payable-view-backfill`. **Completa a Camada 0 (FND-RM)** — read-model reflete todo o histórico. Destrava os widgets (#237/#239/#241/#112/#114).
