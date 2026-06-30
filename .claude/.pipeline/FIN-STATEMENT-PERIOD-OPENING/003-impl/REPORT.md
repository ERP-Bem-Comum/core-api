# W1 — Implementação · FIN-STATEMENT-PERIOD-OPENING (#205)

**Outcome:** GREEN · **Data:** 2026-06-22

Alteração só no use-case `application/use-cases/get-account-statement.ts` (sem novo port, sem domínio):

- 1 query `listTransactionsByPeriod(ref, HISTORY_START, to)` (constante `HISTORY_START = 1970-01-01`).
- Particiona: `before = date < from`, `inRange = date >= from`.
- `periodOpening = buildStatementView(accountOpening, before, 'all').closingBalanceCents`.
- `view = buildStatementView(periodOpening, inRange, filter)`.

Uma única ida ao repo (a partição é em JS) — necessária porque o saldo de abertura do período é o saldo
corrido até `from`. Reusa `buildStatementView` (função pura do #139), idêntico ao padrão do F1.

**RED → GREEN:** novo teste passa (opening 15000, closing 14000, 2 linhas). Os 3 testes do #139 seguem
verdes (txs dentro do range → `before=[]` → abertura = abertura da conta, comportamento preservado).
`pnpm test` fail 0 (zero regressão).
