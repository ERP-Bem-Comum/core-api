# FIN-RECON-STATEMENT-DOMAIN — escopo

**GitHub:** #118 (sub-issue da feature #60 → épico #64) · **Feature SDD:** `specs/017-fin-conciliacao-bancaria/` · **Size:** M

## Objetivo

Modelar, em **domínio puro** (`src/modules/financial/domain/statement/`), o agregado de importação de
extrato bancário e a chave anti-duplicidade — base da US1 (Importar extrato). **Sem** persistência,
**sem** parser de arquivo, **sem** borda HTTP (isso é #119/#120).

## Em escopo

1. **VO `Fitid`** (branded `string`):
   - `fromNative(raw)` — usa o `FITID` nativo do OFX (não-vazio, ≤ 64 chars).
   - `synthesize({ debitAccountRef, dateIso, valueCents, memo, seq })` — chave **determinística**
     `sha256(...)` para CSV sem FITID (D-FITID). Mesma entrada → mesma `Fitid`.
   - `rehydrate(raw)` — reconstrução a partir do banco.
2. **Agregado `BankStatement`** + entidade `StatementTransaction` (dentro do boundary):
   - `import({ debitAccountRef, period, file, openingBalance, closingBalance, transactions }, knownFitids)`
     → `Result<{ statement, discardedDuplicates: number }, BankStatementError>`.
   - **Dedup por `Fitid`**: transações cujo `Fitid` está em `knownFitids` (ou repetido no próprio
     arquivo) são **descartadas silenciosamente**; o resultado reporta a contagem (R5).
   - Importação **atômica** no domínio (entrada inválida → `err`, nada parcial).
3. **Evento `BankStatementImported`** (EN-passado) emitido pela importação.

Enums/valores em **EN** (C1): `movement: 'Debit'|'Credit'`, `reconciliationStatus: 'Pending'|…`.

## Fora de escopo (outros tickets)

- Parser OFX/CSV → #119. Schema/migration/repos/HTTP → #120. Match/score → #121.

## Critérios de aceite (Given/When/Then — US1)

- **CA1**: Dado extrato com 10 transações de `Fitid` distintos, Quando `import` com `knownFitids`
  vazio, Então retorna `statement` com 10 transações `Pending` e `discardedDuplicates = 0`.
- **CA2**: Dado `knownFitids` contendo 3 dos `Fitid` do arquivo, Quando `import`, Então persiste 7 e
  `discardedDuplicates = 3` (descarte silencioso, sem erro).
- **CA3**: Dado arquivo com 2 transações de `Fitid` idêntico entre si, Quando `import`, Então mantém 1
  e conta 1 duplicata.
- **CA4**: Dado CSV sem FITID nativo, Quando `Fitid.synthesize` com a mesma entrada duas vezes, Então
  produz a **mesma** `Fitid` (determinístico) — e entradas diferentes produzem `Fitid` diferentes.
- **CA5**: Dado `Fitid.fromNative('')` (vazio) ou raw > 64 chars, Então `err('invalid-fitid')`.
- **CA6**: Dado um `BankStatement` importado, Então expõe o evento `BankStatementImported` com
  `{ statementId, debitAccountRef, importedCount, occurredAt }`.

## Definition of Done

W0 RED (testes falham por inexistência da API) → W1 GREEN (mínimo) → W2 review (read-only, ≤3 rounds)
→ W3 gate (`pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`) verde.
Domínio puro: `Result<T,E>`, sem `throw`/`class`, branded types, erros string-literal-union EN.
Citação canônica (IX): D-AGGREGATES (Vernon p.458) já em `research.md`; TDD (Beck) no W0.
