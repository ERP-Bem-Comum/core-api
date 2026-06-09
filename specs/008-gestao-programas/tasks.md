---
description: 'Task list — Gestão de Programas (módulo programs)'
---

# Tasks: Gestão de Programas

**Input**: Design documents em `specs/008-gestao-programas/` (plan.md, spec.md, research.md, data-model.md, contracts/programs-http.md, quickstart.md)

**Tests**: **OBRIGATÓRIOS** — a constituição do core-api (Princípio I, TDD W0→W3 fail-first) exige testes RED antes de tocar `src/`. Cada user story escreve testes que **falham** antes da implementação.

**Organization**: tarefas agrupadas por user story (prioridades da spec). Borda em **`/api/v1`** (port legado, ADR-0033). Pipeline: ticket `PRG-PROGRAMS-MODULE` (size **L**).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1–US6 (mapeia spec.md); Setup/Foundational/Polish sem label

## Path Conventions

Módulo isolado em `src/modules/programs/`; testes em `tests/modules/programs/`. Espelha a anatomia de `src/modules/contracts/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: estrutura do módulo e ticket de pipeline.

- [ ] T001 Abrir ticket de pipeline: `pnpm run pipeline:state init PRG-PROGRAMS-MODULE --size L` e escrever `.claude/.pipeline/PRG-PROGRAMS-MODULE/000-request.md` (escopo + CAs derivados da spec)
- [ ] T002 Criar a árvore de pastas `src/modules/programs/{domain/{shared,program},application/{ports,use-cases},adapters/{http,persistence/{drivers,mappers,migrations/mysql,repos,schemas},storage},public-api}` e `tests/modules/programs/{domain/program,application/use-cases,adapters/{http,persistence}}`
- [ ] T003 [P] Criar `src/modules/programs/adapters/persistence/drivers/mysql-driver.ts` espelhando o de contracts, com `migrationsTable: '__drizzle_migrations_programs'`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase. Entrega o agregado base, persistência (com geração de `program_number` e optimistic-lock), permissões e o esqueleto HTTP.

- [ ] T004 [P] `src/modules/programs/domain/program/errors.ts` — union `ProgramError` (ver data-model.md)
- [ ] T005 [P] `src/modules/programs/domain/program/events.ts` — union `ProgramEvent` (`ProgramCreated|Updated|Deactivated|Reactivated`)
- [ ] T006 [P] `src/modules/programs/domain/shared/program-id.ts` — `Brand<string,'ProgramId'>` + `generate`/`rehydrate` (espelha `contract-id.ts`)
- [ ] T007 [P] Teste RED `tests/modules/programs/domain/program/sigla.test.ts` — normalização uppercase/trim, rejeição de espaço/caractere inválido, comprimento 2–20
- [ ] T008 `src/modules/programs/domain/program/sigla.ts` — VO `Sigla` até GREEN do T007
- [ ] T009 [P] Teste RED `tests/modules/programs/domain/program/status.test.ts` — transições válidas/ inválidas `ATIVO↔INATIVO`
- [ ] T010 `src/modules/programs/domain/program/status.ts` — VO `ProgramStatus` + guardas de transição (switch exaustivo `const _: never`)
- [ ] T011 [P] `src/modules/programs/domain/program/types.ts` — `Program = Readonly<{...}>` (inclui `programNumber`, `version`)
- [ ] T012 `src/modules/programs/domain/program/repository.ts` — port `ProgramRepository` + `ListProgramsQuery` + `ProgramPage` (type, não interface)
- [ ] T013 [P] `src/modules/programs/application/ports/outbox.ts` + `src/modules/programs/public-api/events.ts` — `ProgramsModuleEvent` + decoder versionado
- [ ] T014 `src/modules/programs/adapters/persistence/schemas/mysql.ts` — `prg_programs` (PK `varchar(36)`, `program_number bigint UNIQUE`, `sigla varchar UNIQUE`, `status varchar+CHECK`, `version int`, timestamps `datetime(3)`) + `prg_outbox` (espelha `ctr_outbox`)
- [ ] T015 Gerar migration: `pnpm run db:generate` e **editar o SQL** para `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` + `COLLATE utf8mb4_bin` na coluna `id`
- [ ] T016 [P] `src/modules/programs/adapters/persistence/mappers/program-mapper.ts` — row ↔ `Program`, retornando `Result<T,E>`
- [ ] T017 [P] Suite de contrato do repo (RED) `tests/modules/programs/adapters/persistence/program-repository.suite.ts` — `findById`, `findBySigla`, `listPaged`, `save` (geração de `program_number` crescente, UNIQUE sigla, optimistic-lock) **+ asserção de que `save` grava o evento `Program*` correspondente em `prg_outbox` na mesma transação** (C3/FR-025)
- [ ] T018 `src/modules/programs/adapters/persistence/repos/program-repository.in-memory.ts` + `tests/modules/programs/adapters/persistence/inmemory.test.ts` (roda a suite)
- [ ] T019 `src/modules/programs/adapters/persistence/repos/program-repository.drizzle.ts` + `outbox-repository.drizzle.ts` — `program_number` via `MAX+1` sob `SELECT … FOR UPDATE`, optimistic-lock (`UPDATE … WHERE version=?`), append outbox na mesma tx + `tests/modules/programs/adapters/persistence/drizzle-mysql.test.ts` (`.integration`)
- [ ] T020 [P] Permissões no catálogo global `src/modules/auth/domain/authorization/permission-catalog.ts` — adicionar `program:deactivate`, `program:read`, `program:write` (ordem alfabética) + `src/modules/programs/public-api/permissions.ts` (`PROGRAM_PERMISSION`)
- [ ] T021 [P] `src/modules/programs/adapters/http/schemas.ts` — Zod base (DTO de programa, `:id` param, meta de paginação harmonizada) + `program-dto.ts` (`Program → DTO`)
- [ ] T022 `src/modules/programs/adapters/http/composition.ts` (`buildProgramsHttpDeps`) + `plugin.ts` esqueleto (`programsRoutes`/`programsHttpPlugin`, sem rotas) + `public-api/http.ts` + registrar no server **sob prefixo explícito `/api/v1`** (`{ plugin, prefix: '/api/v1' }` — ADR-0033)

**Checkpoint**: agregado + persistência + permissões + borda vazia prontos. User stories podem começar.

---

## Phase 3: User Story 1 - Criar programa (Priority: P1) 🎯 MVP

**Goal**: cadastrar programa (nome + sigla obrigatórios; sigla única; nasce ATIVO com `program_number`).

**Independent Test**: `POST /api/v1/programs` com body válido → 201 + `Location`; sem nome/sigla → 422; sigla duplicada → 409.

### Tests (RED first) ⚠️

- [ ] T023 [P] [US1] Teste RED `tests/modules/programs/domain/program/program.test.ts` — `Program.create` (nome ≥2, sigla válida, status ATIVO, version 1; erros `program-name-required`/`program-sigla-invalid`)
- [ ] T024 [P] [US1] Teste RED `tests/modules/programs/application/use-cases/create-program.test.ts` — sigla duplicada → `program-sigla-duplicated`; `program_number` atribuído
- [ ] T025 [P] [US1] Teste RED `tests/modules/programs/adapters/http/programs-writes.routes.test.ts` — POST 201 + `Location` + **corpo com o programa**; 409 sigla; 422 campos obrigatórios; **401 (sem token) e 403 (sem `program:write`)** (driver `memory`, `fastify.inject`) — cobre C2/SC-006/FR-023/FR-024

### Implementation

- [ ] T026 [US1] `src/modules/programs/domain/program/program.ts` — `Program.create` (puro, `Result`)
- [ ] T027 [US1] `src/modules/programs/application/use-cases/create-program.ts` — checa `findBySigla` (normalizado) → delega `save` com evento `ProgramCreated`
- [ ] T028 [US1] Rota `POST /programs` em `src/modules/programs/adapters/http/plugin.ts` — `preHandler: [requireAuth, authorize(PROGRAM_PERMISSION.write)]`, body schema, header `Location: /api/v1/programs/:id`, mapa de erro (409/422) via `sendResult`

**Checkpoint**: criar programa funcional e testável.

---

## Phase 4: User Story 2 - Listar e buscar programas (Priority: P1)

**Goal**: lista paginada (5/10/25, default 5) + busca por nome/sigla (substring, case-insensitive) + estado vazio.

**Independent Test**: `GET /api/v1/programs?search=epv&limit=5` → só os que casam; sem programas → `items: []`.

### Tests (RED first) ⚠️

- [ ] T029 [P] [US2] Teste RED `tests/modules/programs/adapters/http/programs-list.routes.test.ts` — paginação (5/10/25), `search` case-insensitive por substring em name/sigla, filtro `status`, lista vazia, `meta` correta
- [ ] T030 [P] [US2] Estender a suite de persistência (T017) com casos de `listPaged` (ordenação, página além do fim) em `tests/modules/programs/adapters/persistence/program-repository.suite.ts`

### Implementation

- [ ] T031 [US2] `src/modules/programs/application/use-cases/list-programs.ts`
- [ ] T032 [US2] Implementar `listPaged` nos repos (`*.in-memory.ts` + `*.drizzle.ts`) — `WHERE (name LIKE %?% OR sigla LIKE %?%)` case-insensitive, filtro status, `LIMIT/OFFSET`, `COUNT` para `meta`
- [ ] T033 [US2] Rota `GET /programs` em `plugin.ts` — `authorize(PROGRAM_PERMISSION.read)`, querystring schema (inclui `status`), response paginado — o filtro `status=ATIVO` cobre o que cabe a esta feature da **FR-020** (a não-seleção de inativos em fluxos operacionais é regra dos módulos consumidores)

**Checkpoint**: MVP completo (criar + listar).

---

## Phase 5: User Story 3 - Ver detalhes (Priority: P2)

**Goal**: consultar um programa por `id` com todos os campos; inexistente → 404.

**Independent Test**: `GET /api/v1/programs/:id` existente → 200 com campos; inexistente → 404.

### Tests (RED first) ⚠️

- [ ] T034 [P] [US3] Teste RED em `tests/modules/programs/adapters/http/programs-reads.routes.test.ts` — GET `:id` 200 (campos completos) e 404 `program-not-found`

### Implementation

- [ ] T035 [US3] `src/modules/programs/application/use-cases/get-program.ts`
- [ ] T036 [US3] Rota `GET /programs/:id` em `plugin.ts` — `authorize(PROGRAM_PERMISSION.read)`, param schema, 404

**Checkpoint**: detalhe funcional.

---

## Phase 6: User Story 4 - Editar programa (Priority: P2)

**Goal**: atualizar campos editáveis; sigla única; optimistic-lock por `version` (stale-write → 409).

**Independent Test**: `PUT /api/v1/programs/:id` com `version` atual → 200; com `version` obsoleta → 409 `program-version-conflict`; sigla de outro → 409.

### Tests (RED first) ⚠️

- [ ] T037 [P] [US4] Teste RED em `program.test.ts` — `Program.update` (revalida nome/sigla; incrementa version)
- [ ] T038 [P] [US4] Teste RED em `programs-writes.routes.test.ts` — PUT 200; 409 `program-version-conflict`; 409 sigla; 422 nome vazio

### Implementation

- [ ] T039 [US4] `Program.update` em `domain/program/program.ts`
- [ ] T040 [US4] `src/modules/programs/application/use-cases/update-program.ts` — compara `expectedVersion`
- [ ] T041 [US4] Optimistic-lock no `program-repository.drizzle.ts` — `UPDATE … SET version=version+1 WHERE id=? AND version=?`; 0 linhas → `program-version-conflict` (refletir no in-memory)
- [ ] T042 [US4] Rota `PUT /programs/:id` em `plugin.ts` — `authorize(PROGRAM_PERMISSION.write)`, body com `version`, **200 retorna o programa atualizado** (corpo, nunca vazio), erros 404/409 (`program-sigla-duplicated`/`program-version-conflict`)/422

**Checkpoint**: edição com concorrência protegida.

---

## Phase 7: User Story 5 - Desativar programa (Priority: P2)

**Goal**: `ATIVO → INATIVO` (soft); desativar já inativo → 409.

**Independent Test**: `POST /api/v1/programs/:id/deactivate` em ATIVO → 200 INATIVO; em INATIVO → 409 `program-not-active`.

### Tests (RED first) ⚠️

- [ ] T043 [P] [US5] Teste RED em `program.test.ts` — `Program.deactivate` (rejeita já INATIVO)
- [ ] T044 [P] [US5] Teste RED em `programs-writes.routes.test.ts` — POST `:id/deactivate` 200 e 409 `program-not-active`

### Implementation

- [ ] T045 [US5] `Program.deactivate` em `domain/program/program.ts` (evento `ProgramDeactivated`)
- [ ] T046 [US5] `src/modules/programs/application/use-cases/deactivate-program.ts`
- [ ] T047 [US5] Rota `POST /programs/:id/deactivate` — `authorize(PROGRAM_PERMISSION.deactivate)`, **sem `version`** (guarda de estado — F1), **200 retorna o programa atualizado** (corpo), erros 404 / 409 `program-not-active`

**Checkpoint**: desativação soft funcional.

---

## Phase 8: User Story 6 - Reativar programa (Priority: P3)

**Goal**: `INATIVO → ATIVO`; reativar já ativo → 409.

**Independent Test**: `POST /api/v1/programs/:id/reactivate` em INATIVO → 200 ATIVO; em ATIVO → 409 `program-not-inactive`.

### Tests (RED first) ⚠️

- [ ] T048 [P] [US6] Teste RED em `program.test.ts` — `Program.reactivate` (rejeita já ATIVO)
- [ ] T049 [P] [US6] Teste RED em `programs-writes.routes.test.ts` — POST `:id/reactivate` 200 e 409 `program-not-inactive`

### Implementation

- [ ] T050 [US6] `Program.reactivate` em `domain/program/program.ts` (evento `ProgramReactivated`)
- [ ] T051 [US6] `src/modules/programs/application/use-cases/reactivate-program.ts`
- [ ] T052 [US6] Rota `POST /programs/:id/reactivate` — `authorize(PROGRAM_PERMISSION.deactivate)`, **sem `version`** (guarda de estado — F1), **200 retorna o programa atualizado** (corpo), erros 404 / 409 `program-not-inactive`

**Checkpoint**: máquina de estados completa.

---

## Phase 9: Logo upload (Priority: P3 — sub-feature, separável)

**Goal**: upload de logo (imagem ≤ 5 MB) em object storage; programa referencia `logo_key`.

**Independent Test**: `POST /api/v1/programs/:id/logo` com PNG válido → 200 `logoKey`; > 5 MB → 413; tipo não-imagem → 415.

### Tests (RED first) ⚠️

- [ ] T053 [P] Teste RED `tests/modules/programs/adapters/http/programs-logo.routes.test.ts` — multipart 200; 413 (>5MB); 415 (tipo inválido) com `LogoStorage` in-memory

### Implementation

- [ ] T054 [P] `src/modules/programs/application/ports/logo-storage.ts` — port `LogoStorage`
- [ ] T055 [P] `src/modules/programs/adapters/storage/logo-storage.in-memory.ts`
- [ ] T056 `src/modules/programs/adapters/storage/logo-storage.s3.ts` — `@aws-sdk/client-s3` (ADR-0019)
- [ ] T057 Rota `POST /programs/:id/logo` em `plugin.ts` — multipart, validação formato/tamanho, grava `logo_key`, `authorize(PROGRAM_PERMISSION.write)`

**Checkpoint**: logo funcional (ou diferido explicitamente).

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T058 [P] Coleção Bruno (ADR-0034) em `<dir de coleções>/programs/` exercitando `/api/v1/programs` (criar→listar→detalhar→editar→desativar→reativar) — integração HTTP real
- [ ] T059 [P] Atualizar testes que validam o catálogo de permissões do `auth` para incluir `program:*` (regressão)
- [ ] T060 Rodar `specs/008-gestao-programas/quickstart.md` (validação manual dos curls)
- [ ] T061 Registrar no ticket as citações das decisões-chave (Princípio IX): Evans/Vernon (BC/agregado), Ramakrishnan (chaves), Beck (TDD) — `research.md` é a fonte
- [ ] T062 Gate W3: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` + `pnpm run test:integration` — TODO verde; fechar pipeline (`pnpm run pipeline:state close PRG-PROGRAMS-MODULE`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: sem dependências.
- **Foundational (2)**: depende do Setup — **bloqueia todas as user stories**.
- **User Stories (3–9)**: dependem da Foundational. US1/US2 (P1) primeiro; US3/US4/US5 (P2); US6 + Logo (P3).
- **Polish (10)**: depende das stories desejadas.

### User Story Dependencies

- **US1 Criar** e **US2 Listar** (P1): independentes entre si após Foundational (compartilham só o repo base). MVP = US1+US2.
- **US3 Detalhe** (P2): independente; usa `findById` (foundational).
- **US4 Editar** (P2): adiciona optimistic-lock ao repo (T041) — encapsulado, não quebra US1/US2.
- **US5 Desativar** / **US6 Reativar**: independentes; tocam só `program.ts` + nova rota.
- **Logo** (P3): isolada (port + storage + 1 rota); pode ser diferida sem afetar o resto.

### Within Each Story

- Testes RED **antes** da implementação (W0). Domínio → use case → rota. Story fecha verde antes da próxima.

### Parallel Opportunities

- Foundational: T004/T005/T006 (arquivos distintos) em paralelo; T007+T009 (testes de VO) em paralelo.
- Em cada story, os testes marcados [P] correm juntos; a implementação é sequencial (mesmo `plugin.ts`/`program.ts`).
- US3, US5, US6 e Logo podem ser desenvolvidas em paralelo por pessoas diferentes após a Foundational.

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1 Setup → 2. Phase 2 Foundational (CRÍTICO) → 3. US1 Criar → 4. US2 Listar → **validar e demo** (cadastro + listagem ponta-a-ponta via `/api/v1/programs`).

### Entrega incremental

Foundational → US1 → US2 (MVP) → US3 → US4 → US5 → US6 → Logo. Cada story fecha verde (gate parcial) antes da próxima; Polish ao final.

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- Borda sempre `/api/v1` (port legado — ADR-0033); `/api/v2` é reservado a módulos reformulados.
- Toda story respeita W0 RED → W1 GREEN → (W2 review) → W3 gate. Não pular waves.
- `program_number` (auto, MAX+1 FOR UPDATE) e optimistic-lock (`version`) são as divergências conscientes vs `contracts` — ver Complexity Tracking do plano.
- **Optimistic-lock só no `PUT`** (editar); desativar/reativar usam guarda de estado, sem `version` (análise F1).
- **Escritas retornam o recurso no corpo** (`POST` 201, `PUT`/`deactivate`/`reactivate` 200) — nunca 200 vazio; previne o bug "200 sem corpo" do BFF (handoff de Parceiros, `handbook/tickets/todo/README.md`).
- Commit em PT por escopo: `feat(programs): …`.
