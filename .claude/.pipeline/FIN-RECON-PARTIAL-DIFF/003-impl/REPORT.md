# W1 GREEN — FIN-RECON-PARTIAL-DIFF

**Skills/agentes:** ts-domain-modeler (domínio), drizzle-schema-author (schema/migration), ports-and-adapters (use-case/persistência/borda).
**Objetivo:** implementar o mínimo até GREEN dos CA1–CA6.

## Arquivos criados/alterados
### Domínio
- `domain/document/types.ts` — novo `DocumentStatus = 'PartiallyReconciled'`.
- `domain/payable/reconciled-status.ts` (novo) — `deriveReconciledStatus(valueCents, sum)` puro (soma >= valor → Reconciled; senão PartiallyReconciled).
- `domain/reconciliation/errors.ts` — novo erro `difference-sign-invalid`.
- `domain/reconciliation/types.ts` — `Difference` ganha `categoryRef?/costCenterRef?/note?`; novo `ReconciliationAllocation`; `ConfirmInput.allocations?`.
- `domain/reconciliation/reconciliation.ts` — `confirm`: validação de sinal (switch exausto), `allocations` (fallback ao valor cheio = CA1), R3 dependente do tratamento (Partial = saldo aberto, fora do balanço), ManualEntry vinculado p/ diferença classificada (Partial não gera).

### Schema + Migration
- `adapters/persistence/schemas/mysql.ts` — `fin_payables_status_chk` e `fin_documents_status_chk` incluem `'PartiallyReconciled'` (CHECK manual, sem ENUM — ADR-0020).
- `migrations/mysql/0024_mysterious_the_spike.sql` (gerado via `db:generate:financial`) — DROP+ADD dos 2 CHECKs.

### Application
- `application/use-cases/confirm-reconciliation.ts` — input `allocations?` (string→branded PayableId; id inválido → payable-not-found); passa allocations + difference classificada ao domínio.

### Persistência
- `repos/reconciliation-repository.in-memory.ts` — status derivado da soma das conciliações ATIVAS (helper `sumActiveReconciledFor`); undo re-deriva (soma 0 → Paid).
- `repos/reconciliation-repository.drizzle.ts` — confirm: insere ManualEntry da diferença classificada; status derivado via SELECT SUM(active); UPDATE a partir de Paid OU PartiallyReconciled (CA6). undo: re-deriva idem.

### Borda HTTP
- `adapters/http/schemas.ts` — body aceita `allocations[]` + `difference.{categoryRef,costCenterRef,note}`.
- `adapters/http/plugin.ts` — passa allocations + difference (omite chaves opcionais ausentes p/ exactOptionalPropertyTypes).
- `adapters/http/error-mapping.ts` — mensagem PT-BR de `difference-sign-invalid` (default 422).

## Decisões de design
- `Partial` = saldo aberto: NÃO entra no balanço R3 (transação === Σ itens) e NÃO gera ManualEntry. Demais tratamentos: Σ itens + difference === transação + geram ManualEntry.
- Status do título é DERIVADO (não setado direto) — fonte única = soma das conciliações ativas. Repositório (que conhece o acumulado) aplica `deriveReconciledStatus`.
- ManualEntry da diferença usa `type='FeePenaltyInterest'`, preservando o sinal de valueCents.

## Saída literal dos gates
```
pnpm run typecheck → tsc --noEmit  (sem erros)
node --test (subset CA1-6 + use-cases + http) → ℹ tests 40 / pass 40 / fail 0
pnpm test (suíte completa) → ℹ tests 3218 / pass 3200 / fail 0 / skip 18
db:generate:financial → 0024_mysterious_the_spike.sql gerado
```

## Critério de saída W1: atendido — todos os testes W0 passam; typecheck zero erros; sem regressão.

## Próximo passo: W2 REVIEW (code-reviewer, read-only).
