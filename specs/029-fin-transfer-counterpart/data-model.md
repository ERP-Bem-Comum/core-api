# Data Model — Fase 1 · Contrapartida esperada (#269)

## Agregado `ExpectedCounterpart` (`domain/expected-counterpart/`)

Representa a perna esperada de uma transferência na conta de **destino**. Raiz de agregado própria (research.md, Decisão 1).

### Tipo (domínio puro — `Readonly`, sem class)

```
ExpectedCounterpartId = Brand<string, 'ExpectedCounterpartId'>   // uuid v4
ExpectedCounterpartStatus = 'Pending' | 'Matched' | 'Discarded'
ExpectedCounterpartType   = 'Transfer'                            // MVP (Q3); Investment/Redemption = follow-up

ExpectedCounterpart = Readonly<{
  id: ExpectedCounterpartId
  destinationAccountRef: CedenteAccountId   // conta B (onde a perna é esperada)
  originAccountRef: CedenteAccountId         // conta A (rótulo "outra perna de [Conta A]")
  originReconciliationRef: ReconciliationId  // vínculo à perna de origem (A)
  originTransactionRef: string               // transação de origem conciliada em A
  type: ExpectedCounterpartType
  movement: Movement                          // 'Debit' | 'Credit' — OPOSTO ao da origem
  valueCents: bigint                          // = valor da perna de origem
  expectedDate: Date                          // ~ data da perna de origem
  status: ExpectedCounterpartStatus
  matchedTransactionRef: string | null        // transação real de B que a consumiu (só em Matched)
}>
```

### Erros (union EN kebab)

`'counterpart-value-invalid' | 'counterpart-same-account' | 'counterpart-not-pending' | 'counterpart-already-matched'`

### Operações (smart constructors → `Result<T, E>`)

- `create(input): Result<CreateOutput, ExpectedCounterpartError>` — valida valor > 0, `destination ≠ origin`; deriva `movement` oposto ao da origem; status inicial `Pending`. Emite `TransferCounterpartCreated`.
- `match(counterpart, realTransactionRef): Result<MatchOutput, ...>` — exige `status === 'Pending'` (senão `counterpart-not-pending`); → `Matched` + grava `matchedTransactionRef`. Emite `TransferCounterpartMatched`.
- `discard(counterpart): Result<DiscardOutput, ...>` — de `Pending` → `Discarded`; de `Matched` exige reabertura antes (regra no use-case de undo). Emite `TransferCounterpartDiscarded`.

Transições válidas: `Pending → Matched`, `Pending → Discarded`, `Matched → Pending` (reabertura no undo). `Discarded` é terminal.

## Eventos de domínio (outbox — EN passado)

```
TransferCounterpartCreated   { counterpartId, destinationAccountRef, originAccountRef, originReconciliationRef, valueCents, movement, expectedDate }
TransferCounterpartMatched   { counterpartId, matchedTransactionRef, destinationAccountRef }
TransferCounterpartDiscarded { counterpartId, reason: 'undo-origin' | 'manual' }
```

Contrato registrado em `handbook/architecture/` no W1 do FIN-COUNTERPART-CREATE.

## Tabela `fin_expected_counterpart` (Drizzle → `db:generate`)

| Coluna | Tipo MySQL | Nota |
| :-- | :-- | :-- |
| `id` | `varchar(36)` PK | uuid |
| `destination_account_ref` | `varchar(36)` | FK lógica → `fin_cedente_accounts.id` |
| `origin_account_ref` | `varchar(36)` | conta A |
| `origin_reconciliation_ref` | `varchar(36)` | vínculo à perna de origem |
| `origin_transaction_ref` | `varchar(36)` | transação de A conciliada |
| `type` | `varchar(20)` | `'Transfer'` (sem ENUM — ADR-0020) |
| `movement` | `varchar(10)` | `'Debit'`/`'Credit'` |
| `value_cents` | `bigint` | espelho da origem |
| `expected_date` | `date` | ~ data da origem |
| `status` | `varchar(12)` | `'Pending'`/`'Matched'`/`'Discarded'` |
| `matched_transaction_ref` | `varchar(36)` NULL | transação real de B |
| `created_at` / `updated_at` | `datetime` | auditoria |

Índices: `(destination_account_ref, status)` — fila/seletor de B; `(origin_reconciliation_ref)` — tratamento no undo.

## Fluxos (state + integração)

1. **US1 (create):** `record-manual-entry(type='Transfer', destinationAccountRef=B)` → após confirmar a perna de A, cria `ExpectedCounterpart{ Pending, movement oposto, value = origem, expectedDate ~ origem }` na tx do outbox.
2. **US2 (match):** import do extrato de B → `suggest-matches` compara transações `Pending` de B × contrapartidas `Pending` de B (valor exato + janela ~5d, `match-score`); sugestão `kind='counterpart'`. `confirm` → `match(counterpart, realTx)` + concilia a transação real + grava vínculo A↔B; **dedup**: a transação real consome a contrapartida (sem 2ª).
3. **US3 (undo):** `undo-reconciliation` da perna de A → localiza a contrapartida por `origin_reconciliation_ref`: `Pending` → `discard`; `Matched` → reabre (desfaz o par de B, contrapartida volta a `Pending` ou `Discarded`), sem contagem dobrada.

## Reuso (não reimplementar)

- `match-score.ts` (score valor/data) — estende o alvo para contrapartida.
- `Reconciliation` (Active/Undone, confirm/undo) — o par de B usa o mesmo caminho de conciliação.
- `CedenteAccountId`, `Movement`, `ReconciliationId` — tipos existentes.
