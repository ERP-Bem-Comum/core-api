# W1 — Implementação (GREEN) · FIN-RECON-TX-LOOKUP (#175)

**Data**: 2026-06-19

Opção 2 do #175 (endpoint de lookup) — menor e self-contained (+ serve ao modal de detalhes).

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Port | `application/ports/reconciliation-repository.ts` | `+ findActiveByTransaction(transactionId)` → conciliação `Active` da transação (null se não houver). |
| Adapters | `reconciliation-repository.{in-memory,drizzle}.ts` | in-memory: itera o map (status Active + transactionId). drizzle: SELECT por `transaction_id` + status `Active` → rehydrate (espelha findById; usa o índice `fin_reconciliations_transaction_id_idx`). |
| Application | `use-cases/get-transaction-reconciliation.ts` (novo) | rehydrate id → `findActiveByTransaction` → `reconciliation-not-found` se null. |
| Borda HTTP | `adapters/http/{schemas,dto,plugin,composition}.ts` | `GET /api/v2/financial/statement-transactions/:id/reconciliation`, perm `reconciliation:read` → DTO (id, transactionId, type, status, reconciledBy/At, differenceCents, items). |

GREEN: use-case 3/3, smoke HTTP 2/2; sem regressão. `typecheck` confirmou que a adição ao port não quebrou nenhuma implementação.
