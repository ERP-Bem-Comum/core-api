# W1 — Implementação (GREEN) · CTR-PUBLICAPI-CATEGORIZATION (#178)

**Data**: 2026-06-20 · espelha `partners/public-api/read.ts` (read-port cross-módulo).

| Camada | Arquivo (novo) | Conteúdo |
| --- | --- | --- |
| Port | `application/ports/contract-categorization-read.ts` | `ContractCategorizationReadPort.getCategorization(contractId)` → `Result<ContractCategorizationView \| null, err>`. View = `{contractId, programId, budgetPlanId, categorizacao, centroDeCusto}`. |
| Adapter (memory) | `repos/contract-categorization-read.in-memory.ts` | projeção semeada por id (testes/dev). |
| Adapter (drizzle) | `repos/contract-categorization-read.drizzle.ts` | SELECT lean das 4 colunas por id (devolve a View, nunca o row cru — ADR-0006/0014). Read-only; erro→`err` (sem throw). |
| Public-api | `public-api/read.ts` + `index.ts` | `buildContractsReadPort({connectionString})` (openMysql read-only, sem applyMigrations) + close(); re-exportado no `index.ts` (ponto único de import, ADR-0006). |

GREEN: read-port 2/2, suíte 3013 pass / 0 fail. **Destrava #48** (financial deriva a categorização de `contractRef` via `buildContractsReadPort`). Labels ricos de `programId`/`budgetPlanId` virão do módulo Orçamento (#113); por ora expõe refs + os rótulos livres do contrato.
