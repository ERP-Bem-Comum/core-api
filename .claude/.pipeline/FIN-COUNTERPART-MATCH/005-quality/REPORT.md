# W3 — Gate de qualidade · FIN-COUNTERPART-MATCH (US2 · spec 029 · #269)

> **Outcome:** **GREEN** · Skill `ts-quality-checker` · validação MySQL 8.4 no **OrbStack** (x99 offline, autorizado)

## Gate de código

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ verde |
| `pnpm run lint` | ✅ verde |
| `pnpm test` (unit) | ✅ **3953 pass · 0 fail · 19 skipped** |
| `pnpm run test:integration:financial` (MySQL 8.4 OrbStack) | ✅ **74 pass · 0 fail** |

## Validação MySQL real do método atômico

Novo teste de integração `expected-counterpart-store.drizzle-mysql` §CA2: `reconciliationRepo.confirmCounterpartMatch` executa a unit-of-work **atômica** (INSERT `fin_reconciliations` + `fin_manual_entries`, UPDATE `fin_statement_transactions`→Reconciled, UPDATE `fin_expected_counterpart`→Matched, INSERT `fin_outbox`) contra o MySQL real. Asserções: contrapartida `Matched` (grava `matchedTransactionRef`), transação `Reconciled`, evento `TransferCounterpartMatched` no outbox. **Passou** — sem o bug de CHECK que o CREATE teve (o `aggregate_type='ExpectedCounterpart'` já entrou no CHECK do `fin_outbox` na migration 0034 do CREATE).

## Cobertura do ticket

- **Domínio** `match` — unit (`match.test.ts`).
- **Application** `suggestCounterpartMatches` (3 casos) + `confirmCounterpartMatch` (2 casos) — unit in-memory.
- **Borda HTTP** — E2E `financial-counterpart.http.test.ts` (`fastify.inject`): GET suggestões → confirm bogus (422) → confirm (201) → GET vazio.
- **Persistência** — integração MySQL do método atômico (CA2) + save/list/find da contrapartida (CA1/CA4 do CREATE).

## Estado do ticket

W0 RED ✅ · W1 GREEN ✅ · W2 APPROVED ✅ · W3 GREEN ✅. **Pronto para `close`.** US2 = 2/3 stories da feature 029 (falta US3 UNDO). Não fecha #269.
