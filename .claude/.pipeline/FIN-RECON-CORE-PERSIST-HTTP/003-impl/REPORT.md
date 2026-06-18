# W1 — GREEN · FIN-RECON-CORE-PERSIST-HTTP (#123)

**Skills:** ports-and-adapters · drizzle-schema-author · padrão Fastify+Zod · **Resultado:** 🟢 GREEN
**Branch:** `017-fin-conciliacao-bancaria`

## Fatia vertical entregue (US2/US3/US4 — conciliar/desfazer)

Sobre o domínio #122 (`Reconciliation.confirm`/`undo`) + transições `Payable.reconcile`/`unreconcile`,
o extrato persistido (#120) e o título `Paid` (016).

### Aplicação

- `use-cases/confirm-reconciliation.ts` — guard FR-015 (conta `Closed` → `account-closed`) → snapshots →
  domínio `confirm` (R2/R3) → `reconciliationRepo.confirm` (unit-of-work) → `outbox.append(PayableReconciled[])`.
- `use-cases/undo-reconciliation.ts` — `findById` → domínio `undo` → `reconciliationRepo.undo` → `ReconciliationUndone`.
- `use-cases/search-paid-payables.ts` — read de títulos `Paid`.
- **Ports**: `reconciliation-repository.ts` (unit-of-work `confirm`/`findById`/`undo`),
  `payable-reconciliation-view.ts` (`findSnapshotsByIds`/`searchPaid`), extensão `BankStatementRepository.findTransaction`.

### Persistência

- `schemas/mysql.ts` — `fin_reconciliations` + `fin_reconciliation_items` (PK composta, FK CASCADE p/ raiz) +
  `fin_rejected_suggestions` (só tabela — #121). Refs cross-aggregate por IDENTIDADE (sem FK p/ título/transação).
- `migrations/mysql/0006_*.sql` — `db:generate:financial` + CHARSET/COLLATE manual (identidade em `utf8mb4_bin`).
- `mappers/reconciliation.mapper.ts` — row↔domínio (revalida type/status/treatment/IDs); `difference_*` decomposto.
- Adapters in-memory (stores compartilhados: o repo flipa status no mesmo statement/payable store) e Drizzle
  (`confirm`/`undo` em UMA `db.transaction`; UPDATE condicional `WHERE status=...` + checagem de `affectedRows`).

### Outbox / eventos

- `application/ports/outbox.ts` + in-memory: `FinancialAppendableEvent` inclui `ReconciliationEvent`.
- `public-api/events.ts`: `FinancialModuleEvent` inclui `PayableReconciled`/`ReconciliationUndone` (+ guard).

### Borda HTTP (`/api/v2/financial`)

- `POST /reconciliations` (`reconciliation:write`) → 201 `{ reconciliationId, type, itemCount }`.
- `POST /reconciliations/:id/undo` (`reconciliation:write`) → 200 `{ reconciliationId, status }`.
- `GET /payables?status=Paid` (`reconciliation:read`) → 200 lista.
- `schemas.ts`/`dto.ts`/`error-mapping.ts` (novos slugs → status/PT-BR)/`permissions.ts` (`reconciliation:write`)/`composition.ts`.

## Prova de verde

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ (após `prettier --write` nos meta files) |
| `pnpm run lint` | ✅ |
| `pnpm test` (sem Docker) | ✅ **2807 pass / 0 fail** / 18 skipped (integração gated) |
| `pnpm run test:integration:financial` (Docker) | ✅ **28 pass / 0 fail** (CA11 incluso) |

### Critérios de aceite

- **CA1–CA9** (confirm individual/múltiplo/parcial, não-balanceado, título-não-Paid, **guard FR-015**, undo,
  undo-inexistente, search Paid) — ✅ gate.
- **CA10** (HTTP: POST 201 + undo 200 + GET payables + RBAC 403 + 404) — ✅ gate.
- **CA11** (integração: atomicidade confirm/undo — conciliação+título+transação na mesma tx; guard FR-015
  sem efeito colateral; re-confirm → `transaction-already-reconciled`) — ✅ Docker.

## Notas para W2

- **Unit-of-work cross-aggregate** (confirmado com o humano): `ReconciliationRepository.confirm/undo` abre UMA
  `db.transaction` e escreve em `fin_reconciliations`/`fin_payables`/`fin_statement_transactions` (mesmo bounded
  context; invariante all-or-nothing — issue #123).
- **`fin_rejected_suggestions`**: só a tabela nesta fatia (use-case de rejeição é #121).
- **Refs por identidade**: `transaction_id`/`payable_id` sem FK cross-aggregate (D-AGGREGATES/Evans) — só índice.
- **Seed do teste de integração**: título `Paid` criado via `saveDocument` + UPDATE SQL (não há rota de pagamento — 016).

## Próxima wave

W2 (`code-reviewer`) — audit read-only, máx. 3 rounds.
