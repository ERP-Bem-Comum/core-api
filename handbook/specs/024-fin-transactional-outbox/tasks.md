---
description: 'Task list — 024 outbox transacional do Financeiro (#127)'
---

# Tasks: Outbox transacional do Financeiro (atomicidade estado+evento)

**Input**: Design documents from `/specs/024-fin-transactional-outbox/`

**Prerequisites**: plan.md ✅, spec.md ✅ (+Clarifications), research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: **OBRIGATÓRIOS** — Princípio I (TDD W0→W3). W0 RED antes de tocar `src/`.

**Organização**: **L**, ordenada por **waves W0→W3**. Fundação (tabela `fin_outbox` + helper) é pré-requisito das 2 fatias de implementação: **Fatia A = documento** (DocumentRepository, 7 use-cases) e **Fatia B = conciliação** (ReconciliationRepository, 3 use-cases). US1 = durabilidade/caminho feliz (P1); US2 = caminho de falha/rollback (P2) — exercidas nas duas fatias. Ticket: **`FIN-OUTBOX-ATOMIC`** (fatiável em A e B se preciso).

## Format: `[ID] [P?] [Story?] Description`

- **[P]** paralelizável · **[US1]** durabilidade atômica (sucesso) · **[US2]** falha → rollback total

## Path Conventions

Produção em `src/modules/financial/`, testes em `tests/modules/financial/`. Espelha o padrão `contracts` (`appendOutboxInTx` + `ctr_outbox`).

---

## Phase 1: Setup (ticket)

- [ ] T001 Inicializar o ticket: `pnpm run pipeline:state init FIN-OUTBOX-ATOMIC --size L` e escrever `.claude/.pipeline/FIN-OUTBOX-ATOMIC/000-request.md` (escopo + CAs de spec.md FR-001..FR-008 e da matriz em contracts/outbox-atomic-append.md).

---

## Phase 2: Foundational — `fin_outbox` + helper (W0 RED → W1) ⚠️ BLOQUEIA as fatias

**Purpose**: introduzir a tabela `fin_outbox` (não existe) + o helper `appendFinOutboxInTx`. Sem isso não há onde gravar o evento na tx.

### W0 RED

- [ ] T002 [P] Teste de unidade do helper em `tests/modules/financial/adapters/persistence/fin-outbox-helpers.test.ts`: dado um `tx` fake e N eventos, `appendFinOutboxInTx(tx, events)` chama `tx.insert(finOutbox)` com as linhas mapeadas (event*id/aggregate*\*/event_type/payload/timestamps); `events=[]` → no-op. Deve FALHAR (helper inexistente).
- [ ] T003 [P] Teste de schema/migration em `tests/modules/financial/adapters/persistence/fin-outbox-schema.drizzle-mysql.test.ts` (integração, Docker): a tabela `fin_outbox` existe com PK `event_id`, CHECKs e índice `(processed_at, occurred_at)`; INSERT duplicado de `event_id` → erro de PK. Deve FALHAR (tabela inexistente).

### W1 GREEN

- [ ] T004 Adicionar a tabela `finOutbox` em `src/modules/financial/adapters/persistence/schemas/mysql.ts` espelhando `ctrOutbox` (char(36) `event_id` PK; `aggregate_id`/`aggregate_type`+CHECK `IN ('Document','Reconciliation')`; `event_type`+CHECK nonempty; `schema_version` smallint; `payload` varchar(8192); `occurred_at`/`enqueued_at` datetime(3); `processed_at` datetime(3) null; `attempts` smallint default 0; índice `(processed_at, occurred_at)` + `(aggregate_id)`). Sem JSON/ENUM (ADR-0020).
- [ ] T005 Gerar a migration: `pnpm run db:generate` → versionar `src/modules/financial/adapters/persistence/migrations/mysql/00NN_*.sql` (revisar o SQL: CHARSET/COLLATE, CHECKs).
- [ ] T006 Implementar `src/modules/financial/adapters/persistence/repos/fin-outbox-helpers.ts`: `appendFinOutboxInTx(tx, events)` + `finEventToOutboxInsert(event, now)` (espelha `eventToOutboxInsert` de contracts). Tipo de `tx` estrutural `{ insert: FinancialMysqlHandle['db']['insert'] }`.

**Checkpoint**: T002/T003 verdes; tabela + helper prontos.

---

## Phase 3: Fatia A — Documento (DocumentRepository, 7 use-cases) — W0 RED → W1

**Goal**: as 7 escritas de documento gravam estado + evento na mesma tx; falha no outbox reverte tudo.

### W0 RED

- [ ] T007 [US2] `tests/modules/financial/adapters/persistence/document-outbox-atomic.in-memory.test.ts`: adapter de outbox in-memory que **falha** no append → `documentRepository.save(agg, entries, events)` reverte (estado não persiste, `findById` → not-found) e retorna slug de erro. Deve FALHAR (save ainda não recebe events).
- [ ] T008 [US1] [US2] `tests/modules/financial/adapters/persistence/document-outbox-atomic.drizzle-mysql.test.ts` (integração, Docker): caminho feliz → `COUNT(fin_documents)` += 1 e `COUNT(fin_outbox)` += N na mesma tx; **falha forçada** no INSERT do outbox (ex.: event_type vazio / payload > limite) → `COUNT(fin_documents)` e `COUNT(fin_outbox)` == baseline (CA2/CA3). Deve FALHAR.

### W1 GREEN

- [ ] T009 [US1] Estender o port `DocumentRepository.save` em `src/modules/financial/domain/document/repository.ts` para receber `events: readonly FinancialAppendableEvent[]`.
- [ ] T010 [US1] `document-repository.drizzle.ts` (`save`, tx em ~L224): chamar `appendFinOutboxInTx(tx, events)` como último passo da `db.transaction`; converter falha em `document-repository-failure` (sem vazar Error).
- [ ] T011 [US1] `document-repository.in-memory.ts` (`save`): paridade — gravar os events num outbox in-memory injetado (mesma assinatura); honrar a injeção de falha do teste.
- [ ] T012 [US1] Atualizar os 7 use-cases (`save-document`, `save-draft`, `submit-draft`, `adjust-document`, `undo-approval`, `approve-document`, `cancel-document` em `src/modules/financial/application/use-cases/`): passar `events` para `repo.save(...)` e **remover** o `outbox.append(...)` separado + a dep `outbox` (onde aplicável).
- [ ] T013 Rodar a Fatia A verde: `pnpm test -- --test-name-pattern="document-outbox"` + `pnpm run test:integration:financial`.

**Checkpoint**: Fatia A GREEN (documento atômico).

---

## Phase 4: Fatia B — Conciliação (ReconciliationRepository, 3 use-cases) — W0 RED → W1

**Goal**: confirmar/confirmar-manual/desfazer conciliação gravam estado + evento na mesma tx.

### W0 RED

- [ ] T014 [US2] `tests/modules/financial/adapters/persistence/reconciliation-outbox-atomic.in-memory.test.ts`: outbox que falha → `reconciliationRepo.confirm/undo(..., events)` reverte o flip de payables; retorna slug de erro. Deve FALHAR.
- [ ] T015 [US1] [US2] `tests/modules/financial/adapters/persistence/reconciliation-outbox-atomic.drizzle-mysql.test.ts` (integração, Docker): confirmar → `fin_payables` flipa + `fin_outbox` += N na mesma tx; falha no outbox → `COUNT(fin_payables Reconciled)` e `COUNT(fin_outbox)` == baseline. Deve FALHAR.

### W1 GREEN

- [ ] T016 [US1] Estender o port `ReconciliationRepository` (`src/modules/financial/application/ports/reconciliation-repository.ts`): `confirm`, `confirmManualEntry`, `undo` recebem `events`.
- [ ] T017 [US1] `reconciliation-repository.drizzle.ts` (tx em ~L51 nos 3 métodos): `appendFinOutboxInTx(tx, events)` como último passo de cada `db.transaction`; falha → slug de erro.
- [ ] T018 [US1] `reconciliation-repository.in-memory.ts`: paridade dos 3 métodos.
- [ ] T019 [US1] Atualizar `confirm-reconciliation.ts`, `undo-reconciliation.ts` e o use-case de lançamento manual: passar `events` ao repo; remover `outbox.append` separado.
- [ ] T020 Rodar a Fatia B verde: `pnpm test -- --test-name-pattern="reconciliation-outbox"` + `pnpm run test:integration:financial`.

**Checkpoint**: Fatia B GREEN (conciliação atômica).

---

## Phase 5: Composição (wiring) — W1

- [ ] T021 `src/modules/financial/adapters/http/composition.ts`: no driver **mysql**, os repos passam a gravar no `fin_outbox` (via a assinatura nova; o `createInMemoryOutbox()` deixa de ser usado pelos use-cases). No driver **memory**, manter um outbox in-memory injetado nos repos (paridade de testes). Remover a dep `outbox` standalone dos use-cases onde foi absorvida.

---

## Phase 6: W2 — Code review read-only

- [ ] T022 Revisão (skill `code-reviewer`, máx. 3 rounds): atomicidade na MESMA tx (ADR-0015), `fin_outbox` conforme `ctr_outbox`/ADR-0020 (varchar não-JSON, sem ON DUPLICATE), sem vazar Error (slug), paridade in-memory↔drizzle nos 2 repos, idempotência por PK. Gravar `004-code-review/REVIEW.md`.

---

## Phase 7: W3 — Gate de qualidade

- [ ] T023 Validar `quickstart.md`.
- [ ] T024 Gate W3 (skill `ts-quality-checker`): `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test` + `pnpm run test:integration:financial` (rollback real, Docker). Gravar `005-quality/REPORT.md`.
- [ ] T025 Fechar o ticket: `pnpm run pipeline:state` wave-finish + `close FIN-OUTBOX-ATOMIC`. PR referencia #127 (merge `dev`, sem auto-close).

---

## Dependencies & Execution Order

### Wave order (Princípio I)

- **Setup (P1)** → **Foundational (P2: `fin_outbox` + helper, W0 RED→W1)** BLOQUEIA tudo → **Fatia A (P3)** e **Fatia B (P4)** (W0 RED→W1; podem ser sequenciais ou paralelas por repo) → **Composição (P5)** → **W2 (P6)** → **W3 (P7)**.

### Slice independence

- **Fatia A (documento)** e **Fatia B (conciliação)** tocam repos/use-cases distintos → podem ser entregues/revisadas separadamente (o ticket é fatiável). Ambas dependem da Fundação (P2).

### Within waves

- W0 RED de cada fatia antes do W1 dela. Os testes de integração (T003/T008/T015) exigem Docker (`test:integration:financial`).

### Parallel Opportunities

- T002 ∥ T003 (arquivos distintos). Fatia A (T007–T013) ∥ Fatia B (T014–T020) **após** a Fundação, se houver capacidade (repos distintos).

---

## Implementation Strategy

### MVP / fatiamento

1. P1 Setup + P2 Fundação (`fin_outbox` + helper) — base.
2. **Fatia A (documento)** → atomicidade nos 7 use-cases. Validar.
3. **Fatia B (conciliação)** → atomicidade nas 3 operações (a mais crítica — eventos cross-módulo).
4. Composição + W2 + W3 fecham. PR referencia #127.

> Se for preciso fatiar a entrega: **Fundação + Fatia A** num PR e **Fatia B** noutro — ambos fecham parte do #127 (a conciliação é a prioridade canônica, mas depende da Fundação).

---

## Notes

- Princípio I (TDD) tem precedência sobre o agrupamento por story — daí a ordenação por waves.
- **Integração obrigatória** (Docker): a atomicidade real (rollback estado+outbox) só se prova no MySQL — `test:integration:financial` no W0 (RED) e W3.
- Threading dos eventos PARA DENTRO do repo (não `outbox.append` após commit) — espelha contracts (`appendOutboxInTx`).
- Sem novo ADR (conformidade ADR-0015). `fin_outbox` espelha `ctr_outbox` (ADR-0020: varchar, sem JSON/ON DUPLICATE).
- Commit PT-BR: `feat(financial): outbox transacional — estado+evento na mesma tx (#127)`.
