# Contrato de Ports — Conciliação Bancária

Ports = tipos puros no `application/ports/` (constituição V; skill `ports-and-adapters`). Cada port
tem ≥ 2 adapters: `InMemory` (testes) + real (Drizzle/parser). Toda operação devolve
`Result<T, E>` — **nunca** `throw`/`Error` cruzando para o domínio (`.claude/rules/adapters.md`).

## `BankStatementParser` (port de parsing — D-FORMATS)

```ts
type ParsedTransaction = Readonly<{
  fitid: string | null; // null em CSV sem FITID → domínio sintetiza (D-FITID)
  date: Date;
  movement: 'Debit' | 'Credit';
  entryType: string; // normalizado p/ o enum de domínio
  payeeName: string;
  memo: string;
  valueCents: number;
  balanceAfterCents: number;
}>;

type ParsedStatement = Readonly<{
  periodStart: Date;
  periodEnd: Date;
  openingBalanceCents: number;
  closingBalanceCents: number;
  transactions: readonly ParsedTransaction[];
}>;

interface BankStatementParser {
  parse(
    format: 'OFX' | 'CSV',
    content: string,
  ): Promise<Result<ParsedStatement, 'malformed-statement' | 'unsupported-format'>>;
}
```

- Adapters: `ofx-parser.ts`, `csv-parser.ts` (Node puro, sem lib); `fake-parser.ts` (testes).

## `BankStatementRepository`

```ts
interface BankStatementRepository {
  save(s: BankStatement): Promise<Result<void, 'persistence-error'>>;
  knownFitids(
    debitAccountRef: string,
    fitids: readonly string[],
  ): Promise<Result<ReadonlySet<string>, 'persistence-error'>>; // anti-dup (D-FITID)
  listTransactions(
    statementId: string,
    filter: TxFilter,
  ): Promise<Result<readonly StatementTransaction[], 'persistence-error'>>;
}
```

## `ReconciliationRepository`

```ts
interface ReconciliationRepository {
  // tx única: cria conciliação + transiciona payables + marca transação + append outbox
  saveReconciliation(
    r: Reconciliation,
    payableTransitions: readonly PayableTransition[],
  ): Promise<Result<void, 'persistence-error' | 'optimistic-lock'>>;
  findById(id: string): Promise<Result<Reconciliation | null, 'persistence-error'>>;
  undo(id: string, undo: UndoData): Promise<Result<void, 'persistence-error' | 'already-undone'>>;
  rejectSuggestion(
    transactionId: string,
    payableId: string,
    by: string,
  ): Promise<Result<void, 'persistence-error'>>;
}
```

## `PayableLookup` (leitura de títulos `Paid` para match — read-side)

```ts
interface PayableLookup {
  findPaidById(payableId: string): Promise<Result<PaidPayable | null, 'persistence-error'>>;
  searchPaid(
    filters: PaidSearchFilters,
  ): Promise<Result<readonly PaidPayable[], 'persistence-error'>>;
  openCountBySupplier(supplierRef: string): Promise<Result<number, 'persistence-error'>>; // critério de score
}
```

> Lê `fin_payables` **dentro do próprio módulo** (não cruza BC). A transição `Paid→Reconciled` é
> aplicada via `ReconciliationRepository.saveReconciliation` na mesma tx (D-TRANSITION).

## `ReconciliationPeriodStore`

```ts
interface ReconciliationPeriodStore {
  isClosed(debitAccountRef: string, date: Date): Promise<Result<boolean, 'persistence-error'>>;
  close(
    period: ReconciliationPeriod,
  ): Promise<Result<void, 'persistence-error' | 'period-has-pending'>>;
}
```

## `ReconciliationExporter` (US6 — OFX/CSV, sem lib)

```ts
interface ReconciliationExporter {
  export(
    periodId: string,
    format: 'OFX' | 'CSV',
  ): Promise<
    Result<{ filename: string; content: string }, 'persistence-error' | 'unsupported-format'>
  >;
}
```

## `Clock` / `IdGenerator` / `Outbox` (reuso)

Reusa os ports compartilhados já existentes no financial: `Clock` (nunca `new Date()` no domínio),
`IdGenerator` (UUID v4), e o **outbox** (`append` — ADR-0015) para `PayableReconciled`,
`ReconciliationUndone`, `BankStatementImported`, `ManualEntryRecorded`, `ReconciliationPeriodClosed`.

## Use cases (orquestração — `application/use-cases/`)

`importBankStatement` · `suggestMatches` (read) · `confirmReconciliation` · `rejectSuggestion` ·
`undoReconciliation` · `recordManualEntry` · `confirmBatch` · `closeReconciliationPeriod` ·
`exportReconciliation` · `searchPaidPayables` (read).
