---
description: 'Task list — 023 CONCILIADO no grid de Contas a Pagar (#204)'
---

# Tasks: CONCILIADO reflete no grid de Contas a Pagar

**Input**: Design documents from `/specs/023-fin-reconciled-grid/`

**Prerequisites**: plan.md ✅, spec.md ✅ (+ Clarifications), research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: **OBRIGATÓRIOS** — Princípio I (TDD W0→W3). W0 RED antes de tocar `src/`.

**Organização**: M, 2 stories. Mecanismo (clarify): **indicador derivado em tempo de leitura** sobre `fin_payables` (sem escrita em `fin_documents`). A derivação serve US1 (reflexo/undo) e US2 (filtro). Ordenada por **waves W0→W3** com rótulos `[US1]`/`[US2]`. Ticket: **`FIN-RECON-GRID-INDICATOR`**.

## Format: `[ID] [P?] [Story?] Description`

- **[P]** paralelizável · **[US1]** grid reflete Conciliado + undo reverte · **[US2]** filtro Pago/Conciliado

## Path Conventions

Produção em `src/modules/financial/`, testes em `tests/modules/financial/` (não co-locados; read store tem adapter in-memory + drizzle de integração).

---

## Phase 1: Setup (ticket)

- [ ] T001 Inicializar o ticket: `pnpm run pipeline:state init FIN-RECON-GRID-INDICATOR --size M` e escrever `.claude/.pipeline/FIN-RECON-GRID-INDICATOR/000-request.md` (escopo + CAs de spec.md FR-001..FR-007 e da matriz em contracts/grid-reconciled-indicator.md).

---

## Phase 2: User Story 1 — Grid reflete CONCILIADO + undo reverte (Priority: P1) 🎯 MVP — W0 RED

**Goal**: documento Pago com TODOS os títulos conciliados aparece como Conciliado no grid; undo reverte; parcial permanece Pago.

**Independent Test**: conciliar todos os títulos de um documento pago → `GET /documents` reflete Conciliado; desfazer → volta a Pago.

- [ ] T002 [P] [US1] Read store (in-memory): em `tests/modules/financial/adapters/persistence/document-repository.in-memory.test.ts`, casos — documento `Paid` com todos os payables `Reconciled` → `list()` retorna `status='Reconciled'`; com payable parcial → `Paid`; sem payables → `Paid`. Deve FALHAR (derivação inexistente).
- [ ] T003 [P] [US1] Read store (drizzle-mysql, integração): em `tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts`, mesma derivação contra MySQL real (JOIN/subquery em `fin_payables`). Deve FALHAR. _(roda em `pnpm run test:integration`)_
- [ ] T004 [US1] HTTP (NOVO): `tests/modules/financial/adapters/http/grid-reconciled.http.test.ts` — fluxo real: criar documento+títulos, pagar, `POST /api/v2/financial/reconciliations` conciliando todos → `GET /api/v2/financial/documents` reflete `Conciliado`; `POST .../undo` (ou rota de desfazer) → `GET /documents` reverte para `Pago`; conciliação parcial → permanece `Pago`. Deve FALHAR.

**Checkpoint**: reflexo + undo + parcial cobertos em RED (read store + HTTP).

---

## Phase 3: User Story 2 — Filtrar por Pago e Conciliado (Priority: P2) — W0 RED

**Goal**: `GET /documents?status=Reconciled|Paid` retorna o conjunto derivado correto.

**Independent Test**: com documentos Pago e (derivado) Conciliado, filtrar por cada estado retorna só o conjunto pedido.

- [ ] T005 [P] [US2] Read store: em `document-repository.in-memory.test.ts` (e `.drizzle-mysql.test.ts`), filtro `status='Reconciled'` retorna só os derivados-reconciliados; `status='Paid'` exclui os totalmente reconciliados. Deve FALHAR (filtro não aceita Paid/Reconciled hoje).
- [ ] T006 [US2] HTTP: em `grid-reconciled.http.test.ts`, `GET /documents?status=Reconciled` e `?status=Paid` retornam o conjunto correto; valor fora do enum → 400. Deve FALHAR. _(mesmo arquivo do T004 → sequencial)_

**Checkpoint**: filtro derivado coberto em RED.

---

## Phase 4: Implementação — W1 GREEN (derivação read-time, serve US1+US2)

- [ ] T007 [US1] Estender o tipo do filtro em `src/modules/financial/domain/document/query.ts`: `DocumentListFilter.status` passa a aceitar `'Paid' | 'Reconciled'` além dos atuais (predicado/união pura, sem `throw`).
- [ ] T008 [US2] Estender o schema do filtro em `src/modules/financial/adapters/http/schemas.ts` (L159): `status` enum inclui `'Paid'` e `'Reconciled'`.
- [ ] T009 [US1] `document-repository.drizzle.ts` (`list()`, ~L408): adicionar derivação por documento via subquery/agregação em `fin_payables` (`total` × `reconciled`); `statusExibido = (status='Paid' && total>0 && total=reconciled) ? 'Reconciled' : status`; mapear o filtro `Reconciled`/`Paid` para a condição derivada (ADR-0020: JOIN/subquery/COUNT permitidos). Sem escrita em `fin_documents`.
- [ ] T010 [US1] `document-repository.in-memory.ts` (`list()`): paridade da mesma derivação + filtro sobre os payables in-memory.
- [ ] T011 [US1] `dto.ts` (list item): refletir o `status` derivado (`Reconciled`) no item da lista (sem novo campo obrigatório — preserva o contrato que o front consome).
- [ ] T012 Rodar os alvos GREEN: `pnpm test -- --test-name-pattern="document-repository|grid-reconciled"` e `pnpm run test:integration` (drizzle do read store).

**Checkpoint**: W1 GREEN funcional (derivação + filtro + reflexo no DTO).

---

## Phase 5: W2 — Code review read-only

- [ ] T013 Revisão read-only (skill `code-reviewer`, máx. 3 rounds): confere ADR-0022 (derivação read-time, sem escrita cross-agregado em `fin_documents`), ADR-0020 (features SQL permitidas), regra FR-004 (todos os payables), paridade drizzle↔in-memory, ausência de N+1 na listagem. Gravar `004-code-review/REVIEW.md`.

---

## Phase 6: W3 — Gate de qualidade & Polish

- [ ] T014 Validar `quickstart.md` (testes + integração).
- [ ] T015 Gate W3 (skill `ts-quality-checker`): `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` + `pnpm run test:integration` (derivação drizzle). Gravar `005-quality/REPORT.md`.
- [ ] T016 Fechar o ticket: `pnpm run pipeline:state` wave-finish + `close FIN-RECON-GRID-INDICATOR`. PR referencia #204 (merge `dev`, sem auto-close).

---

## Dependencies & Execution Order

### Wave order (Princípio I)

- **Setup (P1)** → **W0 RED (P2→P3)**: read store + HTTP RED antes de `src/` → **W1 (P4)**: derivação nos 2 adapters + DTO + schema → **W2 (P5)** → **W3 (P6)** fecha.

### Story Dependencies

- **US1 (P1)** e **US2 (P2)** compartilham a **derivação** (T009/T010). US2 acrescenta só o mapeamento do filtro (T008 + parte de T009/T010). US1 é o MVP (reflexo/undo); US2 complementa (filtro).

### Within waves

- T002/T003/T005 (read store) e T004 (HTTP novo) podem ser escritos em paralelo [P]; T006 sequencial após T004 (mesmo arquivo). T007–T011 (W1) após W0 RED; T009/T010 dependem de T007 (tipo do filtro).

### Parallel Opportunities

- W0: T002, T003, T004, T005 em arquivos distintos → [P]. W1: T009 (drizzle) e T010 (in-memory) em arquivos distintos → paralelizáveis após T007.

---

## Implementation Strategy

### MVP (US1)

1. T001 ticket.
2. P2–P3: W0 RED (read store + HTTP: reflexo/undo/parcial + filtro).
3. P4: W1 — derivação read-time (drizzle + in-memory) + DTO + schema → GREEN.
4. **STOP & VALIDATE**: US1 (grid reflete Conciliado, undo reverte) verificável; US2 (filtro) coberto pela mesma derivação.

### Entrega

Ticket único. W2 + W3 (com `test:integration` p/ o drizzle do read store) fecham. PR referencia #204 (épico #64), merge na `dev`.

---

## Notes

- Princípio I tem precedência sobre o agrupamento por story (M, mas derivação compartilhada) — daí a ordenação por waves.
- **Mecanismo (clarify/ADR-0022)**: derivação read-time, SEM escrita em `fin_documents`, SEM projeção/consumidor (evita #127). Undo reverte automaticamente.
- Regra FR-004: documento Reconciled sse `status='Paid'` E todos os títulos `Reconciled` (parcial → Paid).
- **Integração obrigatória**: a derivação drizzle (JOIN/subquery) exige `pnpm run test:integration` (MySQL real) no W3 — não basta o in-memory.
- Commit PT-BR: `feat(financial): grid reflete CONCILIADO por derivação de leitura (#204)`.
