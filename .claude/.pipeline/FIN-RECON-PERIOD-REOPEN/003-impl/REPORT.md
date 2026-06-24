# W1 — GREEN · FIN-RECON-PERIOD-REOPEN (#203)

**Skills:** ts-domain-modeler (domínio) + ports-and-adapters (use case / port / adapters / borda).
**Disciplina:** mínimo até GREEN; YAGNI; sem migration; sem regressão.

## Ordem canônica seguida
VO/domínio → port → use case → adapters → error-mapping → schema → composição → rota.

## Arquivos alterados/criados
- `src/modules/financial/domain/reconciliation/period.ts` — `PeriodError += 'period-not-closed'`;
  evento `ReconciliationPeriodReopened` (inclui `reopenedBy` p/ auditoria sem migration); tipos
  `ReopenPeriodInput`/`ReopenPeriodOutput`; função pura `reopenPeriod(current, input)`:
  `status !== 'Closed'` → `err('period-not-closed')`; senão `{ ...current, status:'Open', closedAt:null, closedBy:null }` + 1 evento. Imutável, Result, sem throw/class.
- `src/modules/financial/application/ports/reconciliation-period-store.ts` — `+ reopen(period, events?)` (espelha `close`).
- `src/modules/financial/application/ports/outbox.ts` — `FinancialAppendableEvent |= ReconciliationPeriodReopened`.
- `src/modules/financial/application/use-cases/reopen-reconciliation-period.ts` — **novo**: factory `(deps:{periodStore:Pick<…,'findById'|'reopen'>; clock}) => (input:{periodId,reopenedBy})`. Sequência: rehydrate id → findById → null → `err('reconciliation-period-not-found')` → `reopenPeriod` → `periodStore.reopen` → `ok({periodId, status:'Open'})`.
- `src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts` — `reopen` (append outbox antes de set; paridade atômica com `close`).
- `src/modules/financial/adapters/persistence/repos/reconciliation-period-store.drizzle.ts` — `reopen` = `UPDATE status='Open', closed_at=NULL, closed_by=NULL WHERE id=?` + `appendFinOutboxInTx` na MESMA `db.transaction` (ADR-0015). Sem migration.
- `src/modules/financial/adapters/http/error-mapping.ts` — `period-not-closed` em CONFLICT_CODES (→409) + mensagem PT-BR.
- `src/modules/financial/adapters/http/schemas.ts` — `reopenPeriodResponseSchema` (`status: literal('Open')`).
- `src/modules/financial/adapters/http/composition.ts` — dep `reopenReconciliationPeriod` (tipo + wiring `{ periodStore, clock }`).
- `src/modules/financial/adapters/http/plugin.ts` — rota `POST /financial/reconciliation-periods/:id/reopen`, preHandler `reconciliation:close`, `req.userId → reopenedBy`, response `reopenPeriodResponseSchema`.

## Testes (W0) + integração
- `tests/.../domain/reconciliation/period.test.ts` — coberto (CA5/CA2 domínio).
- `tests/.../adapters/http/financial-period.http.test.ts` — coberto (CA1–CA4 HTTP).
- `tests/.../adapters/persistence/reconciliation-period.drizzle-mysql.test.ts` — **gated `MYSQL_INTEGRATION`**: reopen Closed→Open zera colunas, isClosed→false, reopen de já-Open → `period-not-closed`. NÃO roda local (Docker bloqueado); roda em CI.

## Saída literal dos gates
- `pnpm run typecheck` → `$ tsc --noEmit` (zero erros).
- domain: tests 5 / pass 5 / fail 0.
- http: tests 7 / pass 7 / fail 0 (3 CA6 originais + 4 reopen).
- drizzle-mysql (local, sem env): tests 1 / pass 1 (guard de skip).

## Desvios do 000-request.md
- Evento `ReconciliationPeriodReopened` inclui **`reopenedBy`** (além do shape listado no request). Motivo: o request manda `reopenedBy` no input de domínio mas o shape do evento não o listava; gravá-lo no evento honra a decisão de auditoria-via-evento (linha 9 do request) e evita parâmetro não-usado. Sem migration, sem coluna nova.

## Próximo passo
W2 REVIEW (code-reviewer): domínio puro, isolamento de módulo, error-mapping `period-not-closed`/`not-found`.
