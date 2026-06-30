# Implementation Plan: Dados de referência de categorização (Programa / Categoria / Centro de custo)

**Branch**: `020-fin-categorization-ref` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-fin-categorization-ref/spec.md`

## Summary

Entregar 3 listas de referência consumíveis pelo financeiro para popular os selects de classificação (lançamento manual #124, tratamento da diferença #5, categorização do documento #147). **Decisão A**: **Categoria** e **Centro de custo** são **dados de referência locais do financeiro** (`fin_categories` / `fin_cost_centers`, povoados por seed/migração); **Programa** é consumido por **leitura cross-módulo** da fonte canônica existente (módulo `programs`), por identidade (ADR-0006), sem duplicar. Feature **somente leitura** — sem CRUD de referência nesta fatia.

## Technical Context

**Language/Version**: Node.js 24 LTS · TypeScript 6.0 (ESM, NodeNext)

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4 — ADR-0020); Fastify + Zod (borda HTTP, ADR-0027/0037); `node:test` + `--experimental-strip-types`

**Storage**: MySQL 8.4 — 2 tabelas novas `fin_categories`, `fin_cost_centers` (prefixo `fin_*`, ADR-0014). Programa: lido da fonte `programs` (sem tabela nova no financeiro).

**Testing**: `node:test` (unit/contract in-memory) + `pnpm run test:integration:financial` (Drizzle/MySQL, Docker) para os read stores reais.

**Target Platform**: backend HTTP (borda `/api/v2/financial/*`)

**Project Type**: modular monolith (módulo `financial`, consumindo `programs` via public-api)

**Performance Goals**: leitura de listas pequenas (dezenas a centenas de itens); resposta instantânea para popular `select`.

**Constraints**: read-only; estabilidade de `id` entre sessões; sem tocar tabelas de outro módulo (ADR-0006/0014).

**Scale/Scope**: 2 entidades de referência (Category, CostCenter) + 1 consumo cross-módulo (Program) + 2-3 endpoints `GET`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I — Modular Monolith / isolamento (ADR-0014)**: ✅ Categoria/CC ficam em `fin_*` (financeiro). Programa lido de `programs` **só via public-api** (ADR-0006), espelhando o `ContractCategorizationReadPort` (#178). **Não cria 5º módulo** (Decisão A evita).
- **II — Domínio puro**: ✅ `Category`/`CostCenter` como entidades de referência com smart constructor + branded id + `Result<T,E>`; `group` é union EN-fechada com CHECK no DB (sem ENUM nativo — ADR-0020).
- **III — Outbox**: ✅ N/A — feature de leitura; sem mutação de agregado que dispare evento cross-módulo.
- **IV — MySQL/Drizzle (ADR-0020)**: ✅ varchar+CHECK para `group`; sem JSON nativo, sem triggers/stored procs/ENUM. Migration via `db:generate`.
- **V — Borda HTTP (ADR-0037)**: ✅ endpoints `GET` Zod contract-first, atrás do RBAC do financeiro (read).
- **VI — CLI-first**: N/A (CLI embutida aposentada — ADR-0037).

**Veredito**: PASS. Sem violações (Complexity Tracking vazio).

## Project Structure

### Documentation (this feature)

```text
specs/020-fin-categorization-ref/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões (fonte canônica, grouping, programa-passthrough)
├── data-model.md        # Phase 1 — Category, CostCenter, ProgramView
├── contracts/           # Phase 1 — esboço dos GET (categories/cost-centers/programs)
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/
│   ├── category/            # Category (id branded, name, group union, active) + smart constructor
│   └── cost-center/         # CostCenter (id branded, code, name, active) + smart constructor
├── application/
│   └── ports/
│       ├── category-read.ts      # CategoryReadPort.list()
│       ├── cost-center-read.ts    # CostCenterReadPort.list()
│       └── program-read.ts        # ProgramReadPort.list() (consome programs/public-api)
├── adapters/
│   ├── persistence/
│   │   ├── schemas/mysql.ts            # + fin_categories, fin_cost_centers (+ CHECK group)
│   │   ├── migrations/mysql/00NN_*.sql # gerada por db:generate:financial (+ seed inicial)
│   │   └── repos/                       # category-read.{in-memory,drizzle}.ts; cost-center-read.{...}
│   └── http/
│       ├── schemas.ts + dto.ts + plugin.ts  # GET /categories, /cost-centers, /programs
│       └── composition.ts                    # wira os read stores + program read-port
└── public-api/                # (consumo) programs/public-api → ProgramReadPort no financeiro

src/modules/programs/public-api/   # já expõe listagem de programas (fonte do ProgramReadPort)
```

**Structure Decision**: módulo `financial` ganha 2 entidades de referência locais + read-ports; Programa entra por consumo cross-módulo de `programs/public-api` (mesmo padrão do #178). Endpoints sob `/api/v2/financial/*`.

## Complexity Tracking

> Sem violações de constituição — nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabelas novas (`fin_categories`, `fin_cost_centers`) · [x] índices (por `name`/`code` p/ ordenação; `active`) · [x] CHECK (`group IN ('despesa','receita','ajuste')`, `active`) · [ ] FKs
- **Prefixo de isolamento correto?** `fin_*` — ADR-0014: **sim**.
- **Outbox**: novo evento? **não** (read-only).
- **Comando**: editar `schema.ts` → `pnpm run db:generate:financial` → versionar. **Seed inicial** dos itens de referência (categorias agrupadas + centros de custo do protótipo) via migration de dados ou script idempotente.
- **Restrições MySQL 8 (ADR-0020)**: `group` = varchar + CHECK (sem ENUM nativo); sem JSON.

## Contrato HTTP (Fase 2+)

- **Endpoints novos** (perm `financial:read` ou equivalente; Zod request/response):
  - `GET /api/v2/financial/categories` → `[{ id, name, group: 'despesa'|'receita'|'ajuste' }]` (FR-001/005). Ordenado por `name`. Inativos omitidos (FR-006).
  - `GET /api/v2/financial/cost-centers` → `[{ id, code, name }]` (FR-002). Ordenado por `code`.
  - `GET /api/v2/financial/programs` → `[{ id, name }]` (FR-003) — **passthrough** do `ProgramReadPort` (programs/public-api). _Opcional_: se o front já consome `programs` direto (listProgramsFn), este endpoint é só consistência de contrato; decidir em tasks se entra agora ou fica como follow-up (US3 é P2).
- **Backward-compat**: endpoints novos, sem quebra.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **M** (2 entidades de referência + read-ports + 2-3 endpoints + cross-módulo + seed/migration; sem agregado complexo nem outbox)
- **Justificativa**: padrão já estabelecido (read-port #178; campo+migration #163); o peso é a soma de camadas (domínio leve + persistência + HTTP + seed) em 2 entidades, não complexidade de regra.
- **Plano de testes W0 (RED)**:
  - `domain/category/category.test.ts` — smart constructor: `group` inválido → erro; válido → ok.
  - `domain/cost-center/cost-center.test.ts` — smart constructor (code/name).
  - `adapters/persistence/.../category-read` (in-memory) — `list()` retorna itens agrupados + inativos omitidos.
  - `adapters/http/.../categories.http.test.ts` — `GET /categories` 200 com `{id,name,group}`; `/cost-centers` 200; (RBAC sem permissão → 403).
  - Integração (Docker): `category-read.drizzle` lê a tabela seedada.
