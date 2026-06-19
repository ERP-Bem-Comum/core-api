# W1 — Implementação (GREEN) · FIN-RECON-LIST-PERIODS (#173)

**Data**: 2026-06-19

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Port | `application/ports/reconciliation-period-store.ts` | `+ listByAccount(debitAccountRef)` → períodos da conta. |
| Adapters | `reconciliation-period-store.{in-memory,drizzle}.ts` | in-memory: filtra o map por `debitAccountRef`. drizzle: SELECT por `debit_account_ref` → `toDomain` cada (espelha findById). |
| Application | `use-cases/list-reconciliation-periods.ts` (novo) | passthrough read-only ao `listByAccount`. |
| Borda HTTP | `adapters/http/{schemas,dto,plugin,composition}.ts` | `GET /api/v2/financial/reconciliation-periods?debitAccountRef=`, perm `reconciliation:read` → DTO (id, debitAccountRef, intervalo YYYY-MM-DD, status, closedAt/By). |

GREEN: use-case 2/2, smoke HTTP 2/2; sem regressão. **Nota:** "totais" do issue não estão no agregado `ReconciliationPeriod` (deriváveis do read-model #139); expostos os campos existentes. `typecheck` confirmou a adição ao port consistente.
