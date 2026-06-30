---
description: 'Task list — Financeiro Fatia 1 (Gestão de Documentos + Geração de Títulos)'
---

# Tasks: Financeiro — Fatia 1: Gestão de Documentos + Geração de Títulos

**Input**: `specs/009-fin-documentos-titulos/` (plan.md, spec.md, domain.md, data-model.md, contracts/financial-http.md, bdd/\*.feature, adr/0001-0005)

**Tests**: OBRIGATÓRIOS — pipeline fail-first W0 RED → W1 GREEN (constituição I). Cada cenário BDD (CT-0xx) vira teste.

**Organização**: por user story (P1→P3). Ticket único: `FIN-DOCUMENTO-TITULOS` (size L). Worktree `feat/fin-module`.

## Format: `[ID] [P?] [Story] Descrição com caminho`

- **[P]**: paralelizável (arquivos distintos, sem dependência pendente)
- Wave: **W0** = teste RED · **W1** = implementação mínima até GREEN

---

## Phase 1: Setup (infraestrutura compartilhada)

- [ ] T001 Criar estrutura do módulo em `src/modules/financial/{domain,application,adapters,public-api}` + espelho `tests/modules/financial/`
- [ ] T002 Abrir ticket: `pnpm run pipeline:state init FIN-DOCUMENTO-TITULOS --size L` e preencher `.claude/.pipeline/FIN-DOCUMENTO-TITULOS/000-request.md` (escopo + CAs dos CT-0xx)
- [ ] T003 [P] Registrar permissões no catálogo RBAC em `src/modules/auth/domain/authorization/permission-catalog.ts`: `fiscal-document:read|write|cancel`, `payable:read|approve|undo-approval` (ADR-0004) + ajustar suíte do catálogo

---

## Phase 2: Foundational (pré-requisitos bloqueantes — todas as stories dependem)

**VOs (domínio puro — ts-domain-modeler):**

- [ ] T004 [P] W0 Testes RED dos refs em `tests/modules/financial/domain/shared/refs.test.ts` (UUID v4 valida/rejeita → `financial-ref-invalid`)
- [ ] T005 [P] W0 Testes RED de `DocumentId`/`PayableId` em `tests/modules/financial/domain/shared/ids.test.ts`
- [ ] T006 [P] W0 Testes RED de `Retention`/`RegisteredTax` em `tests/modules/financial/domain/shared/taxes.test.ts`
- [ ] T007 W0 Testes RED de `FinancialData.computeNetValue` em `tests/modules/financial/domain/document/net-value.test.ts` (fórmula R1; impostos registrados fora; rejeita `net-value-not-positive`)
- [ ] T008 [P] W1 Implementar `src/modules/financial/domain/shared/refs.ts` (Contract/BudgetPlan/Category/ProgramRef — reusar `SupplierRef` de partners)
- [ ] T009 [P] W1 Implementar `src/modules/financial/domain/shared/ids.ts`
- [ ] T010 [P] W1 Implementar `src/modules/financial/domain/shared/retention.ts` + `registered-tax.ts`
- [ ] T011 W1 Implementar `src/modules/financial/domain/document/financial-data.ts` (`computeNetValue`)

**Agregado base + read-model:**

- [ ] T012 W0 Testes RED da máquina de estados base em `tests/modules/financial/domain/document/document.test.ts` (Draft/Open/Approved; transições inválidas → `invalid-state-transition`)
- [ ] T013 W1 `src/modules/financial/domain/document/{types,errors,events}.ts` (DocumentCore + refinados; `DocumentStatus` 7 valores — ADR-0005)
- [ ] T014 W1 `src/modules/financial/domain/payable/{types,errors}.ts` (entidade interna Pai/Filho)
- [ ] T015 W1 `src/modules/financial/domain/timeline/types.ts` (`FinancialTimelineEntry`, `FieldChange` — read-model)

**Ports + persistência + borda base:**

- [ ] T016 [P] W1 `src/modules/financial/domain/document/repository.ts` (port) + `application/ports/{event-bus,clock}.ts`
- [ ] T017 W1 Schema Drizzle `fin_*` em `src/modules/financial/adapters/persistence/schemas/mysql.ts` (6 tabelas, CHECK, índices, FK ON DELETE CASCADE — data-model.md)
- [ ] T018 W1 `pnpm run db:generate` → migration inicial `fin_*` em `adapters/persistence/migrations/mysql/`; conferir CHARSET/COLLATE/FK no SQL gerado
- [ ] T019 W1 Mappers (reidratação via smart constructors) + repo `*.drizzle.ts` + `*.in-memory.ts` em `adapters/persistence/`
- [ ] T020 W1 Outbox adapter (`adapters/outbox/{outbox.drizzle,outbox.in-memory}.ts`) reusando padrão de `contracts`
- [ ] T021 W1 `src/modules/financial/public-api/{index,events,permissions,refs}.ts` (barrel — ADR-0006)
- [ ] T022 W1 Composição HTTP base `adapters/http/{composition,plugin}.ts` montando `/api/v1/financial`

**Checkpoint**: domínio compila, repos/outbox/borda prontos para as stories.

---

## Phase 3: US1 — Salvar documento não-fiscal → título pai (P1) 🎯 MVP

**Meta**: lançar um documento sem retenções e ver 1 título pai em `Aberto`. **Teste independente**: CT-001/CT-002/CT-007.

- [ ] T023 [P] [US1] W0 Testes RED de domínio `Document.create` não-fiscal em `tests/modules/financial/domain/document/document.test.ts` (CT-001, CT-002, CT-007)
- [ ] T024 [US1] W0 Testes RED do use case `saveDocument` + evento `DocumentSaved` em `tests/modules/financial/application/use-cases/save-document.test.ts`
- [ ] T025 [US1] W0 Testes RED da borda `POST /documents` (não-fiscal) via `fastify.inject` em `tests/modules/financial/adapters/http/save-document.http.test.ts`
- [ ] T026 [US1] W1 `Document.create` (não-fiscal, só pai) em `src/modules/financial/domain/document/document.ts`
- [ ] T027 [US1] W1 Use case `src/modules/financial/application/use-cases/save-document.ts` (grava doc+payable+timeline+outbox em transação)
- [ ] T028 [US1] W1 Rota `POST /api/v1/financial/documents` + schema Zod em `adapters/http/` (perm `fiscal-document:write`)

---

## Phase 4: US2 — Documento fiscal com retenções → pai + filhos (P1)

**Meta**: NFS-e/RPA geram pai + filhos; DANFE só pai; impostos registrados fora do líquido. **Teste**: CT-003..CT-006, CT-008, CT-009.

- [ ] T029 [US2] W0 Testes RED de geração de filhos por tipo em `tests/modules/financial/domain/document/children.test.ts` (CT-003..006, CT-008, CT-009, CT-010)
- [ ] T030 [US2] W1 Estender `Document.create` com geração de filhos (`Retention`→`Payable` Child) + validação tipo×retenção em `domain/document/document.ts`
- [ ] T031 [US2] W1 Estender `saveDocument` + rota para `retentions[]`/`registeredTaxes[]` (schema Zod)

---

## Phase 5: US3 — Aprovação com herança + separação de funções (P1)

**Meta**: aprovar move pai+filhos para `Aprovado`, trava campos vitais; Operador não aprova. **Teste**: CT-011..CT-015.

- [ ] T032 [US3] W0 Testes RED `Document.approve`/`editApproved` em `tests/modules/financial/domain/document/approve.test.ts` (herança, imutabilidade, transição inválida — CT-011..013, CT-015)
- [ ] T033 [US3] W0 Testes RED de autorização (Operador sem `payable:approve` → 403) em `tests/modules/financial/adapters/http/approve.http.test.ts` (CT-014)
- [ ] T034 [US3] W1 `Document.approve` + `editApproved` (só `description`/`dueDate`) em `domain/document/document.ts`
- [ ] T035 [US3] W1 Use case `approve-document.ts` + rota `POST /:id/approve` (perm `payable:approve`) + evento `PayableApproved`

---

## Phase 6: US4 — Ajuste em Aberto (P2)

**Meta**: ajustar em `Open` recalcula líquido/filhos; bloqueado pós-aprovação. **Teste**: CT-016, CT-017.

- [ ] T036 [US4] W0 Testes RED `Document.adjust` em `tests/modules/financial/domain/document/adjust.test.ts` (recalcula; bloqueio pós-aprovação)
- [ ] T037 [US4] W1 `Document.adjust` + use case `adjust-document.ts` + `PATCH /:id` (optimistic lock `version` — R5)

---

## Phase 7: US5 — Desfazer aprovação (P2)

**Meta**: `Approved`→`Open`; hard delete + recria filhos se valores mudaram; reaproveita se não. **Teste**: CT-018..CT-021.

- [ ] T038 [US5] W0 Testes RED `Document.undoApproval` em `tests/modules/financial/domain/document/undo-approval.test.ts` (CT-018, CT-019, CT-020)
- [ ] T039 [US5] W0 Testes RED edição granular de filho rejeitada (CT-021) no mesmo arquivo
- [ ] T040 [US5] W1 `Document.undoApproval` + use case `undo-approval.ts` + `POST /:id/undo-approval` + evento `ApprovalUndone`

---

## Phase 8: US6 — Cancelamento (P3)

**Meta**: cancelar só em `Open` (hard delete pai+filhos); bloqueado fora. **Teste**: CT-022, CT-023.

- [ ] T041 [US6] W0 Testes RED `Document.cancel` em `tests/modules/financial/domain/document/cancel.test.ts` (CT-022, CT-023)
- [ ] T042 [US6] W1 `Document.cancel` + use case `cancel-document.ts` + `DELETE /:id` (CASCADE) + evento `DocumentCancelled`

---

## Phase 9: US7 — Rascunho e submissão (P3)

**Meta**: salvar rascunho parcial; submeter → `Open` + títulos. **Teste**: CT-024..CT-026.

- [ ] T043 [US7] W0 Testes RED `saveDraft`/`submit` em `tests/modules/financial/domain/document/draft.test.ts` (CT-024..026)
- [ ] T044 [US7] W1 `Document.saveDraft`/`updateDraft`/`submit` + use cases + `asDraft` no `POST` + evento `DocumentDraftSaved`

---

## Phase 10: Polish & Cross-Cutting

- [ ] T045 [P] W0+W1 Read-model de timeline: popular `FieldChange` nos use cases + `GET /:id/timeline` em `tests/.../adapters/http/timeline.http.test.ts` + impl (SC-006, NFR-002)
- [ ] T046 [P] W1 `GET /documents` (lista paginada + filtros) e `GET /:id` (detalhe) em `adapters/http/`
- [ ] T047 [P] W1 Observabilidade: correlation id, contadores, outbox lag (metrics.md §Observabilidade)
- [ ] T048 [P] W1 Coleção Bruno `bruno/financial/` (E2E da borda — ADR-0034); `bru run --reporter junit` no CI
- [ ] T049 W2 Code review read-only (skill `code-reviewer`) → `.claude/.pipeline/FIN-DOCUMENTO-TITULOS/004-code-review/REVIEW.md` (máx 3 rounds)
- [ ] T050 W3 Gate de qualidade (skill `ts-quality-checker` / `/speckit-verify`): `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` + `pnpm run test:integration` — todos verdes

---

## Dependências & ordem

- **Setup (P1)** → **Foundational (P2)** bloqueiam tudo.
- **US1 (P3 fase)** é o MVP; **US2** estende `Document.create` (depende de US1/T026).
- **US3** depende do agregado (T013/T026); **US4/US5** dependem de US3 (estado `Approved`); **US6/US7** independentes entre si após Foundational.
- **Polish** por último (timeline/listagem/observabilidade/Bruno) e o **gate W3** fecha.

## Paralelismo (exemplos)

- Foundational: `T004 T005 T006` (VOs distintos) em paralelo; depois `T008 T009 T010` em paralelo.
- Polish: `T045 T046 T047 T048` em paralelo (arquivos distintos).
- Entre stories: W0 de uma story pode ser escrito enquanto a W1 da anterior é revisada.

## MVP

**US1** (Phase 3) sozinha entrega um MVP demonstrável: lançar um documento não-fiscal e ver o título pai nascer em `Aberto`. Incrementos: +US2 (filhos), +US3 (aprovação), +US4..US7, +Polish.

## Resumo

- **50 tarefas** · Setup 3 · Foundational 19 · US1 6 · US2 3 · US3 4 · US4 2 · US5 3 · US6 2 · US7 2 · Polish 6
- **Tests**: cada story tem W0 RED antes da W1 (pipeline fail-first).
