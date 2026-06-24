# W1 — Implementação (GREEN) · FIN-STATEMENT-VARCHAR-BOUNDS (#161)

**Agente:** drizzle-orm-expert · **Resultado:** GREEN ✅

`statement.mapper.ts`: helper `truncate(value, max)` + constantes `ENTRY_TYPE_MAX=16` / `PAYEE_NAME_MAX=255` / `MEMO_MAX=500` (espelham `schemas/mysql.ts:589-591`), aplicado a `entryType`/`payeeName`/`memo` em `transactionsToRows`.

- CA1 (memo 600→500) ✅ · CA2 (payee 300→255) ✅ · intactos ✅.
- CA3 (erro de infra preservado): o caminho de erro do repo é **inalterado** — o truncate só ajusta o texto antes do INSERT; `bank-statement-repository-failure` continua sendo retornado em falha real.
- `entry_type` é enum fechado (#159); o truncate a 16 é defensivo (no-op para valores válidos) e fecha o CA2-entry_type literal da issue.

Testes: #161 3/3; `statement.mapper.test.ts` 3/3 (sem regressão).
