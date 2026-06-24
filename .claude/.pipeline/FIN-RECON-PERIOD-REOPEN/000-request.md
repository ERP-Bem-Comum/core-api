# FIN-RECON-PERIOD-REOPEN — reabrir período de conciliação (#203)

**Issue:** [#203](https://github.com/ERP-Bem-Comum/core-api/issues/203) · **Size:** M · **Branch:** `feat/203-recon-period-reopen`
**🎯 Goal:** `POST /financial/reconciliation-periods/:id/reopen` que volta um período `Closed → Open`. Espelha o `close` (#173).

## Decisões resolvidas (requirements-engineer)
- **RBAC:** reutiliza `reconciliation:close` (mesma capacidade de controle de período; sem permissão nova).
- **Idempotência/guard:** reabrir período **não-fechado** → erro de domínio `'period-not-closed'` → 4xx (409/422 conforme o error-mapping existente). Não é no-op silencioso (clareza > silêncio).
- **Auditoria:** via **evento de domínio** `ReconciliationPeriodReopened` (espelha `ReconciliationPeriodClosed`) — **SEM migration** (reusa as colunas `closed_at`/`closed_by`, que o reopen zera). "Quem/quando reabriu" vai no evento, não em coluna nova.
- **Regra contábil (P.O., NÃO bloqueante):** reabrir só transiciona o status; transações conciliadas **permanecem** conciliadas, saldos/relatórios derivam do estado atual. O endpoint apenas "destrava" o período p/ nova conciliação. Confirmar com a P.O. se há regra de recomputo (follow-up; não bloqueia esta entrega).

## Escopo técnico (espelha o close)

### Domínio — `src/modules/financial/domain/reconciliation/period.ts`
- `PeriodError` += `'period-not-closed'`.
- Tipos `ReopenPeriodInput { periodId, reopenedBy, occurredAt }` + `ReopenPeriodOutput { period, events }`.
- Evento `ReconciliationPeriodReopened { type, periodId, debitAccountRef, periodStart, periodEnd, occurredAt }`.
- `reopenPeriod(current: ReconciliationPeriod, input): Result<ReopenPeriodOutput, PeriodError>` — se `current.status !== 'Closed'` → `err('period-not-closed')`; senão período `{ ...current, status: 'Open', closedAt: null, closedBy: null }` + evento. Puro, imutável, sem throw.

### Application — `use-cases/reopen-reconciliation-period.ts` (novo)
- Factory `(deps: { periodStore: Pick<ReconciliationPeriodStore,'findById'|'reopen'>; clock }) => (input: { periodId; reopenedBy }) => Result`.
- Sequência: `findById` → não encontrado → `err('reconciliation-period-not-found')` (novo error do use case, mapeado p/ 404); encontrado → `reopenPeriod(current, {...})` → `periodStore.reopen(period, events)` → `ok({ periodId, status: 'Open' })`.

### Ports/Adapters
- `ReconciliationPeriodStore` += `reopen(period, events) => Promise<Result<void, ReconciliationPeriodStoreError>>` (espelha `close`).
- Adapters in-memory + drizzle: `reopen` = UPDATE `status='Open', closed_at=NULL, closed_by=NULL WHERE id=?` (sem migration). In-memory espelha.

### HTTP — `plugin.ts` + `composition.ts` + `schemas.ts`
- Rota `POST /financial/reconciliation-periods/:id/reopen`, `preHandler` `reconciliation:close`, `req.userId` → `reopenedBy`.
- Dep `reopenReconciliationPeriod` na composição.
- Response: período atualizado (`status: 'Open'`) — schema reutiliza/espelha o do close.

## ✅ Critérios de aceite
- **CA1 — Dado** um período `Closed`, **Quando** `POST /reconciliation-periods/:id/reopen` com `reconciliation:close`, **Então** 200 e período retorna `status: 'Open'` (`closedAt`/`closedBy` nulos).
- **CA2 — Dado** um período **já `Open`**, **Quando** reopen, **Então** 4xx com slug `period-not-closed` (não altera).
- **CA3 — Dado** um `:id` inexistente, **Quando** reopen, **Então** 404 (`reconciliation-period-not-found`).
- **CA4 — Dado** um usuário **sem** `reconciliation:close`, **Quando** reopen, **Então** 403.
- **CA5** — reabrir é seguro p/ período com transações conciliadas (não as altera); domínio puro testado (reopen Closed→Open + guard).

## Disciplina
Domínio puro (Result, sem throw/class, discriminated union exausta); ESM `.ts`+`import type`; `exactOptionalPropertyTypes`. Gate W3 verde; sem regressão. Sem migration.
