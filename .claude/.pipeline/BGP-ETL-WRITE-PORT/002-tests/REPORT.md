# BGP-ETL-WRITE-PORT — W0 (testes RED) — REPORT

> Fatia 2/3 do ETL-BUDGET-PLANS. Wave W0 (fail-first). Skill: `tdd-strategist` (via pipeline-maestro).
> Objetivo: provar, em vermelho, o contrato da porta de escrita `buildBudgetPlansEtlPort` — que
> ainda NAO existe. Nenhuma linha de `src/` foi tocada.

## O que foi testado (mapa CA -> assercao)

Molde canonico seguido: `partners/public-api/etl.ts` (`LegacyEntityStore<A, Ref>` com
`findByLegacyId` + `provision(input, legacyId) -> 'created' | 'already-exists'`) e
`financial/public-api/etl.ts` (pool boot-scoped + `close()`).

| CA | Onde | Prova |
| :-- | :-- | :-- |
| CA1 — pool 1x + close() encerra | File A, bloco integracao | Constroi 1 port com 1 `close`; roda a cadeia FK-segura das 6 entidades pelo MESMO port; e prova negativa: apos `close()` a operacao devolve `Result` err (pool morto), NUNCA abre pool por operacao (Incident-0001). |
| CA2 — entidade nova grava legacy_id | File A, bloco integracao | `plans.provision(novo, 7)` -> `created`; `findByLegacyId(7)` devolve o id; `SELECT` confirma exatamente 1 linha com `legacy_id=7`. |
| CA3 — idempotencia (coracao da fatia) | File A, bloco integracao | `subcategories` e `budgetResults` (lancamento): 2a `provision` com o MESMO `legacy_id` -> `already-exists`, sem duplicar (`COUNT=1`) e SEM erro de UNIQUE vazando (Result ok). |
| CA4 — ADR-0006 (grep de imports) | File B (boundary) | (a) o seam `public-api/etl.ts` existe [RED agora]; (b) guard: nenhum arquivo em `scripts/etl/` importa `budget-plans/domain/` nem `application/`. |
| CA5 — erro de conexao -> Result | File A, estrutural + integracao | connection-string malformada -> `Result` err slug kebab `^budget-plans-[a-z-]+$` (sem DB); e host morto (`:59999`) -> `Result` err (com DB). Nunca `throw` cruzando a borda. |

## Arquivos criados

1. `tests/modules/budget-plans/public-api/budget-plans-etl-port.integration.test.ts`
   - Estrutura 2 camadas: bloco ESTRUTURAL (`typeof buildBudgetPlansEtlPort === 'function'` + CA5 sem DB)
     + bloco INTEGRACAO gated `MYSQL_INTEGRATION=1` (CA1/CA2/CA3/CA5) com
     `VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core'`.
   - node:test + node:assert/strict, ESM, imports `.ts`, `import type`, EN/PT-BR ASCII.
   - Inputs de negocio das 6 entidades como PLAIN rows (public-api), nunca agregados de dominio
     (ADR-0006). Ordem de gravacao respeita as FKs: plano -> cost center -> categoria ->
     subcategoria -> budget -> lancamento.
2. `tests/modules/budget-plans/public-api/budget-plans-etl-boundary.test.ts`
   - CA4 puro estrutural (readFile/access/readdir sobre o source) — NAO importa o port, logo roda
     mesmo com o port ausente.

## Arquivos editados

3. `scripts/ci/test-integration.ts` — registrado o novo teste de integracao no grupo `budget-plans`
   (onde a integracao roda no CI; a fatia 1 provou que local esbarra na 3306 do legado).

## Prova do RED (verificada pelo orquestrador — suite completa PURA, sem MySQL)

`pnpm test`: `tests 4192 · pass 4171 · fail 2 · skipped 19`. As 2 falhas sao exatamente:
- `ERR_MODULE_NOT_FOUND` no import de `#src/modules/budget-plans/public-api/etl.ts` (File A inteiro).
- `AssertionError: src/modules/budget-plans/public-api/etl.ts ausente` (File B, CA4a).

RED pelo motivo certo (port inexistente). Zero regressao: `pass` subiu 4170 -> 4171 (o guard CA4b
entrou verde). O unico verde do par e o guard prospectivo ADR-0006 (CA4b) — verde hoje e DEVE seguir
verde (nenhum `scripts/etl/*` referencia dominio/aplicacao de budget-plans; a fatia 3 ainda nao
escreveu o orquestrador).

## Notas para o W1 (GREEN — skill `ports-and-adapters` + par `drizzle-orm-expert`)

- Superficie-alvo do port:
  - `buildBudgetPlansEtlPort({ connectionString }): Promise<Result<BudgetPlansEtlPort, BudgetPlansMysqlDriverError>>`
    — abre o pool 1x via `openBudgetPlansMysql({ applyMigrations: true })` (JA existe), devolve `close`.
  - `BudgetPlansEtlPort = Readonly<{ plans, costCenters, categories, subcategories, budgets,
    budgetResults, close }>`, cada store um `LegacyEntityStore<Input, string>` (Ref = id UUID)
    com `findByLegacyId(legacyId)` + `provision(input, legacyId) -> 'created' | 'already-exists'`.
  - Inputs (plain rows na public-api, importaveis por `scripts/etl/` — nunca `domain/`):
    plan `{id, year, programRef, versionMajor, versionMinor, status, parentId, scenarioName}`;
    costCenter `{id, budgetPlanId, name, direction, active}`; category `{id, costCenterId, name, active}`;
    subcategory `{id, categoryId, name, launchType, active}`; budget `{id, budgetPlanId, partnerKind, partnerRef}`;
    budgetResult `{id, budgetId, subcategoryId, month, model, valueCents}`. `createdAt/updatedAt` do
    plano sao carimbados pelo port (ClockReal), fora do input — molde partners.
- Idempotencia (CA3): decidir `already-exists` por `findByLegacyId` ANTES do insert e blindar contra
  corrida com o UNIQUE `bgp_*_legacy_id_uq` (fatia 1): capturar `ER_DUP_ENTRY` e converter para
  `already-exists`, nunca vazar. O UNIQUE das 6 tabelas ja existe — nao precisa nova migration.
- Ordem de escrita e FKs: plano -> cost center -> categoria -> subcategoria (CASCADE) -> budget
  (FK -> plano) -> budgetResult (SEM FK fisica).
- Slugs de erro: reusar `BudgetPlansMysqlDriverError` (kebab `budget-plans-mysql-driver-*`) p/ CA5.
- CA1 ("conta aberturas"): counting literal de `createPool` via mock ESM e inviavel (binding
  capturado no import). O RED expressa o invariante pela via observavel — pool unico boot-scoped +
  `close()` derruba ops seguintes. Se W1/W2 quiser counting explicito, considerar opener injetavel.

## Proximo passo

W1 GREEN — `src/modules/budget-plans/public-api/etl.ts` +
`adapters/persistence/repos/budget-plans-etl-store.drizzle.ts` (`ports-and-adapters` +
`drizzle-orm-expert`). Gate W1: `pnpm test` + `pnpm run typecheck`; integracao no CI.
