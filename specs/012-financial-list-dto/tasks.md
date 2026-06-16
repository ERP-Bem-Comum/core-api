---
description: 'Task list — Financial List DTO (US1; US2 bloqueada)'
---

# Tasks: Financial List DTO

**Input**: Design documents from `/specs/012-financial-list-dto/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md

**Tests**: INCLUÍDOS — TDD fail-first W0→W3 (constituição §I).

**Organização**: por user story. Apenas **US1** é executável; **US2** está bloqueada (ver nota no fim).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Abrir ticket `pnpm run pipeline:state init FIN-LIST-DTO-LOCAL --size S`; escrever `000-request.md` a partir de #47 (escopo US1). Capturar baseline `pnpm test`.

---

## Phase 2: Foundational

- [ ] T002 Confirmar gate W3 verde no baseline (`typecheck && format:check && lint && test`) na branch `012-financial-list-dto`.

**Checkpoint**: foundation pronta.

---

## Phase 3: User Story 1 - Colunas do documento no grid (Priority: P1) 🎯 MVP

**Goal**: o item de `GET /api/v2/financial/documents` traz `series`, `grossValueCents`, `paymentMethod`, `contractRef`. Ticket `FIN-LIST-DTO-LOCAL`.

**Independent Test**: listar e ver os 4 campos coerentes; documento sem série/contrato → `null`; campos pré-existentes inalterados.

### Tests for User Story 1 (W0 RED) ⚠️

- [ ] T003 [P] [US1] Em `tests/modules/financial/adapters/http/list-documents.http.test.ts`: cada item traz `series`, `grossValueCents`, `paymentMethod`, `contractRef`; documento sem série/contrato → `null` nesses campos; campos pré-existentes inalterados.
- [ ] T004 [P] [US1] Em `tests/modules/financial/adapters/persistence/document-repository.suite.ts` (+ integração `document-repository.drizzle-mysql.test.ts`): `findPaged` retorna os 4 campos no `DocumentListItem`.

### Implementation for User Story 1 (W1)

- [ ] T005 [US1] `src/modules/financial/domain/document/query.ts`: `DocumentListItem` ganha `series: string | null`, `grossValue: Money`, `paymentMethod: PaymentMethod`, `contractRef: string | null`.
- [ ] T006 [US1] `src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts` (`findPaged`): incluir `series`, `gross_value`, `payment_method`, `contract_ref` no SELECT e no mapper inline.
- [ ] T007 [P] [US1] `src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts`: espelhar os 4 campos no read-model do fake.
- [ ] T008 [US1] `src/modules/financial/adapters/http/dto.ts` (`listItemToSummaryDto`): mapear os 4 campos (`grossValue` → `moneyToCentsString`); `src/modules/financial/adapters/http/schemas.ts` (`documentSummarySchema`): + `series` (nullable), `grossValueCents` (centsString), `paymentMethod` (string), `contractRef` (nullable).
- [ ] T009 [US1] W2 review (clean-code/zod — completude do DTO; citação leve §IX) + W3 gate verde + `pnpm run test:integration:financial`.

**Checkpoint**: US1 funcional e testável isoladamente (MVP).

---

## Phase 4: User Story 2 - Fornecedor via read-model (Priority: P2) — 🚫 BLOQUEADA

**Não executável nesta feature.** O read-model de fornecedor depende de eventos do `partners` (`SupplierRegistered`/`SupplierUpdated`) publicados via outbox, que **não existem** (ver `research.md`). Pré-requisito:

- [ ] (issue separada) `partners`: infra de outbox (`partners_outbox` + worker) + publicar `SupplierRegistered` e criar/publicar `SupplierUpdated`.
- [ ] (issue separada) ADR de contrato de evento `partners` → `financial`.
- [ ] (issue separada) `financial`: tabela read-model `fin_supplier_view` (migration) + consumer dos eventos + leitura no `listItemToSummaryDto`.

Não gerar tasks executáveis aqui até o pré-requisito existir.

---

## Phase 5: Polish

- [ ] T010 [P] Atualizar #47 (entregue parcialmente — US1) e abrir issue do pré-requisito de US2 (outbox no `partners`), referenciando #47.
- [ ] T011 Rodar `quickstart.md` + `pnpm run test:integration:financial`; confirmar testes ≥ baseline; `pnpm run pipeline:state close FIN-LIST-DTO-LOCAL`.

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002) → US1 (T003–T009) → Polish (T010–T011).
- US1 é independente e não depende de US2. US2 está bloqueada por pré-requisito externo (módulo `partners`).
- Dentro de US1: W0 (T003/T004) falham antes de W1 (T005–T008); `query.ts` antes do adapter; W2/W3 fecham.

## Parallel Opportunities

- T003 e T004 (testes W0) em paralelo. T007 (in-memory) em paralelo com T006 (drizzle) — arquivos diferentes.

## Implementation Strategy

**MVP**: Setup + Foundational → US1 → validar isolado → demo. US1 entrega 4 das colunas hoje vazias do grid sem migration nem dependência. US2 aguarda o pré-requisito no `partners`.

## Notes

- TDD RED obrigatório (constituição §I). Sem `npm` (ADR-0012). Campos pré-existentes do item byte-idênticos (FR-009).
