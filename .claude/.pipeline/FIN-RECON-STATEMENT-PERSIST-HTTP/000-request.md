# FIN-RECON-STATEMENT-PERSIST-HTTP — escopo

**GitHub:** #120 (sub-issue da feature #60) · **Branch:** `017-fin-conciliacao-bancaria` (rebaseado sobre o cedente) · **Size:** L

> Persistência + borda da importação de extrato (US1), sobre o domínio do #118 (BankStatement/Fitid) e
> os parsers do #119. Usa a fundação **conta-cedente** (`fin_cedente_accounts`/`debit_account_ref`) já
> mergeada via rebase.

## Em escopo (fatia vertical)

1. **Use-case** `importBankStatement(deps)(input)` — alvo do W0 (core):
   - `deps = { parser: BankStatementParser, repo: BankStatementRepository, clock: Clock, outbox: FinancialOutbox }`.
   - `input = { debitAccountRef, format: 'OFX'|'CSV', content }`.
   - Fluxo: `parser.parse` → (err → repassa) → **resolve FITID** por transação (nativo `Fitid.fromNative`;
     `null` → `Fitid.synthesize`) → `repo.knownFitids(debitAccountRef, fitids)` → domínio
     `importStatement(input, knownFitids)` (dedup) → `repo.save` → `outbox.append(BankStatementImported)`.
   - Output `{ statementId, imported, discardedDuplicates, period }`.
2. **Port** `BankStatementRepository` (`save`, `knownFitids`, `listTransactions`) + adapter **in-memory**.
3. **Mappers** `statement.mapper.ts` — bank-statement + transaction row↔domínio; **normaliza `entryType`
   bruto → union EN (ou `Other`)** antes de persistir (HANDOFF do W2 do #119 — CHECK do `entry_type`).
4. **Schema** `fin_bank_statements` + `fin_statement_transactions` + **índice ÚNICO `(debit_account_ref, fitid)`** (R5).
5. **Migration `0005`** via `pnpm run db:generate:financial` (+ `prettier --write` nos meta files + CHARSET/COLLATE).
6. **Adapter Drizzle** do repo (SELECT-then-... ; o índice único é a defesa de dedup no DB).
7. **Borda HTTP** `POST /api/v2/financial/bank-statements` + `GET /…/:id/transactions` + Zod + composition + error-mapping.
8. **Outbox** `BankStatementImported` (público em `public-api/events.ts`). Permissão `reconciliation:import`/`:read`.

## Fora de escopo

Match/score (#121). Conciliar/undo (#122/#123). Conta-encerrada guard FR-015 (#123/Phase 4b). Manual/lote (#124).

## Critérios de aceite

- **CA1 (use-case import)**: parser devolve 10 transações distintas → `imported=10`, `discardedDuplicates=0`,
  evento `BankStatementImported` no outbox; transações nascem `Pending`.
- **CA2 (dedup)**: repo já conhece 3 dos FITID → `imported=7`, `discardedDuplicates=3` (silencioso).
- **CA3 (malformado)**: `parser.parse` devolve `err('malformed-statement')` → use-case repassa `err`.
- **CA4 (FITID sintético)**: transação com `fitid=null` (CSV) → use-case sintetiza determinístico (não quebra dedup).
- **CA5 (mapper)**: round-trip statement/transaction row↔domínio; `entryType` bruto normalizado p/ union EN.
- **CA6 (HTTP)**: `POST /bank-statements` → 201 `{ statementId, imported, duplicatesDiscarded }`; `GET .../transactions` lista. (W1)
- **CA7 (integração, Docker)**: índice único `(debit_account_ref, fitid)` rejeita FITID duplicado no DB; repo round-trip. (W1)

## Definition of Done

W0 RED (use-case + mapper, no gate) → W1 GREEN (port+in-memory+use-case+mapper+schema+migration+Drizzle+HTTP) →
W2 → W3 (gate sem Docker) + `test:integration:financial` (Docker) verde antes do merge. Migration por
`db:generate:financial`. Idioma EN (C1).
