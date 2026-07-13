# W3 — Gate de qualidade · FIN-COUNTERPART-CREATE (US1 · spec 029 · #269)

> **Outcome:** **GREEN** · Skill `ts-quality-checker` · validação MySQL 8.4 real no **OrbStack** (x99 temporariamente fora do ar — uso autorizado pelo Gabriel)

## Gate de código

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ verde (`tsc --noEmit`, 0 erros) |
| `pnpm run format:check` | ✅ verde |
| `pnpm run lint` | ✅ verde (`eslint .`) |
| `pnpm test` (unit) | ✅ **3945 pass · 0 fail · 19 skipped** |
| `pnpm run test:integration:financial` (MySQL 8.4 OrbStack) | ✅ **73 pass · 0 fail · 0 skipped** |

## Validação da migration `0034_heavy_frank_castle.sql` no MySQL real

A suíte de integração aplica **todas** as migrations do financial no MySQL 8.4 (via `migrate()` no `before`). A `0034` (CREATE TABLE `fin_expected_counterpart` + 4 CHECK + 2 índices + ALTER do CHECK do `fin_outbox`) aplicou limpa. Teste dedicado novo `expected-counterpart-store.drizzle-mysql.test.ts` (registrado no runner):

- **CA1** — `save` persiste `Pending`; `listPendingByAccount(destino)` + `findById` + `findByOriginReconciliation` round-trip (bigint↔number, índice `(destination_account_ref, status)`).
- **CA4** — `save` publica `TransferCounterpartCreated` no `fin_outbox` na MESMA tx (`SELECT` confirma 1 linha `aggregate_type='ExpectedCounterpart'`).

## 🐛 Bugs/regressões encontrados na validação real (invisíveis ao in-memory)

### 1. CHECK do `fin_outbox` bloqueava o novo `aggregate_type` (bug do próprio diff)

O `fin_outbox` tem `CHECK aggregate_type IN ('Document','Reconciliation','Statement','ReconciliationPeriod')`. O novo evento usa `aggregate_type='ExpectedCounterpart'` (via o branch adicionado em `fin-outbox-helpers.ts`) → **violava o CHECK** → o `save` da contrapartida falhava no MySQL (errno 3819). O adapter in-memory não tem o CHECK, então o unit test não pegaria — **só a validação no banco real revelou**.
**Fix:** adicionado `'ExpectedCounterpart'` ao CHECK em `schemas/mysql.ts`; migration `0034` regenerada com `ALTER TABLE fin_outbox DROP/ADD CONSTRAINT fin_outbox_aggregate_type_chk`.

### 2. Regressão pré-existente `paid_at` em 2 testes de integração de reconciliation

`reconciliation-repository.drizzle-mysql.test.ts` e `reconciliation-outbox-atomic.drizzle-mysql.test.ts` promoviam um título a `status='Paid'` **sem** `paid_at`, violando o CHECK `fin_payables_paid_at_chk` (#383) — mesmo defeito que o commit `e1787ad4` corrigiu no *document-repository* test, mas que ficou nesses dois. Débito pré-existente na `dev`, exposto ao rodar a integração. Pela **política de regressão zero**, corrigido (setar `paidAt` junto de `status='Paid'`, como o domínio `payPayableManually` faz). Só teste; produção intacta.

## Estado do ticket

W0 RED ✅ · W1 GREEN ✅ · W2 APPROVED ✅ · W3 GREEN ✅ (código + MySQL real). **Pronto para `close` + PR para `dev`.**
