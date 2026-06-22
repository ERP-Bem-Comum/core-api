---
description: 'Task list — 022 contract:read na listagem de contratos (#202)'
---

# Tasks: Autorização na listagem de contratos (`contract:read`)

**Input**: Design documents from `/specs/022-contracts-list-authorize/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: **OBRIGATÓRIOS** — Princípio I (TDD W0→W3). W0 RED antes de tocar `src/`.

**Organização**: feature **S de 1 linha** servindo 2 stories (US1 barrar sem permissão; US2 preservar caminho feliz). Ordenada por **waves W0→W3** (precedência do Princípio I), com rótulos `[US1]`/`[US2]`. Ticket único: **`CTR-LIST-AUTHORIZE`**.

## Format: `[ID] [P?] [Story?] Description`

- **[P]** paralelizável · **[Story]** `[US1]` barrar sem `contract:read` · `[US2]` preservar acesso com a permissão

## Path Conventions

Repo existente. Produção em `src/modules/contracts/`, testes em `tests/modules/contracts/`.

---

## Phase 1: Setup (ticket)

- [ ] T001 Inicializar o ticket: `pnpm run pipeline:state init CTR-LIST-AUTHORIZE --size S` e escrever `.claude/.pipeline/CTR-LIST-AUTHORIZE/000-request.md` (escopo + CAs de spec.md FR-001..FR-006 e da matriz em contracts/contracts-list-authorization.md).

---

## Phase 2: User Story 1 — Usuário sem `contract:read` é barrado (Priority: P1) 🎯 MVP — W0 RED

**Goal**: a listagem nega acesso a quem não tem `contract:read`; sem token → 401.

**Independent Test**: usuário autenticado sem `contract:read` recebe 403 em `GET /contracts`; sem token recebe 401.

- [ ] T002 [US1] Criar `tests/modules/contracts/adapters/http/contracts-list-authorize.routes.test.ts` montando o `authorize` **REAL** via `buildAuthHttpDeps` (driver `memory` + seed RBAC) + o plugin de contracts (padrão de `tests/modules/contracts/adapters/http/contracts-export-csv.routes.test.ts`). Casos US1: usuário autenticado **sem** `contract:read` → **403** em `GET /api/v2/contracts`; sem `Authorization` → **401**. Deve FALHAR no 403 (hoje a rota só tem `requireAuth` → 200).

**Checkpoint**: caso negado coberto em RED.

---

## Phase 3: User Story 2 — Usuário com `contract:read` continua listando (Priority: P1) — W0 RED/guard

**Goal**: o caminho feliz não regride — quem tem a permissão recebe 200 com a mesma resposta.

**Independent Test**: usuário com `contract:read` recebe 200 e a listagem (formato inalterado).

- [ ] T003 [US2] Adicionar em `tests/modules/contracts/adapters/http/contracts-list-authorize.routes.test.ts` o caso positivo: usuário autenticado **com** `contract:read` → **200** em `GET /api/v2/contracts` (com e sem querystring de filtro). Verde antes e depois do fix (guard de não-regressão). _(mesmo arquivo do T002 → sequencial)_

**Checkpoint**: 200/403/401 cobertos com `authorize` real.

---

## Phase 4: Implementação — W1 GREEN (mínima, serve US1+US2)

- [ ] T004 [US1] Em `src/modules/contracts/adapters/http/plugin.ts` (rota `GET /contracts`, ~L180), trocar `preHandler: hooks.requireAuth` por `preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)]`, alinhando às rotas-irmãs (`/contracts/:id`, `/:id/history`, `/export.csv`). Satisfaz US1 (403) e mantém US2 (200).
- [ ] T005 Rodar o teste-alvo e confirmar GREEN: `pnpm test -- --test-name-pattern="contracts-list-authorize"`.

**Checkpoint**: W1 GREEN funcional.

---

## Phase 5: W2 — Code review read-only

- [ ] T006 Revisão read-only (skill `code-reviewer`, máx. 3 rounds): confere paridade com as rotas-irmãs, ADR-0006 (`authorize` via public-api do auth, sem novo acoplamento), nenhuma alteração de contrato de resposta, teste exercita `authorize` real (FR-006). Gravar `004-code-review/REVIEW.md`.

---

## Phase 6: W3 — Gate de qualidade & Polish

- [ ] T007 Validar `quickstart.md` (caminho de testes obrigatório).
- [ ] T008 Gate W3 (skill `ts-quality-checker`): `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` — todos verdes (Princípio II). Gravar `005-quality/REPORT.md`.
- [ ] T009 Fechar o ticket: `pnpm run pipeline:state` wave-finish das waves + `close CTR-LIST-AUTHORIZE`. PR referencia #202 (merge na `dev`, sem auto-close).

---

## Dependencies & Execution Order

### Wave order (Princípio I)

- **Setup (P1)** → **W0 RED (P2→P3)**: ambos os casos escritos e o 403 FALHANDO antes de tocar `src/` → **W1 (P4)**: 1 preHandler torna verde → **W2 (P5)** → **W3 (P6)** fecha.

### Story Dependencies

- **US1 (P1)** e **US2 (P1)** compartilham a MESMA mudança (T004). US2 não tem impl própria — o mesmo preHandler preserva o 200 (a `authorize` real já reconhece `contract:read`).

### Within waves

- T002 antes de T003 (mesmo arquivo → sequencial). T004 depois de T002–T003 (W0 antes de W1).

### Parallel Opportunities

- Mínima — feature S de 1 linha, casos no mesmo arquivo de teste.

---

## Implementation Strategy

### MVP (US1)

1. T001 ticket.
2. T002–T003: W0 RED (403 sem permissão FALHA; 401/200 guards).
3. T004: W1 — adicionar o `authorize` → GREEN.
4. **STOP & VALIDATE**: US1 (403 sem permissão) e US2 (200 com) verificáveis.

### Entrega

Feature indivisível (1 linha). W2 + W3 fecham. PR referencia #202 (achado de segurança), merge na `dev`.

---

## Notes

- Princípio I tem precedência sobre o agrupamento por story (feature S) — daí a ordenação por waves.
- Ponto crítico (FR-006/SC-004): teste com `authorize` real + caso **negado** (a cobertura atual da listagem só exercita o caminho feliz, por isso não pegou o gap).
- **≠ #200**: `contract:read` já está no catálogo; o RED vem do guard ausente na rota, não de gap de catálogo.
- Commit PT-BR: `fix(contracts): exige contract:read na listagem GET /contracts (#202)`.
