---
description: 'Task list — Financial Supplier Read-Model (US2 da #47)'
---

# Tasks: Financial Supplier Read-Model

**Input**: Design documents from `/specs/014-financial-supplier-readmodel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md

**Tests**: INCLUÍDOS — TDD fail-first W0→W3 (constituição §I).

**Organização**: por fase e user story. Cada ticket abre pipeline próprio (`pnpm run pipeline:state init <ticket> --size <S|M>`), percorre W0→W3 e fecha verde.

> **Pré-requisito externo (decisão 2026-06-16 — ver `.claude/.planning/ASYNC-MESSAGING-STRATEGY.md`):** o ticket `CORE-OUTBOX-WORKER-GENERIC` (extrair `src/shared/outbox/` e migrar contracts/partners) é feito **ANTES** desta feature, em branch própria a partir de `dev`. O ticket `WORKER-SUPPLIER-PROJECTION` (T019–T022) **constrói sobre** `src/shared/outbox/` — não copia mais um worker. A 014 rebaseia em `dev` depois do genérico mergeado.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 ADR da topologia de consumo cross-módulo (read-model por eventos, worker em composition root, idempotência por guard `occurred_at`). Ticket `ADR-0045-CROSS-MODULE-READ-MODEL` (S): escrever `handbook/architecture/adr/0045-financial-supplier-read-model.md` + entrada em `handbook/CHANGELOG.md` + linha no índice `handbook/architecture/adr/README.md`. Citação canônica (Newman — content coupling / event-driven) já em `research.md`.
- [ ] T002 Baseline: confirmar gate verde na branch (`pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`) e capturar contagem de testes.

**Checkpoint**: topologia documentada; baseline verde.

---

## Phase 2: Foundational (bloqueia US1 e US2)

### Ticket `FIN-SUPPLIER-VIEW-SCHEMA` (M) — read-model + store

**W0 RED** ⚠️

- [ ] T003 [P] Em `tests/modules/financial/adapters/persistence/repos/supplier-view-store.suite.ts` (suíte reutilizável) + `*.in-memory.test.ts`: `upsert` cria linha; `upsert` com `occurredAt` mais novo atualiza; `upsert` com `occurredAt` mais antigo **não** regride; `get` por `supplierRef` retorna `null` quando ausente.
- [ ] T004 [P] Em `tests/modules/financial/adapters/persistence/supplier-view-store.drizzle-mysql.test.ts` (integração, atrás de `MYSQL_INTEGRATION`): mesmo contrato no MySQL real (ON DUPLICATE KEY UPDATE + guard).

**W1**

- [ ] T005 `src/modules/financial/domain/supplier-view/types.ts`: `SupplierView = Readonly<{ supplierRef; name; document; occurredAt: Date }>`.
- [ ] T006 `src/modules/financial/application/ports/supplier-view-store.ts`: port `SupplierViewStore` (`upsert`, `get`) + erro `'supplier-view-store-unavailable'`.
- [ ] T007 `src/modules/financial/adapters/persistence/schemas/mysql.ts`: tabela `finSupplierView` (PK `supplier_ref`, `name`, `document` varchar, `occurred_at`, `updated_at`); rodar `pnpm run db:generate:financial` e versionar a migration.
- [ ] T008 [P] `src/modules/financial/adapters/persistence/repos/supplier-view-store.drizzle.ts`: upsert via `INSERT ... ON DUPLICATE KEY UPDATE` com guard `occurred_at` (técnica `IF(VALUES(occurred_at) >= occurred_at, ...)`); `get`.
- [ ] T009 [P] `src/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.ts`: `Map` + guard de recência (espelha o contrato).
- [ ] T010 W2 review (drizzle-orm-expert — correção do upsert/guard) + W3 gate + `pnpm run test:integration:financial`.

### Ticket `PAR-PUBLIC-API-CONSUMER-SURFACE` (S) — superfície de consumo no partners

**W0 RED** ⚠️

- [ ] T011 [P] Em `tests/modules/partners/public-api/consumer-surface.test.ts`: a public-api do `partners` exporta o necessário para um consumer externo (tipos `ProcessedEvent`/`EventDelivery`, `runLoop`/ops do outbox, abertura de pool) e um `listSuppliers()` read-only (`{ supplierRef, name, document }`).

**W1**

- [ ] T012 `src/modules/partners/public-api/index.ts`: re-exportar (barrel) o contrato de consumo do outbox (sem vazar `domain/`/`application/` internos além do necessário) e expor `listSuppliers` (read port) para o backfill.
- [ ] T013 W2 review (modular-monolith — superfície mínima, ADR-0006) + W3 gate.

**Checkpoint**: read-model store pronto; partners expõe a superfície de consumo.

---

## Phase 3: User Story 1 - Read-model mantido por eventos (Priority: P1) 🎯 MVP

**Goal**: o `financial` aplica `SupplierRegistered`/`SupplierEdited` do `par_outbox` na cópia local, idempotente e resistente a fora-de-ordem. **Independent Test**: publicar eventos → `fin_supplier_view` reflete o último snapshot; reentrega não duplica; evento antigo não regride.

### Ticket `FIN-SUPPLIER-VIEW-APPLY` (M) — aplicação do evento

**W0 RED** ⚠️

- [ ] T014 [P] [US1] Em `tests/modules/financial/domain/supplier-view/apply.test.ts`: `applySupplierEventToView(current, incoming)` — null→grava; mais novo→grava; mais antigo→mantém.
- [ ] T015 [P] [US1] Em `tests/modules/financial/application/apply-supplier-event.test.ts`: `applySupplierEvent` parseia payload `{supplierRef,name,document,occurredAt}`; filtra `eventType` (Registered/Edited aplica; outros → ok/skip); payload malformado → erro; idempotência via store in-memory.

**W1**

- [ ] T016 [US1] `src/modules/financial/domain/supplier-view/apply.ts`: regra pura `applySupplierEventToView` (guard por `occurredAt`).
- [ ] T017 [US1] `src/modules/financial/application/use-cases/apply-supplier-event.ts` (+ export na `public-api/index.ts`): `applySupplierEvent(deps)({ eventId, eventType, payload, occurredAt })` → parse + filtro + `store.upsert`; mapeia falha para erro de delivery.
- [ ] T018 [US1] W2 review (clean-code/ts — parse seguro do payload, exhaustive no filtro) + W3 gate.

### Ticket `WORKER-SUPPLIER-PROJECTION` (M) — composition root

**W0 RED** ⚠️

- [ ] T019 [P] [US1] Em `tests/workers/supplier-view-projection/delivery.test.ts`: o `EventDelivery` do worker (consumer `financial-supplier-view`) entrega um `ProcessedEvent` ao `applySupplierEvent` e converte resultado em `Result<void, DeliveryError>` (ok no happy path; `DeliveryUnavailable` em falha do store).

**W1**

- [ ] T020 [US1] `src/workers/supplier-view-projection/delivery.ts`: adapter `EventDelivery` (composition root) que cola `ProcessedEvent` (partners) → `applySupplierEvent` (financial).
- [ ] T021 [US1] `src/workers/supplier-view-projection/run.ts`: entrypoint — abre pool partners (outbox) + pool financial (store), monta `runLoop` com o delivery acima, graceful shutdown (SIGTERM/SIGINT). Script `worker:supplier-projection` em `package.json`.
- [ ] T022 [US1] W2 review (nodejs-runtime-expert — 2 pools, shutdown, AbortSignal) + W3 gate.

**Checkpoint**: cadastrar/editar fornecedor no `partners` → reflete em `fin_supplier_view` (consistência eventual). US1 testável isolada.

---

## Phase 4: User Story 2 - Fornecedor (nome+CNPJ) no grid (Priority: P2)

**Goal**: o item de `GET /api/v2/financial/documents` traz `supplierName`/`supplierDocument` lidos da cópia local. **Independent Test**: com `fin_supplier_view` populado, listar e ver os 2 campos; `supplierRef` nulo/ausente → `null`.

### Ticket `FIN-SUPPLIER-VIEW-LIST-DTO` (M)

**W0 RED** ⚠️

- [ ] T023 [P] [US2] Em `tests/modules/financial/adapters/http/list-documents.http.test.ts`: cada item traz `supplierName`/`supplierDocument` quando o `supplierRef` está no read-model; `null` quando ausente/nulo; campos pré-existentes inalterados.
- [ ] T024 [P] [US2] Em `tests/modules/financial/adapters/persistence/document-repository.suite.ts` (+ integração): `findPaged` retorna `supplierName`/`supplierDocument` via LEFT JOIN `fin_supplier_view`.

**W1**

- [ ] T025 [US2] `src/modules/financial/domain/document/query.ts`: `DocumentListItem` += `supplierName: string | null`, `supplierDocument: string | null`.
- [ ] T026 [US2] `src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts` (`findPaged`): LEFT JOIN `fin_supplier_view` em `supplier_ref`; mapear no read-model inline.
- [ ] T027 [P] [US2] `src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts`: espelhar resolução por um mapa de supplier-view no fake.
- [ ] T028 [US2] `src/modules/financial/adapters/http/dto.ts` (`listItemToSummaryDto`) + `schemas.ts` (`documentSummarySchema`): + `supplierName`/`supplierDocument` (`z.string().nullable()`).
- [ ] T029 [US2] W2 review (zod-expert — nullable/contract-first; clean-code) + W3 gate + `pnpm run test:integration:financial`.

**Checkpoint**: grid resolve fornecedor pela cópia local, sem chamada cross-módulo (SC-001/002).

---

## Phase 5: Polish & Cross-Cutting

### Ticket `FIN-SUPPLIER-VIEW-BACKFILL` (M) — fornecedores legados

**W0 RED** ⚠️

- [ ] T030 [P] Em `tests/jobs/financial/supplier-view-backfill.test.ts`: dado N fornecedores no `partners` (fake `listSuppliers`) e read-model vazio → após backfill, N linhas; re-rodar → sem duplicar; não sobrescreve linha mais nova de evento real (guard).

**W1**

- [ ] T031 `src/jobs/financial/supplier-view-backfill/run.ts`: job one-shot (ADR-0041) — `listSuppliers` (partners public-api) → `applySupplierEvent`/store (financial). Script `job:financial:supplier-view-backfill` em `package.json`.
- [ ] T032 W2 review (nodejs-runtime-expert — one-shot, exit codes; idempotência) + W3 gate.

### Fechamento

- [ ] T033 Atualizar issue #47 (US2 entregue) referenciando a feature 014; `quickstart.md` validado; `pnpm run test:integration:financial` + `:partners` verdes.
- [ ] T034 Fechar todos os tickets (`pnpm run pipeline:state close <ticket>`); confirmar testes ≥ baseline (T002).

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T013)** → **US1 (T014–T022)** → **US2 (T023–T029)** → **Polish (T030–T034)**.
- `FIN-SUPPLIER-VIEW-SCHEMA` bloqueia APPLY, LIST-DTO e BACKFILL (todos usam o store/tabela).
- `PAR-PUBLIC-API-CONSUMER-SURFACE` bloqueia WORKER (consumo do outbox) e BACKFILL (`listSuppliers`).
- `FIN-SUPPLIER-VIEW-APPLY` bloqueia WORKER e BACKFILL (ambos chamam `applySupplierEvent`).
- `FIN-SUPPLIER-VIEW-LIST-DTO` depende só do SCHEMA (lê a tabela) — **independe** do consumer estar rodando (pode ser testado com read-model semeado).

## Parallel Opportunities

- T003/T004 (W0 store) em paralelo; T008/T009 (drizzle vs in-memory) em paralelo.
- LIST-DTO (US2) pode andar em paralelo com WORKER (US1) após o SCHEMA+APPLY, pois tocam arquivos distintos (listagem vs worker).
- T014/T015 (W0 apply) em paralelo; T027 (in-memory) ‖ T026 (drizzle).

## Implementation Strategy

**MVP**: Setup + Foundational + **US1** (read-model vivo por eventos) — entrega a cópia local correta e auditável. **US2** (grid) entrega o valor visível. **Backfill** completa a cobertura de fornecedores legados. Cada ticket fecha W0→W3 verde antes do próximo dependente.

## Notes

- TDD RED obrigatório (§I). Sem `npm` (ADR-0012). Campos pré-existentes do item byte-idênticos (FR-008). `document` alfanumérico (ADR-0044). Isolamento: nenhum módulo importa o outro — ligação só no composition root (ADR-0006/0014).
