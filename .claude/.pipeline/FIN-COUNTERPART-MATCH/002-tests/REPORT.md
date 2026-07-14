# W0/W1 (em progresso) · FIN-COUNTERPART-MATCH (US2 · spec 029 · #269)

> **Estado: fatiado por TDD (red→green por componente).** Skill W0 `tdd-strategist`. Módulo `financial` (worktree `269-counterpart`). **Uncommitted.**

## Feito (GREEN)

### 1. Domínio `ExpectedCounterpart.match` (T018) ✅
- Teste `tests/modules/financial/domain/expected-counterpart/match.test.ts` (RED→GREEN).
- `match(counterpart, matchedTransactionRef)` em `expected-counterpart.ts`: exige `Pending` (senão `counterpart-not-pending`), `Pending→Matched`, grava `matchedTransactionRef`, emite `TransferCounterpartMatched`. Vínculo A↔B = `originReconciliationRef` (A) + `matchedTransactionRef` (B).

### 2. Application `suggestCounterpartMatches` (T019) ✅
- Teste `tests/modules/financial/application/use-cases/suggest-counterpart-matches.test.ts` (3 casos, RED→GREEN).
- `suggest-counterpart-matches.ts`: casa transação de B × contrapartida `Pending` da MESMA conta por **valor exato + movimento igual + janela ~5d** (reusa `match-score.dateWithinTolerance`, exportada). Empate → mais antiga (`expectedDate` asc, CA4). `CounterpartSuggestion = { counterpartId, originAccountRef, valueCents, expectedDate, score }`.

### 3. Application + persistência `confirmCounterpartMatch` (T020) ✅
- Teste `tests/modules/financial/application/use-cases/confirm-counterpart-match.test.ts` (RED→GREEN).
- Use-case `confirm-counterpart-match.ts`: guards (tx Pending, conta não Closed, período aberto, contrapartida Pending, `destinationAccountRef==debitAccountRef`, valor exato) → `match()` → cria perna B (`confirmManualEntry` Transfer, destino=conta A) → `reconciliationRepo.confirmCounterpartMatch(legB, matchedCounterpart, txId, events)`.
- **Método atômico** `confirmCounterpartMatch` no port `ReconciliationRepository` + **in-memory** (Map de contrapartidas compartilhado, refatorado em `expected-counterpart-store.in-memory` p/ aceitar Map externo) + **Drizzle** (1 tx: INSERT recon+manual_entry, UPDATE tx→Reconciled, UPDATE contrapartida→Matched com guard de corrida, outbox).
- Suíte completa **3952 pass, 0 fail** (zero regressão do port change + refactor in-memory).

## Pendente — BORDA HTTP + W2/W3

**Decisão de modelagem (Gabriel, 2026-07-13): ManualEntry-espelho atômico.** A perna de B vira uma
`Reconciliation` `ManualEntry` type=`Transfer` (simétrica à perna A), consistente com o invariante
"transação `Reconciled` ⟹ tem `Reconciliation`" (undo/lookup reverso funcionam).

Plano concreto:
1. **Port** `ReconciliationRepository`: novo método atômico `confirmCounterpartMatch(reconciliationB, counterpart, transactionId, events)` — 1 tx: INSERT `fin_reconciliations`(ManualEntry/Transfer) + `fin_manual_entries` + UPDATE `fin_statement_transactions` B→`Reconciled` + UPDATE `fin_expected_counterpart`→`Matched` + INSERT outbox (`ManualEntryRecorded` + `TransferCounterpartMatched`). Adapters in-memory + Drizzle.
2. **Use-case** `confirm-counterpart-match.ts`: guards (tx `Pending`, conta não `Closed`, período aberto, contrapartida `Pending`, `destinationAccountRef==debitAccountRef`, valor exato) → `match()` domínio → cria a `Reconciliation` ManualEntry (perna B, `confirmManualEntry` do domínio, destino=conta A) → `reconciliationRepo.confirmCounterpartMatch(...)`.
3. **Borda HTTP** (`fastify-server-expert`↔`zod-expert`): `get-statement-suggestions`/suggestions expõem `kind: 'payable' | 'counterpart'`; `confirm` aceita `target: { kind:'counterpart', counterpartId }`; `error-mapping` (`counterpart-not-pending`→409, `counterpart-not-found`→422).
4. **Wiring** composition + W3 (gate + integração OrbStack).

## Testes RED a escrever no confirm
- T020a domínio: (coberto por match.test.ts).
- T020b application `confirm-counterpart-match.test.ts`: confirmar consome (Matched) + transação B `Reconciled` + 0 duplicata + vínculo A↔B.
- Repo (in-memory): `confirmCounterpartMatch` marca tx + contrapartida atômico.
