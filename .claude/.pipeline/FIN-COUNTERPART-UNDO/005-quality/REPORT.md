# W3 — Gate de qualidade · FIN-COUNTERPART-UNDO (US3 · spec 029 · #269)

> **Outcome:** **GREEN** · Skill `ts-quality-checker` · MySQL 8.4 no OrbStack

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ verde |
| `pnpm run lint` | ✅ verde |
| `pnpm test` (unit) | ✅ **3959 pass · 0 fail · 19 skipped** |
| `pnpm run test:integration:financial` (OrbStack) | ✅ **75 pass · 0 fail** |

## Validação MySQL do método atômico
`expected-counterpart-store.drizzle-mysql` §CA1(US3): `undoCounterpartOrigin` executa a unit-of-work atômica (UPDATE `fin_reconciliations`→Undone + `fin_statement_transactions`→Pending + `fin_expected_counterpart`→Discarded + INSERT `fin_outbox`) contra o MySQL real. Asserções: contrapartida `Discarded`, tx A `Pending`, conciliação A `Undone`, evento `TransferCounterpartDiscarded` no outbox. **Passou.**

## Estado
W0 RED ✅ · W1 GREEN ✅ · W2 APPROVED ✅ · W3 GREEN ✅. **Fecha a feature 029 (US1+US2+US3) → #269 pode ser fechada.**
