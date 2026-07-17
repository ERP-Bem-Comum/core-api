# BGP-ETL-WRITE-PORT — W1 (implementação até GREEN) — REPORT

> Fatia 2/3 do ETL-BUDGET-PLANS. Wave W1 (GREEN). Skill: `ports-and-adapters` (par `drizzle-orm-expert`).
> Objetivo: criar `buildBudgetPlansEtlPort` até os 2 RED do W0 passarem, mínimo (YAGNI). Molde:
> `partners/public-api/etl.ts` + `partners-etl-store.drizzle.ts` + `financial/public-api/etl.ts`.

## Arquivos criados

1. **`src/modules/budget-plans/application/ports/legacy-entity-store.ts`**
   - `LegacyEntityStore<Input, Ref>`: `findByLegacyId(legacyId)` + `provision(input, legacyId) -> 'created'|'already-exists'`.
   - `BudgetPlansEtlStoreError = 'budget-plans-etl-store-unavailable' | 'budget-plans-etl-store-integrity-violation'`.
   - 6 Inputs PLAIN rows (public-api, nunca agregados — ADR-0006). `createdAt/updatedAt` do plano fora do input (carimbados via ClockReal).

2. **`src/modules/budget-plans/adapters/persistence/repos/budget-plans-etl-store.drizzle.ts`**
   - `createDrizzleBudgetPlansEtlStores(handle, clock)` -> os 6 stores (Ref = id UUID string).
   - Helpers do molde partners: `dupEntryIndexName`, `classifyProvisionError`, `safe`, `runProvision`.

3. **`src/modules/budget-plans/public-api/etl.ts`**
   - `buildBudgetPlansEtlPort({ connectionString }): Promise<Result<BudgetPlansEtlPort, BudgetPlansMysqlDriverError>>`.
   - Pool 1x via `openBudgetPlansMysql({ applyMigrations: true })`, stores com `ClockReal()`, devolve `{ ...stores, close }`.

## Arquivo tocado (fix de tipagem no teste do W0)

4. **`tests/modules/budget-plans/public-api/budget-plans-etl-boundary.test.ts`**
   - `let entries: Awaited<ReturnType<typeof readdir>>` -> `let entries: Dirent[]` + `import type { Dirent }`.
   - **Só anotação de tipo; a asserção do CA4 está intacta** (verificado no diff pelo orquestrador).
   - Motivo: escape do W0 — o gate do W0 é `pnpm test`, não `tsc`, então um erro só-de-tipo passou.
     Regressão zero (#14): o W1 não fecha com `tsc` vermelho, mesmo herdado.

## Como a idempotência (CA3) foi feita — verificado no source

`provision` numa transação Drizzle:
1. `SELECT id WHERE legacy_id = ? FOR UPDATE` — existe -> `already-exists` (skip, NUNCA UPDATE).
2. Senão `INSERT { ...input, legacyId }` -> `created` (plano também carimba `createdAt/updatedAt`).
3. Corrida: `ER_DUP_ENTRY` (errno 1062) no índice `bgp_<x>_legacy_id_uq` -> `classifyProvisionError`
   converte para `already-exists` — o UNIQUE do legacy_id **nunca vaza**. Dup em outra UNIQUE
   `bgp_*_uq` (dado do legado) -> `integrity-violation`; demais -> `unavailable` (conservador).
   Sem `ON DUPLICATE KEY` (ADR-0020). Os UNIQUE já existem (fatia 1) — **nenhuma migration nova**.

## Prova do GREEN (suíte PURA, sem MySQL) — verificada pelo orquestrador

| Métrica | Antes (W0 RED) | Depois (W1) |
| :-- | :-- | :-- |
| tests | 4192 | 4193 |
| pass | 4171 | 4174 |
| fail | 2 | 0 |
| skipped | 19 | 19 |

- typecheck: verde. format:check: verde.
- ADR-0006 reverificado: `grep budget-plans/domain|application scripts/etl/` = vazio.
- Integração (CA1/CA2/CA3 real, CA5 host morto) gated `MYSQL_INTEGRATION=1` — roda no W3/CI.

## Notas para o W2 (code-reviewer)
- Foco: ADR-0006 (port na public-api, Inputs plain rows), pool boot-scoped (1x), e o fix de tipagem
  no teste do W0 (item 4 — asserção intacta).
- `classifyProvisionError` (already-exists/integrity-violation/unavailable) é do molde partners.
- Ordem FK-segura de escrita é do caller (fatia 3); o port expõe os 6 stores independentes.

## Próximo passo
W2 REVIEW — `code-reviewer` (read-only, máx 3 rounds). Depois W3 (gate + integração no CI).
