# Phase 1 — Data Model: Conciliação Bancária

Agregados, VOs, transições e tabelas `fin_*`. Mapeamentos canônicos seguem `schemas/mysql.ts`
(ADR-0018/0020): Money → `bigint` cents; UUID → `varchar(36)`; instantes → `datetime(fsp:3)`; datas
→ `date`; enums → `varchar(N) + CHECK`; **sem** JSON/ENUM/trigger.

## Visão geral (relacionamentos)

```text
fin_cedente_accounts (016 — conta-débito)        fin_payables (agregado Document — já existe)
        ▲ debit_account_ref                                ▲ payable_id
        │                                                  │
fin_bank_statements (raiz)                         fin_reconciliation_items
   └── 1—N fin_statement_transactions  ──┐                 ▲
                                          │ transaction_id │ 1—N
                                          └──────────► fin_reconciliations (raiz)
                                                            ├── 0—1 fin_manual_entries
fin_reconciliation_periods (por conta+intervalo)   fin_rejected_suggestions (anti-reaparição)
```

## Agregado 1 — `BankStatement`

Raiz da importação. Boundary inclui `StatementTransaction`.

- **Identidade**: `BankStatementId` (branded, UUID v4).
- **Campos**: `debitAccountRef` (conta-cedente), `period {start, end}`, `file {name, format, hash,
importedAt}`, `openingBalance: Money`, `closingBalance: Money`, `transactions: StatementTransaction[]`.
- **Invariantes**: formato ∈ {`OFX`,`CSV`}; toda transação tem `Fitid`; importação é **atômica**
  (FR-003); `Fitid` único por `(debitAccountRef, fitid)` (R5).
- **Operação**: `import(parsed, knownFitids) → Result<{statement, discarded: number}, ImportError>` —
  filtra `Fitid` já vistos (descarte silencioso) e reporta a contagem.

### Entidade `StatementTransaction`

- **Identidade**: `StatementTransactionId`.
- **Campos**: `fitid: Fitid`, `date: Date`, `movement: 'Debit'|'Credit'`, `entryType:
'PIX'|'TED'|'DOC'|'Fee'|'Boleto'|'DARF'|'Investment'|'Redemption'|'Transfer'|'Other'`,
  `payeeName: string`, `memo: string`, `value: Money`, `balanceAfter: Money`,
  `reconciliationStatus: 'Pending'|'Reconciled'|'ManualEntry'`, `reconciliationRef?:
ReconciliationId`. Critérios normalizados de match: `payeeNormalized`, `documentRef?` (extraído do memo).

## Agregado 2 — `Reconciliation`

Raiz do vínculo transação ↔ títulos. Referencia título e transação **por identidade** (D-AGGREGATES).

- **Identidade**: `ReconciliationId`.
- **Campos**: `transactionId: StatementTransactionId`, `items: ReconciliationItem[]` (1..N),
  `type: 'Individual'|'Multiple'|'Partial'|'Batch'|'ManualEntry'`, `status: 'Active'|'Undone'`,
  `audit {reconciledAt, reconciledBy, undoneAt?, undoneBy?, undoReason?}`,
  `difference? {value: Money, treatment: 'Interest'|'Penalty'|'Discount'|'Fee'|'Partial'}`.
- **Invariantes**:
  - **R3 (fechamento 100%)**: `Σ items.reconciledValue + (difference?.value ?? 0) ==
transaction.value`; caso contrário a transação permanece `Pending` (erro
    `reconciliation-not-balanced`).
  - **R2**: todo `payable` referenciado está em `Paid` no momento da conciliação (`title-not-paid`).
  - **R7**: desfazer **nunca** deleta — vira `Undone`.
- **Operações**: `confirm(...)`, `undo(reason?)`.

### Entidade `ReconciliationItem`

- `payableId: PayableId`, `reconciledValue: Money`.

### `ManualEntry` (parte do boundary quando `type = ManualEntry`)

- `type: 'Payment'|'Receipt'|'Transfer'|'FeePenaltyInterest'|'Investment'|'Redemption'`,
  `supplierRef?`, `categoryRef?`, `costCenterRef?`, `programRef?`, `description?`, `value: Money`.

## Value Objects

| VO                        | Forma                             | Invariante                                                             |
| :------------------------ | :-------------------------------- | :--------------------------------------------------------------------- |
| `Fitid`                   | branded `string`                  | não-vazio; ≤ 64 chars; OFX nativo ou `sha256(...)` sintético (D-FITID) |
| `MatchScore`              | branded `number`                  | inteiro 0–100; faixas alta ≥75 / média 50–74 / baixa <50               |
| `Money`                   | reuso `bigint` cents              | ≥ 0 (kernel atual rejeita negativo)                                    |
| `DebitAccountRef`         | branded `string` (UUID)           | referência à `fin_cedente_accounts` (016)                              |
| `ReconciliationPeriodRef` | `{ debitAccountRef, start, end }` | `start ≤ end`                                                          |

Todos com **smart constructor** retornando `Result<T, E>` (constituição V), erros string-literal EN
kebab-case (`'invalid-fitid'`, `'score-out-of-range'`).

## Máquina de estados do título (`fin_payables.status`)

Esta feature **ativa** transições hoje reservadas (o enum já aceita `Paid`/`Reconciled`):

```text
Paid ── reconcile() ──▶ Reconciled        (US2 — cria Reconciliation Active + PayableReconciled)
Reconciled ── unreconcile() ──▶ Paid      (US3 — Reconciliation vira Undone + ReconciliationUndone)
```

Pré-condição: como o título chega a `Paid` é externo a esta feature (ver research D-DEP/D-TRANSITION).

> **Idioma dos enums (C1 — constituição VIII)**: todos os valores de enum são **EN** (casam com
> `fin_payables.status` já existente: `Paid`/`Reconciled`). A tradução ao humano (`Reconciled` →
> "Conciliado", `Pending` → "Pendente", `Active` → "Ativa"…) é camada de **apresentação** em
> `cli/formatters`, nunca no valor persistido/no domínio. Nomes próprios de instrumentos BR
> (`PIX`/`TED`/`DOC`/`DARF`/`Boleto`) permanecem como estão.

## `MatchSuggestion` (read-model — NÃO persistido)

Computado sob demanda por transação `Pending`: `{ transactionId, payableId, score: MatchScore,
criteria { payeeMatch, exactValue, dateD0, memoRef, supplierOpenCount } }`. Rejeições persistem em
`fin_rejected_suggestions` para não reaparecer (D-MATCH).

---

## Tabelas `fin_*` (DDL lógico — migrations geradas por `db:generate`)

> Uma migration por ticket (serialização). Numeração **após** a `0004` da 016 (ver D-DEP). CHARSET/
> COLLATE inseridos à mão na migration (utf8mb4_unicode_ci; UUID/FK em utf8mb4_bin), como nas demais.

### `fin_bank_statements`

`id` PK varchar(36) · `debit_account_ref` varchar(36) NOT NULL · `period_start` date · `period_end`
date · `file_name` varchar(255) · `file_format` varchar(8) CHECK ∈ {`OFX`,`CSV`} · `file_hash`
varchar(64) · `imported_at` datetime(3) · `opening_balance` bigint · `closing_balance` bigint.
Índice: `(debit_account_ref, period_start)`.

### `fin_statement_transactions`

`id` PK · `statement_id` varchar(36) NOT NULL FK→`fin_bank_statements` ON DELETE CASCADE ·
`debit_account_ref` varchar(36) NOT NULL · `fitid` varchar(64) NOT NULL · `tx_date` date ·
`movement` varchar(8) CHECK ∈ {`Debit`,`Credit`} · `entry_type` varchar(16) CHECK ∈ {10 tipos: PIX,TED,DOC,Fee,Boleto,DARF,Investment,Redemption,Transfer,Other} ·
`payee_name` varchar(255) · `memo` varchar(500) · `value` bigint CHECK ≥ 0 · `balance_after` bigint ·
`reconciliation_status` varchar(16) CHECK ∈ {`Pending`,`Reconciled`,`ManualEntry`} ·
`reconciliation_ref` varchar(36) NULL.
**Índice ÚNICO `(debit_account_ref, fitid)`** (anti-dup R5). Índices: `statement_id`,
`(debit_account_ref, reconciliation_status)`.

### `fin_reconciliations`

`id` PK · `transaction_id` varchar(36) NOT NULL · `type` varchar(16) CHECK ∈ {`Individual`,`Multiple`,
`Partial`,`Batch`,`ManualEntry`} · `status` varchar(8) CHECK ∈ {`Active`,`Undone`} ·
`reconciled_at` datetime(3) · `reconciled_by` varchar(36) · `undone_at` datetime(3) NULL ·
`undone_by` varchar(36) NULL · `undo_reason` varchar(500) NULL · `difference_value` bigint NULL ·
`difference_treatment` varchar(12) NULL CHECK ∈ {`Interest`,`Penalty`,`Discount`,`Fee`,`Partial`}.
Índices: `transaction_id`, `(status)`.

### `fin_reconciliation_items`

`id` PK · `reconciliation_id` varchar(36) NOT NULL FK→`fin_reconciliations` ON DELETE CASCADE ·
`payable_id` varchar(36) NOT NULL · `reconciled_value` bigint CHECK ≥ 0. Índice: `reconciliation_id`,
`payable_id`.

### `fin_manual_entries`

`id` PK · `reconciliation_id` varchar(36) NULL FK→`fin_reconciliations` ON DELETE CASCADE ·
`type` varchar(20) CHECK ∈ {6 tipos} · `supplier_ref` varchar(36) NULL · `category_ref` varchar(36)
NULL · `cost_center_ref` varchar(36) NULL · `program_ref` varchar(36) NULL · `description`
varchar(500) NULL · `value` bigint CHECK ≥ 0.

### `fin_reconciliation_periods`

`id` PK · `debit_account_ref` varchar(36) NOT NULL · `period_start` date · `period_end` date ·
`status` varchar(8) CHECK ∈ {`Open`,`Closed`} · `closed_at` datetime(3) NULL · `closed_by`
varchar(36) NULL. Índice ÚNICO `(debit_account_ref, period_start, period_end)`.

### `fin_rejected_suggestions`

`id` PK · `transaction_id` varchar(36) NOT NULL · `payable_id` varchar(36) NOT NULL · `rejected_at`
datetime(3) · `rejected_by` varchar(36). Índice ÚNICO `(transaction_id, payable_id)`.

> **Sem FK física** para `fin_payables`/`fin_cedente_accounts` a partir de `fin_reconciliation_items`/
> statements: `payable_id`/`debit_account_ref` são refs lógicas validadas no domínio (mesmo padrão de
> `supplier_ref` no schema atual). FK física só **dentro** do boundary de cada agregado.

## Outbox (ADR-0015)

`append` na mesma tx do use-case: `PayableReconciled` (por item/título), `ReconciliationUndone`,
`BankStatementImported`, `ManualEntryRecorded`, `ReconciliationPeriodClosed`. Schema de payload v1,
aditivo, exposto em `public-api/events.ts`.
