# W3 — GREEN · FIN-DASHBOARD-RECENT-PAYMENTS (#239)

Skill: **`ts-quality-checker`**.

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` | ✅ **3314 pass · 0 fail · 18 skipped** |

Integração (migration 0029 + backfill dos novos campos) via CI/VM (Docker gated). **Nota de merge:** ao mesclar junto com #236 (backfill), o `reader.ts` do backfill deve popular `paid_at`/`debit_account_ref` da fonte (`fin_payables.paid_at` + `fin_documents.debit_account_ref`) — follow-up de convergência de branches.

## DoD
Read-model carrega `paid_at`+`debit_account_ref`; `GET /financial/dashboard/recent-payments` expõe Top-5 pagos por data+conta+valor (Money=string, refs=string, `reference:read`). Fecha #239.
