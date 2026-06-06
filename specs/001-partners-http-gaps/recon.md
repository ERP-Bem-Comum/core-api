# RECON — módulo `partners` (Fase 1.5)

**Feature**: `specs/001-partners-http-gaps/` · A feature **estende** código existente. Este recon lê o
módulo-alvo e fixa o que **REUSAR** e o que **NÃO reinventar**, antes de modelar o domínio (achado #6 do
smoke test). Cada item cita o arquivo real.

## 1. Padrões a REUSAR (não reinventar)

### 1.1 Plugin HTTP — template canônico: `adapters/http/supplier-plugin.ts`

- `FastifyPluginAsyncZodOpenApi`; cada rota é `scope.route({ method, url, preHandler: [hooks.requireAuth, hooks.authorize(PERM)], schema: { querystring|params|body, response } satisfies FastifyZodOpenApiSchema, handler })`.
- Resposta: `sendResult(reply, ok(dto), { ok: 200 })`; erro de escrita: `sendWriteError(reply, code)` → `toErrorEnvelope(code, code, requestId)` com `requestId = currentCorrelationId() ?? reply.request.id`.
- Mapeamento código→status via `ReadonlySet` (`CONFLICT_CODES`→409, `NOT_FOUND_CODES`→404, `BAD_REQUEST_CODES`→400, `FORBIDDEN_CODES`→403, `REPO_UNAVAILABLE_CODES`→503, default 422).
- Hooks: `SuppliersHttpHooks { requireAuth, authorize, hasPermission }` (`hasPermission` para RBAC condicional de campo vital).
- Export final: `xHttpPlugin(deps, hooks): FastifyPluginAsync` → `app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(routes(deps, hooks))`.
- **Consequência**: rotas novas de export/catálogo entram **dentro de `supplier-plugin.ts`**; import dentro de `plugin.ts` (collaborators); territorial é **novo plugin** (`partner-geography-plugin.ts`).

### 1.2 Composition — `adapters/http/composition.ts`

- `PartnersHttpDeps = Readonly<{...funções...}>`; `Pools` (memory|mysql) com `makeMemoryPools`/`buildMysqlPools`; `makeDeps(pools)` instancia os use-cases.
- **Wiring do import (US-001) é trivial**: os pools já expõem `collaboratorWriterRepo` + `clock` (linhas 176-217). Basta adicionar ao type e ao `makeDeps`: `importCollaborators: importCollaborators({ collaboratorRepo: pools.collaboratorWriterRepo, clock })`.

### 1.3 Schema `par_*` + soft-delete — `adapters/persistence/schemas/mysql.ts`

- Padrão de soft-delete **já consolidado** (casa com a decisão Q1=soft-delete): `active: boolean('active').notNull().default(true)` + `deactivatedAt: datetime('deactivated_at', { mode:'date', fsp:3 })` + **CHECK de coerência** `(active = FALSE) = (deactivated_at IS NOT NULL)` (ex.: `parFinanciers:54-57`, `parSuppliers:102-105`).
- Colaborador estende com `disable_by` (`parCollaborators:166-181`). Enums = `varchar` com literal legado (ADR-0020, sem ENUM nativo).
- **Consequência**: `par_states`/`par_municipalities` seguem o **mesmo** padrão `active`+`deactivated_at`+CHECK. Sem inventar coluna nova.

### 1.4 Montagem no root — `src/server.ts:95-118`

- Plugins partners registrados como `{ plugin: xHttpPlugin(partnersDeps, { hooks }), prefix: '/api/v1' }` (ADR-0033). `app.ts:180`: plugin direto = `/api/v2`; `{plugin, prefix}` = prefixo explícito.
- **Consequência**: o novo plugin territorial é adicionado à lista com `prefix: '/api/v1'`.

### 1.5 Catálogos geográficos read-only — `domain/geography/{state,municipality}.ts`

- `State.listStates()`, `State.parse(raw): Result<StateAbbreviation, StateError>`; `Municipality.listMunicipalities()`, `listMunicipalitiesByUf(uf)`, `IbgeCode` branded. Seed estático (ADR-0031 §3, decisão D7).
- **Consequência**: a parceria territorial **referencia** UF (`StateAbbreviation`) e município (`IbgeCode`) já existentes — a novidade é só a **camada de parceria persistida** (`par_states`/`par_municipalities`), não um novo catálogo.

### 1.6 RBAC — `public-api/permissions.ts`

- `COLLABORATOR_PERMISSION`, `SUPPLIER_PERMISSION`, `FINANCIER_PERMISSION` = `{ read, write }` (`resource:action`). SSoT consumida por plugin + seed RBAC.
- **Lacuna**: não há permissão geográfica. Territorial precisa de nova entrada (provável `GEOGRAPHY_PERMISSION = { read, write }` ou `PARTNER_STATE_PERMISSION`). Decisão de naming no `domain.md`/`plan.md`.

## 2. Correções de escopo reveladas pelo RECON (achado #6 em ação)

| Item da spec                      | O que o RECON mostrou                                                                                                                                                                                                    | Ajuste                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-003 export**                 | `adapters/export/supplier-csv.ts` **já existe e já consome** `shared/utils/csv.ts` (`suppliersToCsv` pronto, achatamento por `status` completo)                                                                          | Gap é **só a rota** `GET /suppliers/export` no plugin — menor que o previsto.                                                                                                                                                                                                                                       |
| **CORE-CSV-SHARED-UTIL** (FR-013) | `src/shared/utils/csv.ts` **já existe** (`escapeCsvCell`/`toCsvLine`/`toCsv`/`BOM`/`SEPARATOR`); `contracts-csv.ts` **já migrou**. A extração de **serialização** já foi feita (2026-06-02).                             | **Reescopar**: falta só o **lado parsing**. Há `parseCsv`/`tokenizeCsv` **privado** em `contracts/cli/import-parser.ts:133` (cross-module, não importável, ADR-0006). Ticket vira **`CORE-CSV-PARSE-UTIL`**: promover `tokenizeCsv`+`parseCsv(content): Result<Table, CsvError>` genérico ao `shared/utils/csv.ts`. |
| **US-001 import**                 | `application/use-cases/import-collaborators.ts` recebe `rows: readonly RegisterCollaboratorCommand[]` **já estruturadas**; output `{ importedCount, failed: [{ index, error }], isPartialImport }`. **NÃO faz parsing**. | A borda HTTP faz: multipart→texto → `parseCsv` (util) → mapear cada record→`RegisterCollaboratorCommand` (Zod) → `importCollaborators` → adaptar output ao contrato do front `{ created, failed: [{ line, error }] }` (`index`→`line`, `error`→string).                                                             |
| **FR-010 soft-delete**            | O vocabulário de soft-delete (`active`+`deactivated_at`+CHECK) **já é o padrão** do schema.                                                                                                                              | Decisão Q1=B é a de menor atrito — zero divergência de padrão.                                                                                                                                                                                                                                                      |

## 3. O que NÃO fazer (anti-reinvenção)

- **NÃO** criar mecânica CSV nova nem por módulo — usar `shared/utils/csv.ts` (serialização pronta; parsing a promover).
- **NÃO** colocar parsing/serialização no `domain/` — é borda (ADR-0006; `EXPORT-ABSTRACTION-DESIGN.md`).
- **NÃO** importar `contracts/cli/import-parser.ts` de `partners` (cross-module proibido, ADR-0006) — promover ao `shared/`.
- **NÃO** construir porta genérica N-formatos / `Exporter<T>` / Strategy — YAGNI (Rule of Three não fechou; só CSV existe).
- **NÃO** criar novo catálogo geográfico — reusar `geography/{state,municipality}.ts`.
- **NÃO** inventar padrão de soft-delete — copiar `parFinanciers`/`parSuppliers`.

## 4. Insumos para o domain.md (Fase 2)

- Entidade de parceria territorial: `PartnerState { uf, active, deactivatedAt? }` e `PartnerMunicipality { ibgeCode, uf, active, deactivatedAt? }` — **entidade com soft-delete** (não mais "VO de referência" puro, pois a decisão Q1=soft-delete dá ciclo de vida: Active↔Inactive). Reconciliar com o `domain.md` do front (que as modelou como VO) — aqui o backend ganha a persistência.
- Reusar `StateAbbreviation` e `IbgeCode` (branded já existentes).
- `ServiceCategory` (39 literais) já é a fonte canônica do catálogo (US-004) — expor função `listServiceCategories()` read-only.
