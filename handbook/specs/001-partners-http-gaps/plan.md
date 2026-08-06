# Implementation Plan: Gaps de borda HTTP do módulo `partners`

**Branch**: `001-partners-http-gaps` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-partners-http-gaps/spec.md`

> Plano do épico. Consolida `spec.md`, `domain.md`, `recon.md`, `adr/{0001,0002}` e `metrics.md`.
> Constitution Check contra a constituição do **core-api** (I–IX). **Fatia o épico em tickets W0→W3.**

## Summary

Fechar os 5 gaps de borda HTTP do módulo `partners` reportados pelo front (`008-partners`), **estendendo** o
módulo existente (não greenfield). 4 gaps são borda fina sobre código pronto (import, export, catálogo,
filtros); 1 é uma feature de domínio (estados/municípios parceiros, soft-delete — ADR-0001 desta feature,
resolve a D9 do ADR-0031). Toda serialização/parsing CSV converge no util compartilhado `shared/utils/csv.ts`
(ADR-0002). Entrega = superfície HTTP `/api/v1` que o BFF consome para trocar mock→real sem tocar
UI/ViewModel.

## Technical Context

**Language/Version**: TypeScript 6→7 strict, ESM (NodeNext) · Node 24 LTS
**Primary Dependencies**: Fastify 5 + `fastify-zod-openapi` (borda, ADR-0025/0027) · Drizzle ORM + mysql2 (ADR-0020) · Zod 4
**Storage**: MySQL 8.4 (prefixo `par_*`, ADR-0014) — 2 tabelas novas (`par_states`, `par_municipalities`)
**Testing**: `node:test` + `--experimental-strip-types` (domínio/aplicação/repo in-memory) · integração via Docker compose `--wait` (constraints MySQL) · `fastify.inject` (rotas)
**Target Platform**: Node 24 server (borda HTTP ativa — ADR-0025/0033) + CLI
**Project Type**: modular monolith backend (módulo vertical `partners`)
**Performance Goals**: catálogo p95 < 50ms; territorial < 100ms; import ≤50 linhas < 2s (ver `metrics.md`)
**Constraints**: RBAC em toda rota (401/403); `requestId` no envelope; CSV escape anti-injection; sem JSON/ENUM nativo (ADR-0020)
**Scale/Scope**: 5 sub-domínios · ~7 rotas novas · 2 tabelas · 1 util (parse) · 6 tickets W0→W3

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Aderência | Nota                                                                                                                                                                               |
| --------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✓         | cada ticket abre `.pipeline/<TICKET>/` com W0 RED antes de `src/`                                                                                                                  |
| II. Regressão zero                | ✓         | W3 = typecheck+format+lint+test verdes; sem fechar com vermelho                                                                                                                    |
| III. pnpm only                    | ✓         | nenhum `npm`; parsing CSV nativo (zero dep nova)                                                                                                                                   |
| IV. Modular Monolith / isolamento | ✓         | só BC `partners` (`par_*`); CSV em `shared/` (não cross-module — ADR-0002); sem leitura cross-BC                                                                                   |
| V. Domínio puro                   | ✓         | `PartnerState`/`PartnerMunicipality` = funções + `Readonly` + smart constructor `Result`; sem classe/throw; parsing/serialização ficam em `shared/`+`adapters/`, fora de `domain/` |
| VI. MySQL 8 + Drizzle migrations  | ✓         | `par_states`/`par_municipalities` via `pnpm run db:generate`; soft-delete com CHECK (sem ENUM/JSON nativo)                                                                         |
| VII. CLI-first; HTTP exige ADR    | ✓         | **HTTP já habilitado** por ADR-0025 (Fastify) + ADR-0033 (`/api/v1`); `partners` já tem plugins. O "exige ADR" foi cumprido — não é violação. CLI opcional, não obrigatória aqui.  |
| VIII. TS strict + ESM + idioma    | ✓         | `import type`, `.ts` nos imports, `#src/*`; erros EN kebab-case; docs/commits PT                                                                                                   |
| IX. Cânone + citação              | ✓         | domain.md (Evans/Vernon), adr (Vernon/Fowler), metrics (Newman) com citação ≥4 linhas verificada                                                                                   |

**Resultado: PASS** — sem violações. A única "complexidade" (2 tabelas + plugin novo) é intrínseca à US-002
e justificada pelo ADR-0001 (resolve D9). Nada a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-partners-http-gaps/
├── discovery.md · spec.md (+ checklists/) · recon.md
├── domain.md · adr/{0001,0002}.md · metrics.md
├── plan.md (este) · research.md · data-model.md · quickstart.md · contracts/
└── bdd/ · tasks.md (Fase 6/10)
```

### Source Code (estende o módulo `partners` existente)

```text
src/shared/utils/
└── csv.ts                         # + parseCsv/tokenizeCsv (CORE-CSV-PARSE-UTIL — ADR-0002)

src/modules/partners/
├── domain/geography/
│   ├── partner-state.ts           # NOVO — Entity (uf, active, deactivatedAt) + transições
│   └── partner-municipality.ts    # NOVO — Entity (ibgeCode, uf, active, deactivatedAt)
├── application/
│   ├── ports/partner-geography-repository.ts   # NOVO — port (toggle/list)
│   └── use-cases/
│       ├── toggle-partner-state.ts             # NOVO
│       ├── toggle-partner-municipality.ts      # NOVO
│       ├── list-partner-states.ts              # NOVO
│       └── list-partner-municipalities.ts      # NOVO
├── adapters/
│   ├── http/
│   │   ├── plugin.ts               # + rota POST /collaborators/import (US-001)
│   │   ├── supplier-plugin.ts      # + GET /suppliers/export (US-003) + GET /suppliers/service-categories (US-004)
│   │   ├── partner-geography-plugin.ts   # NOVO — rotas territoriais (US-002)
│   │   ├── composition.ts          # + wiring importCollaborators + geography repo
│   │   ├── collaborator-import-dto.ts    # NOVO — CSV record → RegisterCollaboratorCommand (Zod)
│   │   └── *-schemas.ts            # schemas Zod das rotas novas
│   └── persistence/
│       ├── schemas/mysql.ts        # + par_states + par_municipalities (soft-delete + CHECK)
│       ├── migrations/mysql/       # geradas por db:generate
│       └── repos/
│           ├── partner-geography-repository.drizzle.ts    # NOVO
│           └── partner-geography-repository.in-memory.ts  # NOVO
├── domain/supplier/service-category.ts   # + listServiceCategories() (US-004)
└── public-api/permissions.ts       # + GEOGRAPHY_PERMISSION (read/write)

src/server.ts                        # + registro partner-geography-plugin {prefix:'/api/v1'}
```

**Structure Decision**: módulo vertical único `partners` estendido, espelhando os padrões reais levantados no
`recon.md` (plugin = `supplier-plugin.ts`; soft-delete = `parSuppliers`; composition = `makeDeps`). Sem
estrutura nova.

## Complexity Tracking

> Constitution Check passou sem violações — nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabelas novas (`par_states`, `par_municipalities`) · [x] índices (`active`) · [ ] FKs (catálogo é seed estático, não tabela — sem FK) · CHECK de coerência soft-delete
- **Prefixo de isolamento correto?** `par_*` (ADR-0014): **sim**
- **Outbox**: novo evento? **não** (domain.md — zero evento nesta fase)
- **Comando**: editar `schemas/mysql.ts` → `pnpm run db:generate --config drizzle.config.partners.ts` → versionar migration
- **Restrições MySQL 8** (ADR-0020): `active` boolean + `deactivated_at` datetime + CHECK; UF/IBGE como varchar (sem ENUM); sem JSON

## Contrato HTTP (borda ativa — ADR-0025/0033)

Todas sob `/api/v1`, `requireAuth` + `authorize`, envelope `{error:{code,message,requestId}}`, schema Zod:

| Método      | Rota                                                                | Permissão            | US     |
| ----------- | ------------------------------------------------------------------- | -------------------- | ------ |
| POST        | `/collaborators/import` (multipart CSV)                             | `collaborator:write` | US-001 |
| GET         | `/suppliers/export` (CSV; filtros `search/active/categories[]`)     | `supplier:read`      | US-003 |
| GET         | `/suppliers/service-categories` (read-only, 39)                     | `supplier:read`      | US-004 |
| GET         | `/partner-states` (lista + isPartner)                               | `geography:read`     | US-002 |
| POST/DELETE | `/partner-states/:uf` (toggle soft-delete)                          | `geography:write`    | US-002 |
| GET         | `/partner-municipalities?uf=` (cross-state na leitura de parceiros) | `geography:read`     | US-002 |
| POST/DELETE | `/partner-municipalities/:ibgeCode` (toggle)                        | `geography:write`    | US-002 |

- **Backward-compat**: rotas **novas**; `GET /collaborators` mantém contrato (FR-012: não anuncia `programa`/`idade`).

## Fatiamento em tickets W0→W3

| Ordem | Ticket                                 | Size | Escopo                                                                                                                                                     | Depende de |
| ----- | -------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1     | **`CORE-CSV-PARSE-UTIL`**              | S    | Promover `parseCsv`/`tokenizeCsv` (genérico `string→Table`) a `shared/utils/csv.ts`; migrar parser de `contracts/cli` sem regressão                        | —          |
| 2     | **`PARTNERS-COLLAB-IMPORT-HTTP`**      | M    | Rota `POST /collaborators/import` + wiring `importCollaborators` + dto CSV→command (Zod) + adapta output `{created,failed:[{line,error}]}`                 | #1         |
| 3     | **`PARTNERS-SUPPLIER-EXPORT-HTTP`**    | S    | Rota `GET /suppliers/export` (consome `suppliersToCsv` pronto)                                                                                             | —          |
| 4     | **`PARTNERS-SERVICE-CATEGORIES-HTTP`** | S    | `listServiceCategories()` + rota `GET /suppliers/service-categories`                                                                                       | —          |
| 5     | **`PARTNERS-TERRITORY`**               | L    | Domínio `PartnerState`/`PartnerMunicipality` + port + use-cases + schema `par_*` + migration + repos (drizzle+in-memory) + plugin + `GEOGRAPHY_PERMISSION` | —          |
| 6     | **`PARTNERS-COLLAB-FILTERS-DECISION`** | S    | Garantir contrato `GET /collaborators` não anuncia `programa`/`idade` (doc/OpenAPI + teste)                                                                | —          |

> Tickets 1→6 são independentes salvo a dependência marcada (#2 precede por #1). Cada um percorre W0→W3 com
> seu próprio `pnpm run pipeline:state init <ticket> --size <S|M|L>`.

## Estimativa de Pipeline (W0 size)

- **Épico**: **L** (agrega 6 tickets; 1 deles — `PARTNERS-TERRITORY` — é L sozinho: BC estendido + 2 tabelas + migration + plugin).
- **Justificativa**: 4 tickets S/M de borda + 1 L de domínio/persistência + 1 S de decisão. O `--size` real é por ticket (tabela acima).
- **Plano de testes W0 (RED) — primeiras suítes a falhar:**
  - `tests/shared/utils/csv.parse.test.ts` — `parseCsv` inexistente (ticket 1).
  - `tests/modules/partners/collaborator-import.http.test.ts` — rota 404 / deps sem `importCollaborators` (ticket 2).
  - `tests/modules/partners/supplier-export.http.test.ts` + `service-categories.http.test.ts` — rotas 404 (tickets 3-4).
  - `tests/modules/partners/partner-state.test.ts` + `partner-territory.http.test.ts` — Entity/port/rotas inexistentes (ticket 5).
  - `tests/modules/partners/collaborator-list-contract.test.ts` — assegura ausência de `programa`/`idade` (ticket 6).

## Review do Plano (`/acdg-skills:database-engineer`)

Revisão do schema territorial (ticket #5) — único que toca persistência:

- **PK natural** (`uf varchar(2)` / `ibge_code varchar(7)`): correta — a identidade do domínio é a própria UF/IBGE (unicidade natural), sem surrogate. Coincide com o padrão de catálogo (sem `AUTO_INCREMENT` em PK de domínio — ADR-0020).
- **Índice em `active`** (coluna de baixa cardinalidade): justificado porque a query dominante é "listar parceiras ativas". A relevância depende da seletividade estimada pelo otimizador:

  > The MySQL query optimizer uses estimated statistics about key distributions to choose the indexes for an execution plan, based on the relative selectivity of the index. When InnoDB updates optimizer statistics, it samples random pages from each index on a table to estimate the cardinality of the index. (This technique is known as random dives.)
  > — *(Linha 138711, p. 3103, Oracle Corporation, *MySQL 8.4 Reference Manual*)*

  Como `active` é booleano (baixa cardinalidade), num volume pequeno (≤27 UFs; municípios na casa de milhares) o otimizador pode preferir full scan — o índice é **barato e inofensivo**, e vira útil se o volume crescer. Em `par_municipalities`, o índice composto candidato `(active, uf)` cobre melhor a listagem por UF; manter `(uf)` simples se a query de catálogo dominar. **Decisão**: começar com `(active)` + `(uf)` simples; reavaliar com `EXPLAIN` no volume real (sem otimização prematura).

- **CHECK de coerência** `(active = FALSE) = (deactivated_at IS NOT NULL)`: replica o padrão validado de `parSuppliers` — garante o invariante do soft-delete no nível do banco (defense-in-depth além do domínio).
- **Sem FK para catálogo**: correto — catálogo é seed estático (ADR-0031 §3), não tabela; integridade da UF/IBGE validada no domínio na escrita (`State.parse`/`Municipality.parse`).
- **Migration**: gerar com `pnpm run db:generate --config drizzle.config.partners.ts` (nunca SQL à mão — Princ. VI).

**Veredito**: schema APROVADO — alinhado a ADR-0014/0020 e ao padrão existente do módulo.
