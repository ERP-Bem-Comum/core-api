# W0 — Testes RED · CTR-PUBLICAPI-CATEGORIZATION (#178)

**Agente**: tdd-strategist · **Data**: 2026-06-20 · branch `feat/contracts-publicapi-categorization`.

Expor a categorização do contrato (categoria/programa/plano/centro de custo) na **public-api de contracts** (ADR-0006), consumível pelo financial dado um `contractId` — pré-req da categorização herdada (#48).

| Camada | Teste RED |
| --- | --- |
| Public-api (read-port) | `public-api/contract-categorization-read.test.ts` — `getCategorization(contractId)` retorna a `ContractCategorizationView`; id inexistente → `ok(null)`. RED (read store não existe). |

**Achado:** o agregado Contract já persiste `programId`/`budgetPlanId` (refs leves) + `categorizacao`/`centroDeCusto` (rótulos). O gap era só **expor** uma leitura plana via public-api (sem tocar `ctr_*` cru) — espelha `partners/public-api/read.ts`.
