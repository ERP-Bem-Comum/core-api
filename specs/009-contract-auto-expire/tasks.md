# Tasks: Expiração automática de contratos ao fim da vigência

**Feature**: `specs/009-contract-auto-expire` · **Branch**: `feat/backlog-residual-sdd` · **Módulo**:
`contracts` (`ctr_*`)

**Disciplina**: TDD W0→W3 (testes RED antes de tocar `src/`). Gate final via `/speckit-verify`.

**Legenda**: `[P]` = paralelizável (arquivos distintos, sem dependência pendente) · `[USx]` = user story.

---

## Phase 1 — Setup

- [x] T001 Confirmar que nenhuma dependência nova é necessária (reusa Drizzle/mysql2, `node:test`, worker
      existente) e que a branch/feature está ativa (`specs/009-contract-auto-expire`).

## Phase 2 — Foundational (bloqueia as user stories)

- [x] T002 [P] W0 RED: teste do helper de cutoff em
      `tests/modules/contracts/application/use-cases/expire-cutoff.test.ts` — `fromDateAtOffsetMinutes(now, -180)`
      (BRT): `2026-06-11T02:00:00Z` → `2026-06-10`; `2026-06-11T04:00:00Z` → `2026-06-11`.
- [x] T003 [P] W0 RED: teste de `findExpirable(cutoff)` (in-memory) em
      `tests/modules/contracts/adapters/persistence/repos/contract-repository-expirable.test.ts` — retorna só
      Active+Fixed+`end<cutoff`; ignora Pending/Terminated/Cancelled/Indefinite/`end>=cutoff`.
- [x] T004 Implementar `fromDateAtOffsetMinutes(d: Date, offsetMinutes: number): PlainDate` em
      `src/shared/kernel/plain-date.ts` (genérico; sem hardcode de fuso).
- [x] T005 Adicionar `findExpirable(cutoff: PlainDate)` ao port em
      `src/modules/contracts/domain/contract/repository.ts` (retorna `readonly ActiveContract[]`).
- [x] T006 Implementar `findExpirable` no adapter in-memory
      `src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts` (filtro pelo predicado).
- [x] T007 Implementar `findExpirable` no adapter Drizzle
      `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts`
      (`WHERE status='Active' AND current_period_kind='Fixed' AND current_period_end < :cutoff`; reusa o mapper).

**Checkpoint Foundational**: T002/T003 ficam GREEN após T004–T007.

## Phase 3 — User Story 1 (P1): contrato vencido vira Finalizado sem ação manual

**Goal**: o sweep finaliza automaticamente os contratos Active com vigência efetiva encerrada.
**Independent Test**: criar um Active com `end` no passado, rodar o use case, conferir que vira Expired.

- [x] T008 [P] [US1] W0 RED: teste do use case em
      `tests/modules/contracts/application/use-cases/expire-due-contracts.test.ts` — Active+Fixed+`end<cutoff`
      → Expired; Pending/Terminated/Cancelled/Indefinite/`end>=cutoff` → intactos; conta `scanned`/`expired`.
- [x] T009 [US1] Implementar o use case `expireDueContracts(deps)()` em
      `src/modules/contracts/application/use-cases/expire-due-contracts.ts` — `cutoff = fromDateAtOffsetMinutes(
clock.now(), -180)` → `findExpirable` → para cada: `Contract.expire(active, now)` → `save(contract,
[event])`; devolve `{ scanned, expired, failures }`.
- [x] T010 [US1] W0 RED: teste do tick em `tests/modules/contracts/worker/expire-scheduler.test.ts` — chama
      o use case e loga `scanned/expired/failures`; respeita o `AbortSignal` (sem timers reais).
- [x] T011 [US1] Implementar `runExpireScheduler(deps, intervalMs)` em
      `src/modules/contracts/worker/expire-scheduler.ts` (loop com abort; loga a contagem por ciclo).
- [x] T012 [US1] Ler `CONTRACTS_EXPIRE_SWEEP_MS` (default 3.600.000) em
      `src/modules/contracts/worker/config.ts`.
- [x] T013 [US1] Wirar no `src/modules/contracts/worker/run.ts`: `ContractRepository` Drizzle sobre o pool
      existente + `ClockReal` + `runExpireScheduler` em paralelo ao `runLoop`, encerrando no shutdown.

**Checkpoint US1 (MVP)**: contratos vencidos passam a Expired ao rodar o worker.

## Phase 4 — User Story 2 (P2): expiração automática notifica os demais módulos

**Goal**: a finalização automática emite `ContractEnded (kind 'Expired')` (paridade com o manual) e é idempotente.
**Independent Test**: após o sweep, o evento consta no outbox; 2ª execução = no-op.

- [x] T014 [P] [US2] W0 RED: estender `expire-due-contracts.test.ts` — assere que `save` é chamado com
      `[ContractEnded (kind 'Expired')]` (evento no outbox) e que **2ª execução** não re-expira nem duplica evento (idempotência).
- [x] T015 [US2] Garantir no use case (T009) que o evento de `Contract.expire` é passado a `save(contract,
[event])` (sem caminho que persista estado sem evento). Refinar se o teste T014 expuser gap.

## Phase 5 — User Story 3 (P3): borda D+1 no fuso de Brasília

**Goal**: contrato com `end = hoje (BRT)` permanece Active hoje; finaliza em D+1.
**Independent Test**: variar `clock.now()` ao redor da meia-noite BRT e conferir a virada.

- [x] T016 [P] [US3] W0 RED: estender `expire-due-contracts.test.ts` — `end = hoje_BRT` → permanece Active;
      `end = hoje_BRT − 1` → Expira; boundary de fuso (`02:00Z` vs `04:00Z` no mesmo dia).
- [x] T017 [US3] Confirmar o predicado `PlainDate.isBefore(end, cutoff)` (estritamente anterior) no use case
      (T009) — ajustar se T016 falhar. Documentar que a guarda do `/end` manual NÃO muda.

## Phase 6 — Polish & Cross-Cutting

- [x] T018 [P] Atualizar `handbook/infrastructure/05-local-server-parity-env.md` e o quickstart com
      `CONTRACTS_EXPIRE_SWEEP_MS` (config do worker).
- [ ] T019 [P] Integração: cobrir `findExpirable` no MySQL real (suite atrás de `pnpm run test:integration`).
      **Deferida ao pré-merge** — lógica coberta por unit (in-memory); SQL é `WHERE` direto. Rodar
      `pnpm run test:integration` antes do merge (constituição §Development Workflow).
- [x] T020 Mover o card `handbook/tickets/todo/CTR-CONTRACT-AUTO-EXPIRE.md` → `done/` ao fechar (após W3 verde).
- [x] T021 Gate W3 (`/speckit-verify`): `typecheck` + `format:check` + `lint` + `test` verdes.

---

## Dependências

- **Foundational (T002–T007)** bloqueia tudo (helper de cutoff + `findExpirable`).
- **US1 (T008–T013)** depende de Foundational; entrega o MVP.
- **US2 (T014–T015)** e **US3 (T016–T017)** refinam/testam o use case da US1 (mesmo arquivo) — sequenciais
  entre si por tocarem `expire-due-contracts.{ts,test.ts}`.
- **Polish (T018–T021)** por último.

## Paralelização

- T002 ‖ T003 (arquivos de teste distintos).
- T008 (US1 test) ‖ T010 (worker test) — arquivos distintos.
- T018 ‖ T019 (doc vs. teste de integração).

## MVP

**User Story 1 (T002–T013)**: o sweep finaliza contratos vencidos. US2/US3 adicionam evento/idempotência e
a borda D+1 — incrementos sobre o mesmo use case.
