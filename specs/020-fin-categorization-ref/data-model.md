# Phase 1 — Data Model · 020-fin-categorization-ref

## Entidade: Category (referência local — `fin_categories`)

| Campo    | Tipo (domínio)                                         | Persistência (`fin_categories`)                                        | Notas                                                         |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `id`     | `CategoryId` (branded UUID)                            | `varchar(36)` PK                                                       | estável entre sessões/ambientes (seed com UUID fixo) — SC-002 |
| `name`   | `string` (1..120)                                      | `varchar(120)` NOT NULL                                                | exibível no select                                            |
| `group`  | `CategoryGroup` = `'despesa' \| 'receita' \| 'ajuste'` | `varchar(12)` NOT NULL + **CHECK** `IN ('despesa','receita','ajuste')` | agrupamento do protótipo (§9.4.5) — ADR-0020 (sem ENUM)       |
| `active` | `boolean`                                              | `boolean` NOT NULL default `true`                                      | inativos omitidos da listagem (FR-006/007)                    |

**Índices**: `(group, name)` (listagem agrupada+ordenada); `active`.
**Smart constructor**: `createCategory({id,name,group,active})` → `Result<Category, 'category-name-empty' | 'category-group-invalid'>`.

## Entidade: CostCenter (referência local — `fin_cost_centers`)

| Campo    | Tipo (domínio)                | Persistência (`fin_cost_centers`) | Notas                                       |
| -------- | ----------------------------- | --------------------------------- | ------------------------------------------- |
| `id`     | `CostCenterId` (branded UUID) | `varchar(36)` PK                  | estável (seed)                              |
| `code`   | `string` (ex.: `CC-001`)      | `varchar(20)` NOT NULL            | código exibível + ordenação                 |
| `name`   | `string` (1..120)             | `varchar(120)` NOT NULL           | descrição (Administrativo, Programa Saúde…) |
| `active` | `boolean`                     | `boolean` NOT NULL default `true` | soft-delete                                 |

**Índices**: `code` (único? — confirmar unicidade de código no seed); `active`.
**Smart constructor**: `createCostCenter({id,code,name,active})` → `Result<CostCenter, 'cost-center-code-empty' | 'cost-center-name-empty'>`.

## Referência externa: Program (consumido de `programs`, NÃO modelado no financeiro)

| Campo  | Tipo          | Origem                      |
| ------ | ------------- | --------------------------- |
| `id`   | string (uuid) | `programs` (fonte canônica) |
| `name` | string        | `programs`                  |

**Projeção** `ProgramView = { id, name }` devolvida pelo `ProgramReadPort` (programs/public-api). O financeiro referencia Programa **por identidade** (já existe `programRef` no documento — #48); aqui só expõe a LISTA para o select.

## Read-ports (application/ports)

```text
CategoryReadPort.list()    → Result<readonly Category[],   CategoryReadError>      // active=true, ordenado
CostCenterReadPort.list()  → Result<readonly CostCenter[], CostCenterReadError>
ProgramReadPort.list()     → Result<readonly ProgramView[], ProgramReadError>      // consome programs/public-api
```

Cada port: adapter **in-memory** (testes/seed) + **drizzle** (SELECT lean). O `ProgramReadPort` é satisfeito por um `buildProgramsReadPort` exposto pelo `programs/public-api` (a criar lá, espelhando #178) OU por consumo do use-case `listPrograms` já existente — decidir em tasks.

## Sem eventos / sem mutação

Feature read-only: nenhum evento de outbox, nenhuma transação de escrita de agregado de domínio. O único "write" é o **seed** (migração de dados idempotente), fora do fluxo de runtime.
