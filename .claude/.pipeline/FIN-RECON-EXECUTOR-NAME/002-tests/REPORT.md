# W0 — FIN-RECON-EXECUTOR-NAME (#207)

**Resultado:** RED ✅ (falha por inexistência da API — `reconciledByName`/`closedByName` + `AuthUserReadPort`).

Executado por `tdd-strategist` (via `contratos-orchestrator`).

- `tests/modules/financial/adapters/http/reconciliation-executor-name.http.test.ts` — CA1–CA4 (HTTP, `AuthUserReadPort` FAKE injetado; cria conciliação via POST /reconciliations e GET do lookup #175; período #173).
- `tests/modules/financial/adapters/http/resolve-user-name.test.ts` — CA5 unit (6 casos da degradação graciosa).
- `tests/modules/auth/adapters/persistence/user-read.drizzle.test.ts` — CA5 integração drizzle, **gated `MYSQL_INTEGRATION=1`** (roda no CI; skip local).

RED por: campo `reconciledByName`/`closedByName` ausente no DTO/schema e opção `authUserReadPort` inexistente em `buildFinancialHttpDeps`.
