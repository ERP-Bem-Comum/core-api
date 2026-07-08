# W1 — GREEN · BGP-PLAN-CRUD

> **Frentes:** W1a `ts-domain-modeler` (inline) · W1b `drizzle-orm-expert` (agente) ·
> W1c `fastify-server-expert` (agente) + revisão `zod-expert` · costura pela sessão principal.
> **Data:** 2026-07-02 · **Resultado:** GREEN ✅ (typecheck 0 · lint 0 · 3403 testes, 0 fail)

## W1a — Domínio puro + application + fakes

- `domain/shared/`: `budget-plan-id.ts`, `budget-id.ts` (branded UUID v4, generate/rehydrate),
  `refs.ts` (`ProgramRef`, `PartnerStateRef`, `PartnerMunicipalityRef` rehydrate-only, erro
  `budget-plan-ref-invalid`) — compatível com o `BudgetPlanRef` do financial.
- `domain/budget-plan/`: `types.ts` (`BudgetPartner` união discriminada state XOR municipality),
  `version.ts` (VO `{major, minor}`, `initial()`=1.0, `format()`), `status.ts` (valores de fio
  do legado `RASCUNHO|EM_CALIBRACAO|APROVADO`), `errors.ts`, `events.ts` (`BudgetPlanCreated`),
  `budget-plan.ts` (`create` valida ano 2000-2100; `addBudget` invariante 1-por-parceiro;
  `total` = Σ via `Money.add`), `repository.ts` (port com `findRootByYearAndProgram`,
  `listPaged`, `listYears`).
- `application/ports/`: `program-catalog.ts` (ACL projeção `{ref,name,abbreviation,active}`),
  `partner-network.ts` (`NetworkPartnerView {kind,ref,name,uf}`), `outbox.ts`.
- Use cases: `create-budget-plan` (ref→programa ativo→domínio→duplicidade→persist+evento),
  `list-budget-plans` (hidrata programName 1× por ref), `get-budget-plan` (detalhe+budgets+total),
  `get-budget-plan-options` (programas ativos + years = anos existentes ∪ {corrente, corrente+1} + redes).
- Fakes: repo/catalog/network in-memory + `InMemoryOutbox`.

## W1b — Persistência (agente drizzle-orm-expert)

- `schemas/mysql.ts`: `bgp_budget_plans` (UNIQUE `(year, program_ref)` — leftmost cobre filtro
  por year; index status), `bgp_budgets` (UNIQUE `(budget_plan_id, partner_kind, partner_ref)`,
  FK CASCADE), `bgp_outbox` (espelho de `prg_outbox`). varchar+CHECK, bigint cents, UUID
  varchar(36) utf8mb4_bin — ADR-0014/0018/0020.
- Migration `0000_free_lady_deathstrike.sql` gerada via `db:generate:budget-plans` + charset/
  collation manual (limitação drizzle-kit).
- `drivers/mysql-driver.ts` (`openBudgetPlansMysql`), `mappers/` (reidratação só via smart
  constructors), `repos/budget-plan-repository.drizzle.ts` (save transacional: SELECT FOR UPDATE
  → UPDATE/INSERT header + replace integral dos budgets + outbox na MESMA transação — ADR-0015),
  `public-api/migrate.ts` + registro no `MIGRATORS`.
- **Extensão partners (ACL, precedente #207):** `PartnerGeographyReadPort` SEGREGADO (ISP) —
  `listStates`/`listMunicipalities` ATIVOS, `ref` = chave natural (UF/IBGE), `name` hidratado do
  catálogo IBGE. `PartnersReadPort` estendido aditivamente (financial não quebra).
- Testes: `budget-plan-repository.suite.ts` parametrizada + `inmemory.test.ts` (roda no gate) +
  `drizzle-mysql.test.ts` (gated `MYSQL_INTEGRATION`).
- **Gap registrado p/ Fatia 3 (#317):** `Budget.partner.ref` no domínio é UUID v4, mas
  `par_states`/`par_municipalities` usam chave natural — divergência de identidade a resolver
  quando o orçamento-por-Rede for criável.

## W1c — Borda HTTP (agente fastify-server-expert)

- `adapters/http/{schemas,plugin,budget-plan-dto,composition}.ts` + `public-api/{http,permissions}.ts`.
- 4 rotas sob `/api/v2/budget-plans` (plugin direto), `preHandler [requireAuth, authorize]`,
  `/options` registrada antes de `/:id`.
- Erros: ref/id inválido, `program-not-active`, `budget-plan-invalid-year` → 422;
  `program-not-found`/`budget-plan-not-found` → 404; `budget-plan-already-exists` → 409;
  `*-unavailable`/`outbox-append-failed` → 503; default 422 (padrão programs).
- Permissões `budget-plan:read|write` no `CATALOG_RAW` + teste-âncora CA5 sincronizado.
- Paginação canônica do repo (limit 1..100 default 20), não o `paginateData` legado.

## Revisão zod-expert (par obrigatório)

- Veredito CHANGES-REQUESTED → **M1 aplicado**: filtro `?year=` da lista ganhou bounds
  (1900-2200, precedente partners `yearOfContract` — mais largo que o create de propósito:
  consulta histórica é legítima; bound veda overflow/notação científica na coerção).
- Minors m1 (redação 5xx no `sendWriteError`) e m2 (`page` sem teto) são convenções
  pré-existentes transversais (programs/partners/contracts) — **registrar via `issue-report`**,
  não scope-creep aqui. Nits (uf.length, nonnegative em response) dispensados.

## Costura (sessão principal)

- `programs`: novo `ProgramCatalogReadPort` SEGREGADO (`listCatalog` com status — campo
  obrigatório em `ProgramView` quebraria fakes de contracts/financial) + store drizzle +
  extensão aditiva do `ProgramsReadPort`.
- `budget-plans`: adapters ACL `program-catalog.from-programs.ts` e
  `partner-network.from-partners.ts`; `composition.ts` ganhou o branch `mysql` (uma connection
  string para `bgp_*` + read ports `prg_*`/`par_*`, molde financial; boot NÃO migra).
- `server.ts`: `BUDGET_PLANS_DRIVER=mysql` + `BUDGET_PLANS_DATABASE_URL` (senão memory degradado).

## Regressões pré-existentes corrigidas (política de regressão zero)

1. `src/jobs/financial/payable-view-backfill/reader.ts` + teste: `PayableView` ganhou
   `debitAccountRef`/`paidAt` (#231/#307 cruzaram com #236) sem sincronizar o backfill —
   projeção e factory atualizados, 4/4 verdes.
2. `tests/modules/auth/domain/authorization/permission-catalog.test.ts` (CA5): lista exata
   sincronizada com `budget-plan:*`.

## Validação final

```
pnpm run typecheck   → 0 erros
pnpm run lint        → 0 erros
pnpm run format:check→ OK (JSONs de migration formatados)
pnpm test            → 3403 testes · 3385 pass · 0 fail · 18 skip (integração gated)
```
