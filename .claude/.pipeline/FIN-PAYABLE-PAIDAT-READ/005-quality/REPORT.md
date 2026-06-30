# W3 — Gate de Qualidade (ALL-GREEN) · FIN-PAYABLE-PAIDAT-READ (#231)

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ (meta JSON da migration formatado) |
| `pnpm run lint` | ✅ |
| `pnpm test` (unit) | ✅ **3147 pass · 0 fail · 18 skipped** |
| `pnpm run test:integration:financial` (Docker) | ✅ **53 pass · 0 fail** (migration 0021 + paid_at round-trip) |

## DoD (#231)

- [x] `paidAt` (`string|null`, date-only) por item em `GET /payable-titles`.
- [x] baixa manual grava `fin_payables.paid_at`.
- [x] migration versionada (`0021_slippery_red_shift.sql`).
- [ ] caminho automático/remessa — **follow-up** (fora do escopo).
- [ ] **issue #231 fechada** — pendente de commit → PR → merge.

Ticket **closed-green** (com validação de integração Drizzle).
