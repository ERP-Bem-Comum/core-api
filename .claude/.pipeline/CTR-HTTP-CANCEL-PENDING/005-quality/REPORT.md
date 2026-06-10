# 005 — W3 (quality gate) — CTR-HTTP-CANCEL-PENDING

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ Prettier clean |
| Lint | `pnpm run lint` | ✅ sem erros (switch-exhaustiveness ok após `ContractCancelled` em timeline-delivery) |
| Test (unit) | `pnpm test` | ✅ **2673 pass / 0 fail / 19 skipped** (2692 total) |
| Integração | `drizzle-mysql.test.ts` + `migrations/*.test.ts` (MySQL real, `MYSQL_INTEGRATION=1`) | ✅ **43/43** |

## Integração (MySQL 8 real via Docker)

- Migration `0011_kind_tigra.sql` aplicada (DROP+ADD dos 3 CHECKs).
- Novo caso `Cancelled: save + findById round-trip (CHECKs + mapper)` — **passou**: o INSERT de um
  `CancelledContract` (ended_at NOT NULL + vigência NULL) satisfaz `pending_consistency` e
  `ended_at_consistency` simultaneamente; o mapper round-trip preserva status + endedAt.
- Suite contratual de ContractRepository + CA-11 (UNIQUE) seguem verdes.
- Container derrubado (`down -v`) + secrets removidos ao fim.

## Conclusão

W3 GREEN. Ticket pronto para `close` + mover `handbook/tickets/todo/` → `done/`.
