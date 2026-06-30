# W0 — RED · FIN-RECON-PERIOD-REOPEN (#203)

**Skill:** tdd-strategist · **Disciplina:** TDD red-first, sem tocar `src/`.

## Objetivo
Testes que falham por inexistência da API, descrevendo CA1–CA5 do reopen (`Closed → Open`), espelhando o close (#173).

## Arquivos de teste tocados
- `tests/modules/financial/domain/reconciliation/period.test.ts` — estendido com `describe('reopenPeriod')`:
  - CA5 (domínio): Closed → Open, `closedAt`/`closedBy` nulos, 1 evento `ReconciliationPeriodReopened` (id/range preservados; `occurredAt` do clock).
  - CA2 (domínio): já Open → `err('period-not-closed')`, não transiciona.
- `tests/modules/financial/adapters/http/financial-period.http.test.ts` — estendido (wiring `reopenReconciliationPeriod` + novo describe):
  - CA1: Closed + `POST /:id/reopen` com `reconciliation:close` → 200, status Open, periodId ecoado.
  - CA2: já Open (após 1º reopen) → 409 (slug `period-not-closed`).
  - CA3: `:id` inexistente → 404 (`reconciliation-period-not-found`).
  - CA4: sem `reconciliation:close` → 403.
- CA5 (segurança contábil): coberto pela pureza do domínio — `reopenPeriod` só transiciona status; não toca transações/saldos.

## Saída literal (RED por inexistência)
period.test.ts: SyntaxError — module does not provide an export named 'reopenPeriod'. tests 1 / pass 0 / fail 1.
financial-period.http.test.ts: ERR_MODULE_NOT_FOUND — .../use-cases/reopen-reconciliation-period.ts. tests 1 / pass 0 / fail 1.

Nenhum arquivo de `src/` tocado nesta wave.

## Próximo passo
W1 GREEN: domínio `reopenPeriod`+evento, use case, port `reopen`, adapters, slug `period-not-closed` (→409), schema, composição, rota.
