# BGP-PLAN-CRUD — Módulo `budget-plans` · Fatia 1 (US1): CRUD de Plano Orçamentário

> **Issue:** #315 (parent #113, épico #169; destrava a umbrella #89 no go-live).
> **Size:** L · **Módulo NOVO:** `src/modules/budget-plans/` (ADR-0006 modular monolith).
> **Fonte:** issue #315 + legado `ERP-BACKEND/src/modules/{budget-plans,budgets}` (NestJS).
> Nota: o `HANDBOOK-plano-orcamentario-mapa.md` e a branch 041 do front citados na issue
> **não existem** no filesystem — escopo derivado do legado real + CAs da issue.

## Contexto

Primeira entrega do módulo `budget-plans`: o agregado `BudgetPlan` e o CRUD que sustenta
a listagem/criação do front v2. O `financial` já guarda `BudgetPlanRef` (branded UUID v4,
rehydrate-only, `financial/domain/shared/refs.ts:11`) esperando o módulo dono — o
`BudgetPlanId` nasce aqui, no mesmo formato.

## Modelo (portado do legado, adaptado às regras do core-api)

**Agregado `BudgetPlan`** (raiz — cenários/calibração/árvore são Fatias 3-4):

- `id`: `BudgetPlanId` branded UUID v4 (varchar 36 — compatível com `BudgetPlanRef` do financial).
- `year`: int (ano do plano).
- `programRef`: `ProgramRef` branded UUID v4 → módulo `programs` (legado: FK `programId`).
  Programa **não é enum** — ETI/PARC/EPV são linhas da tabela de programas.
- `version`: VO `{ major, minor }`, formatado `"1.0"` (legado: float com major=calibração,
  minor=cenário). US1: sempre nasce `1.0`.
- `status`: `'RASCUNHO' | 'EM_CALIBRACAO' | 'APROVADO'` — valores de fio idênticos ao
  legado (precedente: `ProgramStatus = 'ATIVO' | 'INATIVO'`). US1: nasce `RASCUNHO`;
  transições são Fatia 4.
- `budgets`: coleção de orçamentos por Rede (ver abaixo). US1: nasce vazia; criação de
  orçamento é Fatia 3. `total` do plano = Σ `budgets[].valueInCents` (Money cents).
- `createdAt`/`updatedAt` via Clock port.

**Entidade filha `Budget`** (orçamento por Rede):

- "Rede" = **PartnerState XOR PartnerMunicipality** (estados/municípios parceiros do
  módulo `partners`; no legado o vínculo é exatamente-um-dos-dois, e há no máximo
  **1 orçamento por estado e 1 por município** dentro do plano).
- Campos: `id`, `partner` (união discriminada `{ kind: 'state', ref } | { kind: 'municipality', ref }`),
  `valueInCents` (Money — bigint cents, ADR-0018; resolve a divergência entity bigint ×
  migration int do legado).

**Invariantes portadas do legado:**

1. Plano raiz é único por `(year, programRef)` → erro `budget-plan-already-exists` (409).
2. Programa deve existir e estar ATIVO → `program-not-found` / `program-not-active`.
3. Sem soft delete (e US1 nem expõe delete/update — YAGNI).
4. Máx. 1 budget por parceiro (estado ou município) → invariante do agregado.

**Erros (EN kebab-case):** `budget-plan-already-exists`, `program-not-found`,
`program-not-active`, `budget-plan-not-found`, `budget-plan-invalid-year`.

**Evento de domínio:** `BudgetPlanCreated` (outbox `bgp_outbox`, ADR-0015).

## Endpoints (borda HTTP, prefixo default `/api/v2`)

| Endpoint | Contrato |
| --- | --- |
| `POST /api/v2/budget-plans` | body `{ year, programRef }` → 201 `{ id }`; nasce `RASCUNHO` v`1.0`. (`yearForImport`/duplicação e `scenarioName` = fatias futuras.) |
| `GET /api/v2/budget-plans` | filtros `status?`, `programRef?`, `year?` → lista `{ id, year, programRef, programName, version, status, totalInCents, updatedAt }`. |
| `GET /api/v2/budget-plans/options` | `{ programs: [{ ref, name, abbreviation }], years: number[], redes: [{ kind, ref, name, uf }] }` |
| `GET /api/v2/budget-plans/:id` | cabeçalho + `budgets: [{ id, partner: { kind, ref }, valueInCents }]` + `totalInCents`. 404 `budget-plan-not-found`. |

**Decisões de contrato registradas:**

- **`options` diverge do legado de propósito**: o legado retorna planos APROVADOS como
  opções de dropdown; a CA da #315 pede programas/anos/redes para a tela de criação — a
  issue vence. `programs` via `buildProgramsReadPort().listAll()` (já existe);
  `years` = anos distintos dos planos existentes ∪ `{ anoCorrente, anoCorrente+1 }` (Clock);
  `redes` via **extensão mínima do `partners/public-api/read.ts`** com listagem de
  estados/municípios parceiros (projeção `{ ref, name, uf }` — precedente ACL: #207
  `AuthUserReadPort`, feature 028). As tabelas `par_states`/`par_municipalities` já existem.
- Paginação da lista: seguir o padrão HTTP vigente do core-api (não o `paginateData` legado).
- RBAC: permissões novas `budget-plan:read` / `budget-plan:write` no `CATALOG_RAW`
  (`auth/domain/authorization/permission-catalog.ts`) + `budget-plans/public-api/permissions.ts`.
  Rotas com `preHandler: [requireAuth, authorize(...)]`.

## Infra / wiring

- Tabelas `bgp_budget_plans`, `bgp_budgets`, `bgp_outbox` (prefixo `bgp_` livre — ADR-0014).
  varchar+CHECK para status (sem ENUM), UUID varchar(36) COLLATE utf8mb4_bin, bigint cents
  (ADR-0018/0020). UNIQUE `(year, program_ref)` no plano raiz; UNIQUE budget×parceiro.
- Migrations em `src/modules/budget-plans/adapters/persistence/migrations/mysql/` +
  config `db/drizzle/budget-plans.ts` + script `db:generate:budget-plans` + registro no
  `MIGRATORS` de `src/jobs/migrate/run.ts`.
- `public-api/`: `index.ts`, `http.ts`, `permissions.ts`, `migrate.ts`, `read.ts`
  (read-port mínimo p/ o financial trocar o stub futuramente — expor `getById` retornando
  `{ id, year, programRef, status }`).
- Plugin registrado em `src/server.ts` (forma direta, prefixo default `/api/v2`).
- Esqueleto-molde: módulo `programs` (agregado único + CRUD + outbox).

## Critérios de aceite (Dado/Quando/Então — da issue #315)

1. **Dado** Ano+Programa válidos, **Quando** `POST /budget-plans`, **Então** cria plano
   em `RASCUNHO` v`1.0` e retorna o id (201).
2. **Dado** plano raiz existente de mesmo Ano+Programa, **Quando** `POST`, **Então** 409
   `budget-plan-already-exists`.
3. **Dado** planos existentes, **Quando** `GET /budget-plans`, **Então** lista com
   status/programa/ano/versão/total em centavos (+ filtros).
4. **Dado** um plano com budgets semeados, **Quando** `GET /budget-plans/:id`, **Então**
   cabeçalho + orçamentos por Rede (1 por parceiro; `totalInCents` = soma).
5. **Dado** a tela de criação, **Quando** `GET /budget-plans/options`, **Então**
   `{ programs, years, redes }` populados.
6. RBAC: sem `budget-plan:read`/`write` → 403; sem token → 401.

## Definition of Done

- Gate W3 verde: `pnpm run typecheck` + `format:check` + `lint` + `pnpm test`.
- Coleção Bruno de smoke da fatia (`api-collections/core-api/budget-plans/`) — DoD da #315.
- Permissões novas presentes no `PermissionCatalog.all` (teste-âncora RBAC).
