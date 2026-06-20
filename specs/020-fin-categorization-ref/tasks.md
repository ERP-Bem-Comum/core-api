# Tasks: Dados de referência de categorização (Programa / Categoria / Centro de custo)

**Feature**: `020-fin-categorization-ref` · **Spec/Plan**: [spec.md](./spec.md) · [plan.md](./plan.md) · [data-model.md](./data-model.md)

**Ticket de pipeline**: `FIN-CATEGORIZATION-REF` (size **M**). Disciplina W0 RED → W1 GREEN → W2 APPROVED → W3 gate.

**Format**: `[ID] [P?] [Story] Descrição` · **[P]** = paralelizável (arquivos distintos) · stories US1/US2/US3.

---

## Phase 1: Setup

- [ ] **T001** Branch `020-fin-categorization-ref` (✅ feita) + `pnpm run pipeline:state init FIN-CATEGORIZATION-REF --size M`.

## Phase 2: Foundational (pré-req de US1 e US2 — bloqueante)

- [ ] **T002** [P] Schema: adicionar `fin_categories` (`id` PK varchar(36), `name` varchar(120) NOT NULL, `group` varchar(12) NOT NULL + **CHECK** `IN ('despesa','receita','ajuste')`, `active` boolean NOT NULL default true; índices `(group,name)`, `active`) em `src/modules/financial/adapters/persistence/schemas/mysql.ts`.
- [ ] **T003** [P] Schema: adicionar `fin_cost_centers` (`id` PK, `code` varchar(20) NOT NULL, `name` varchar(120) NOT NULL, `active` boolean default true; índice `code`, `active`) no mesmo arquivo.
- [ ] **T004** Migration: `pnpm run db:generate:financial` → versionar a migration gerada (ALTER ADD tabelas — não-quebrante). **Seed idempotente** (UUIDs fixos) das categorias agrupadas + centros de custo do protótipo (CC-001 Administrativo, CC-002 Programa Saúde, …) — via migration de dados ou script de seed determinístico (SC-002).
- [ ] **T005** Confirmar o slug de permissão de leitura no catálogo do `auth` (`financial:read` vs `reconciliation:read`) — alinhar antes dos endpoints.

---

## Phase 3: User Story 1 — Categoria agrupada (P1) 🎯 MVP

### W0 (RED) — testes primeiro

- [ ] **T006** [P] [US1] `tests/.../domain/category/category.test.ts` — smart constructor: `group` fora do union → `category-group-invalid`; `name` vazio → erro; válido → ok.
- [ ] **T007** [P] [US1] `tests/.../adapters/persistence/category-read.in-memory.test.ts` — `list()` retorna só `active`, ordenado, com `group`.
- [ ] **T008** [P] [US1] `tests/.../adapters/http/categories.http.test.ts` (smoke) — `GET /api/v2/financial/categories` → 200 `[{id,name,group}]`; sem permissão → 403.

### W1 (GREEN) — implementação

- [ ] **T009** [US1] Domínio `domain/category/{types,category}.ts` — `CategoryId` (branded), `CategoryGroup` union, `createCategory(...) → Result`.
- [ ] **T010** [US1] Port `application/ports/category-read.ts` (`CategoryReadPort.list()`) + adapters `repos/category-read.{in-memory,drizzle}.ts` (SELECT lean `active=true` ordenado; mapper row→Category com cast seguro do `group` pós-CHECK).
- [ ] **T011** [US1] HTTP: `categoryListResponseSchema` (schemas.ts) + `categoriesToDto` (dto.ts) + rota `GET /categories` (plugin.ts) + wiring no `composition.ts` (memory: in-memory semeado; mysql: drizzle).

**Checkpoint US1**: `GET /categories` agrupado e funcional, testável isolado.

---

## Phase 4: User Story 2 — Centro de custo (P1)

### W0 (RED)

- [ ] **T012** [P] [US2] `domain/cost-center/cost-center.test.ts` — smart constructor (code/name vazios → erro).
- [ ] **T013** [P] [US2] `cost-center-read.in-memory.test.ts` — `list()` só `active`, ordenado por `code`.
- [ ] **T014** [P] [US2] `cost-centers.http.test.ts` (smoke) — `GET /cost-centers` → 200 `[{id,code,name}]`; 403 sem permissão.

### W1 (GREEN)

- [ ] **T015** [US2] Domínio `domain/cost-center/{types,cost-center}.ts` (`CostCenterId`, `createCostCenter`).
- [ ] **T016** [US2] Port `cost-center-read.ts` + adapters `repos/cost-center-read.{in-memory,drizzle}.ts`.
- [ ] **T017** [US2] HTTP: schema + dto + rota `GET /cost-centers` + wiring.

**Checkpoint US2**: `GET /cost-centers` funcional, independente de US1.

---

## Phase 5: User Story 3 — Programa (P2, consumo cross-módulo)

> **Sub-decisão (research D2):** o `GET /financial/programs` é opcional — o front já lista via `programs` direto. Definir aqui se o endpoint entra agora ou vira follow-up; o `ProgramReadPort` interno pode ser necessário de qualquer forma.

### W0 (RED)

- [ ] **T018** [P] [US3] `program-read.in-memory.test.ts` — `list()` retorna `[{id,name}]` (stub seedado).

### W1 (GREEN)

- [ ] **T019** [US3] Port `application/ports/program-read.ts` (`ProgramReadPort.list()`) + adapter que **consome `programs/public-api`** (espelha o read-port #178). Pré-req: `programs/public-api` expor um `buildProgramsReadPort`/`listPrograms` consumível (criar lá se ausente — task adjacente no módulo `programs`).
- [ ] **T020** [US3] _(condicional)_ HTTP: rota `GET /financial/programs` (passthrough) — só se a decisão for expor agora; senão registrar follow-up.

---

## Phase 6: Polish & Gate (W2/W3)

- [ ] **T021** W2: code-review read-only (ADR-0006/0014 — reads não tocam `ctr_*`/`programs` cru; Princípio IX). REVIEW.md.
- [ ] **T022** W3: `pnpm run typecheck` + `format:check` + `lint` + `test` verdes; `pnpm run test:integration:financial` (Docker) para os read stores Drizzle reais. Reports W0–W3 + `pipeline:state close`.

---

## Dependências & ordem

- **Setup (T001) → Foundational (T002-T005) → US1 ∥ US2 (independentes) → US3 → Polish.**
- US1 e US2 são **independentemente testáveis/entregáveis** (cada uma um MVP slice: a lista respectiva funciona sozinha).
- **MVP mínimo** = Setup + Foundational + **US1** (Categoria agrupada) — já desbloqueia o select central.
- US3 depende de o `programs/public-api` expor a listagem (task adjacente no módulo programs).

## Paralelização

- T002 ∥ T003 (tabelas distintas, mesmo arquivo → cuidado: editam `mysql.ts`; tratar como sequenciais se conflitar).
- W0 de US1 (T006-T008) ∥ entre si; W0 de US2 (T012-T014) ∥; US1 ∥ US2 após Foundational.
