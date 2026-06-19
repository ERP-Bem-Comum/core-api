# W0 — Testes RED · FIN-RECON-STATEMENT-READMODEL (#139)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-statement-readmodel`.

Read-model do extrato por conta + período (running balance, agrupamento por dia, contadores, filtro).

| Camada | Teste RED | Como falha |
| --- | --- | --- |
| Domínio | `domain/statement/statement-view.test.ts` (4 casos) | `buildStatementView` não existe → `ERR_MODULE_NOT_FOUND` |
| Application | `application/use-cases/get-account-statement.test.ts` (3 casos) | use-case não existe |
| Borda HTTP | `adapters/http/statement-readmodel.http.test.ts` (smoke) | rota `GET /cedente-accounts/:id/statement` inexistente |

Deps confirmadas na `dev`: #1 (saldo de abertura via cedente #138), #120 (transações), #123 (flag conciliada). `valueCents` é **absoluto** (`Math.abs(signed)` nos parsers) → running balance assina por `movement`.
