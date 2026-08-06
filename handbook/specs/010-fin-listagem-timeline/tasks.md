# Tasks: Financeiro — Fatia 2: Listagem + Trilha por-campo (Time Travel)

**Feature**: `specs/010-fin-listagem-timeline/` · **Branch**: `feat/fin-listagem-timeline` · Pipeline core-api W0→W3.

> Estende o módulo `financial` (fatia 1, em `dev`) — **não reescreve**. Tarefas dependency-ordered; `[P]` = paralelizável
> (arquivos distintos, sem dependência pendente); tag `W0` = teste RED antes de `src/`, `W1` = implementação até GREEN.

## Format: `[ID] [P?] [Story] Descrição com caminho`

---

## Phase 1: Setup

- [ ] T001 Abrir ticket: `pnpm run pipeline:state init FIN-LISTAGEM-TIMELINE --size M` e preencher `.claude/.pipeline/FIN-LISTAGEM-TIMELINE/000-request.md` (escopo + CAs dos CT-001..021)

---

## Phase 2: Foundational (pré-requisitos bloqueantes — US1 e US2 dependem)

- [ ] T002 [P] W0 Testes RED da projeção/diff em `tests/modules/financial/domain/timeline/projection.test.ts` (`diffDocument` campos vitais; `projectEntry` 1 entry/Document + 1/Payable alterado — CT-010/CT-011)
- [ ] T003 [P] W1 `src/modules/financial/domain/timeline/types.ts` (`FieldChange`, `TimelineTarget`, `FinancialTimelineEntry`)
- [ ] T004 W1 `src/modules/financial/domain/timeline/projection.ts` (`diffDocument`, `projectEntry` — funções puras; serialização Money→cents, Date→ISO, status→literal)
- [ ] T005 [P] W1 `src/modules/financial/domain/timeline/repository.ts` (port `FinancialTimelineRepository`: `append`, `findByDocument`)
- [ ] T006 [P] W1 `src/modules/financial/domain/document/query.ts` (`DocumentListFilter`, `Page<T>`) + estender port `document/repository.ts` com `findPaged`
- [ ] T007 W1 Schema Drizzle: append `fin_document_timeline` + `fin_timeline_field_changes` em `src/modules/financial/adapters/persistence/schemas/mysql.ts` (CHECK target_kind/event_type, índices `idx_fin_tl_doc_time`/`idx_fin_tlfc_entry`, FK ON DELETE CASCADE — data-model.md)
- [ ] T008 W1 `pnpm run db:generate` → nova migration `fin_*` em `adapters/persistence/migrations/mysql/`; conferir CHARSET/COLLATE/FK no SQL (sem tocar tabelas da fatia 1)
- [ ] T009 [P] W1 Mappers da trilha em `adapters/persistence/mappers/timeline.mapper.ts` (row↔`FinancialTimelineEntry`/`FieldChange`, retornam `Result`)
- [ ] T010 W1 Repo da trilha: `adapters/persistence/repos/timeline-repository.{drizzle,in-memory}.ts` — `append` recebe a `tx` em curso (mesma transação do agregado — ADR-0001/R3)
- [ ] T011 W1 Contract suite `tests/modules/financial/adapters/persistence/timeline-repository.suite.ts` (append + findByDocument) consumida por in-memory (unit) e drizzle (integração, gated)

---

## Phase 3: US1 — Listagem de documentos com filtros e paginação (P1) 🎯 MVP

**Meta**: substituir o stub de `GET /documents` por listagem real. **Teste independente**: criar N docs variados → listar com cada filtro/página → conjunto e `total` corretos.

- [ ] T012 [P] [US1] W0 Testes RED de `findPaged` (filtros AND, janela inclusiva, paginação, total) em `tests/modules/financial/adapters/persistence/document-repository.suite.ts` (estende a suite existente; roda in-memory + drizzle)
- [ ] T013 [US1] W0 Testes RED da borda `GET /documents` em `tests/modules/financial/adapters/http/list-documents.http.test.ts` via `fastify.inject` (CT-001..008: filtros, paginação, vazio, janela invertida, 400 ref inválida, 403)
- [ ] T014 [US1] W1 Implementar `findPaged` no `adapters/persistence/repos/document-repository.drizzle.ts` (WHERE composto + LIMIT/OFFSET + COUNT; **reusa pool writer** — ADR-0003) e no `.in-memory.ts`
- [ ] T015 [US1] W1 Wire `listDocuments` real no `adapters/http/composition.ts` (substitui placeholder `findById`) + handler `GET /documents` no `plugin.ts` projetando via `documentToSummaryDto` (já existe)

---

## Phase 4: US2 — Trilha por-campo (Time Travel) (P2)

**Meta**: registrar a trilha automaticamente em cada mutação (mesma tx) e expô-la. **Teste independente**: criar→ajustar→aprovar→undo → `GET /timeline` reflete cada marco com `changes`.

- [ ] T016 [US2] W0 Testes RED de instrumentação na mesma tx em `tests/modules/financial/application/use-cases/timeline-recording.test.ts` (cada mutação grava entry+changes; rollback → nada — CT-009/CT-013)
- [ ] T017 [US2] W0 Testes RED da borda `GET /documents/:id/timeline` em `tests/modules/financial/adapters/http/timeline.http.test.ts` (cronologia + changes, 404, 403 — CT-014/CT-015/CT-016)
- [ ] T018 [US2] W0 Testes RED do boundary no cancelamento (CASCADE remove trilha) em `tests/modules/financial/adapters/persistence/timeline-repository.suite.ts` (CT-017, integração)
- [ ] T019 [US2] W1 Instrumentar os 7 use cases mutantes (`save-document`, `save-draft`, `adjust-document`, `approve-document`, `undo-approval`, `cancel-document`, `submit-draft`) em `src/modules/financial/application/use-cases/` — computar `before`/`after`, `projectEntry`, `append` na mesma transação do save
- [ ] T020 [US2] W1 `get-document-timeline.ts` use case + rota `GET /api/v2/financial/documents/:id/timeline` (perm `fiscal-document:read`) + DTO/schema da trilha em `adapters/http/{dto,schemas,plugin}.ts`

---

## Phase 5: Cross-cutting — Optimistic lock + RBAC

- [ ] T021 W0 Testes RED de optimistic lock em `tests/modules/financial/application/use-cases/optimistic-lock.test.ts` + borda `409` (CT-018..021): versão stale → `document-version-conflict`
- [ ] T022 W1 Adicionar `expectedVersion` a `ApproveDocumentCommand`/`AdjustDocumentCommand`/`UndoApprovalCommand` e propagar; repo `document-repository.drizzle.ts` faz `UPDATE ... WHERE id=? AND version=?` → `document-version-conflict` em `affectedRows=0` (ADR-0002)
- [ ] T023 W1 Mapear `document-version-conflict` → `409` no `adapters/http/plugin.ts` (`CONFLICT_CODES`) + propagar `body.version` nos handlers PATCH/approve/undo
- [ ] T024 [P] W0+W1 Remover `payable:read`/`payable:undo-approval` de `src/modules/auth/domain/authorization/permission-catalog.ts` + ajustar `tests/modules/auth/domain/authorization/permission-catalog.test.ts`; remover de `src/modules/financial/public-api/permissions.ts` (ADR-0004); verificar que nenhum seed/role referencia as removidas

---

## Phase 6: Polish & Gate (W2/W3)

- [ ] T025 [P] Coleção Bruno `bruno/financial/` para lista (filtros/paginação), timeline e 409 (ADR-0034) — `bru run --reporter junit`
- [ ] T026 Adicionar testes de integração novos ao script `test:integration:financial` no `package.json` (timeline drizzle + findPaged)
- [ ] T027 W2 Revisão read-only (`code-reviewer` + `security-backend-expert`) → `004-code-review/REVIEW.md`
- [ ] T028 W3 Gate final: `pnpm run typecheck` + `format:check` + `lint` + `pnpm test` + `pnpm run test:integration:financial` verdes → `005-quality/REPORT.md`

---

## Dependências & ordem

- **Setup (T001)** → **Foundational (T002–T011)** bloqueia tudo.
- **US1 (T012–T015)** depende de T006 (findPaged port) + T014 (repo). É o **MVP** — entregável e testável sozinho.
- **US2 (T016–T020)** depende de T003–T005, T009–T011 (domínio/repo da trilha). Independente de US1.
- **Cross-cutting (T021–T024)**: optimistic lock toca o repo (após T014) e a borda; RBAC (T024) é independente `[P]`.
- **Polish (T025–T028)** por último.

## Execução paralela (exemplos)

- Foundational: T002, T003, T005, T006 em paralelo (arquivos distintos); T004 depois de T003; T007→T008→T009→T010 em série (schema→migration→mapper→repo).
- Após Foundational: US1 (T012–T015) e US2 (T016–T020) podem correr em paralelo por devs distintos; T024 (RBAC) em paralelo a ambas.

## Estratégia de implementação

**MVP = US1** (listagem real) — destrava o frontend imediatamente. Depois US2 (auditoria) + cross-cutting (lock/RBAC),
fechando com Polish/Gate. Mantém a fatia 1 (em `dev`) intacta — só adição.
