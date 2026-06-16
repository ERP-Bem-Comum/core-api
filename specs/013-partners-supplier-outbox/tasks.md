---
description: 'Task list — Partners outbox de fornecedor (#92)'
---

# Tasks: Partners — outbox de eventos de fornecedor

**Input**: Design documents from `/specs/013-partners-supplier-outbox/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md

**Tests**: INCLUÍDOS — TDD fail-first W0→W3 (constituição §I).

**Organização**: por user story. US1 (infra de outbox) é fundação de US2 (eventos de fornecedor).

## Format: `[ID] [P?] [Story] Description`

Todo o trabalho em `src/modules/partners/`. Replica o `ctr_outbox` do `contracts` (prefixo `par_*`).

---

## Phase 1: Setup

- [ ] T001 Abrir tickets `pnpm run pipeline:state init PAR-OUTBOX-INFRA --size M` e `... PAR-SUPPLIER-EVENTS --size M`; escrever `000-request.md` de cada (escopo de #92). Capturar baseline `pnpm test`.

## Phase 2: Foundational

- [ ] T002 Confirmar gate W3 verde no baseline na branch `013-partners-supplier-outbox`.

**Checkpoint**: foundation pronta.

---

## Phase 3: User Story 1 - Infra de outbox no partners (Priority: P1) 🎯 MVP

**Goal**: `par_outbox` transacional + worker, espelhando `ctr_outbox`. Ticket `PAR-OUTBOX-INFRA`.

**Independent Test**: append na mesma tx (rollback some o evento); worker entrega pendentes, marca `processed_at` idempotente; `maxAttempts` → dead-letter.

### Tests for User Story 1 (W0 RED) ⚠️

- [ ] T003 [P] [US1] Contrato de outbox (InMemory) em `tests/modules/partners/adapters/persistence/outbox-repository.suite.ts`: `append` registra evento; `withPendingBatch` entrega pendentes; `markProcessed` idempotente; `maxAttempts` → dead-letter.
- [ ] T004 [P] [US1] Integração MySQL em `tests/modules/partners/adapters/persistence/outbox-repository.drizzle-mysql.test.ts`: append na tx é atômico (rollback → 0 rows); `FOR UPDATE SKIP LOCKED`; CHECK `aggregate_type IN ('Supplier')`.

### Implementation for User Story 1 (W1)

- [ ] T005 [US1] `src/modules/partners/adapters/persistence/schemas/mysql.ts`: + `par_outbox` (espelha `ctr_outbox`, CHECK `aggregate_type IN ('Supplier')`) + `par_outbox_dead_letter`; `pnpm run db:generate:partners` → versionar `migrations/mysql/0009_*.sql` (auditar; CHARSET/COLLATE manual se preciso).
- [ ] T006 [P] [US1] `src/modules/partners/application/ports/outbox.ts`: `OutboxPort.append` + `WorkerOutboxOps` + `OutboxRow` + erros (espelha `contracts/application/ports/outbox.ts`).
- [ ] T007 [US1] `src/modules/partners/adapters/persistence/repos/outbox-repository.{drizzle,in-memory}.ts` + `appendOutboxInTx` (copiar/adaptar de `contracts`; `schema.parOutbox`).
- [ ] T008 [US1] `src/modules/partners/worker/{outbox-worker,config,run}.ts` (copiar/adaptar; env `PARTNERS_DATABASE_URL`); `package.json`: + `"worker:outbox:partners"`.
- [ ] T009 [US1] W2 review (drizzle-orm-expert; citação ADR-0015/Vernon §IX) + W3 gate + `pnpm run test:integration:partners`.

**Checkpoint**: outbox funcional e testável isoladamente (MVP).

---

## Phase 4: User Story 2 - Eventos de fornecedor publicados (Priority: P2)

**Goal**: cadastro/edição de fornecedor publica `SupplierRegistered`/`SupplierEdited` com payload `{supplierRef,name,document,occurredAt}`. Ticket `PAR-SUPPLIER-EVENTS`.

**Independent Test**: cadastrar → 1 evento no outbox com snapshot; editar (qualquer campo) → 1 evento com snapshot pós-edição; rollback da escrita → nenhum evento.

### Tests for User Story 2 (W0 RED) ⚠️

- [ ] T010 [P] [US2] Em `tests/modules/partners/application/use-cases/supplier-outbox.test.ts` (+ integração): `registerSupplier` publica `SupplierRegistered` com `supplierRef`/`name`/`document`; `editSupplier` (qualquer edição) publica `SupplierEdited` com snapshot pós-op; falha de persistência → nenhum evento (atomicidade).

### Implementation for User Story 2 (W1)

- [ ] T011 [US2] `src/modules/partners/adapters/persistence/repos/supplier-repository.drizzle.ts`: `save(supplier, events)` abre `db.transaction` (persist + `appendOutboxInTx(tx, events, supplier)`).
- [ ] T012 [P] [US2] `src/modules/partners/adapters/persistence/mappers/outbox.mapper.ts`: `(event, supplier) → row` montando o payload de integração `{supplierRef, name, document: String(supplier.cnpj), occurredAt}` (Opção A — do agregado).
- [ ] T013 [US2] `src/modules/partners/application/use-cases/{register-supplier,edit-supplier}.ts`: passam `[event]` ao `repo.save`.
- [ ] T014 [P] [US2] `src/modules/partners/adapters/persistence/repos/supplier-repository.in-memory.ts`: `save(supplier, events)` espelha (acumula no outbox in-memory).
- [ ] T015 [US2] ADR do contrato de evento `partners → financial` (`handbook/architecture/adr/`) + registrar em `handbook/` (nomes + payload + garantias) — FR-007.
- [ ] T016 [US2] W2 review (citação §IX — evento integração vs domínio) + W3 gate + `pnpm run test:integration:partners`.

**Checkpoint**: cadastro/edição de fornecedor publica eventos consumíveis.

---

## Phase 5: Polish

- [ ] T017 [P] Comentar #92 (infra + eventos entregues) e atualizar #47 (US2 do financial destravável após merge desta feature).
- [ ] T018 Rodar `quickstart.md` + `pnpm run test:integration:partners`; testes ≥ baseline; `pnpm run pipeline:state close` dos 2 tickets.

---

## Dependencies & Execution Order

- Setup → Foundational → **US1 (PAR-OUTBOX-INFRA)** → **US2 (PAR-SUPPLIER-EVENTS)** → Polish.
- US2 **depende** de US1 (usa o outbox). Não são paralelas.
- Dentro de cada US: W0 (testes) falham antes de W1; schema/port antes dos adapters; W2/W3 fecham.

## Parallel Opportunities

- T003/T004 (testes W0 da US1) em paralelo. T006 (port) em paralelo com T005 (schema). T012/T014 (mapper, in-memory) em paralelo com T011.

## Implementation Strategy

**MVP**: Setup + Foundational → US1 (outbox + worker) → validar isolado. US1 é a fundação reutilizável (outros agregados de partners poderão publicar no futuro). US2 adiciona os eventos de fornecedor sobre ela.

**Não fazer aqui**: o consumer/read-model no `financial` (US2 da #47) — feature seguinte, após o merge.

## Notes

- TDD RED obrigatório (§I). Sem `npm` (ADR-0012). Payload em `varchar` (sem JSON nativo — ADR-0020). Comunicação cross-BC só via outbox (ADR-0006/0015). Não tocar `financial`/`contracts`/`auth`.
