# Tasks: Transferência entre contas com contrapartida pendente (#269)

**Feature**: `029-fin-transfer-counterpart` | **Branch**: `feat/269-transfer-counterpart`
**Input**: plan.md, spec.md, research.md, data-model.md, contracts/http.md, quickstart.md

> **Mapeamento pipeline:** cada user story = 1 ticket W0→W3, serializados (1 módulo/sessão).
> US1 → `FIN-COUNTERPART-CREATE` · US2 → `FIN-COUNTERPART-MATCH` · US3 → `FIN-COUNTERPART-UNDO`.
> **TDD obrigatório (Constituição I):** o bloco **Tests (W0 RED)** de cada fase vem ANTES de tocar `src/`.

---

## Phase 1: Setup

- [ ] T001 Inicializar os 3 tickets do pipeline: `pnpm run pipeline:state init FIN-COUNTERPART-CREATE --size M`, idem `FIN-COUNTERPART-MATCH` e `FIN-COUNTERPART-UNDO`; escrever `000-request.md` de cada um (escopo + CAs por US) em `.claude/.pipeline/<ticket>/`
- [ ] T002 [P] Criar a pasta do agregado `src/modules/financial/domain/expected-counterpart/` (vazia, scaffolding do módulo)

---

## Phase 2: Foundational (bloqueia US1–US3)

**Declarações puras compartilhadas + persistência base — sem comportamento de negócio ainda.**

- [ ] T003 [P] Branded id em `src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts` (`generate`/`rehydrate` → `Result`)
- [ ] T004 [P] Tipos em `src/modules/financial/domain/expected-counterpart/types.ts` (`ExpectedCounterpart`, `ExpectedCounterpartStatus`, `ExpectedCounterpartType`, união de erros EN kebab)
- [ ] T005 [P] Eventos em `src/modules/financial/domain/expected-counterpart/events.ts` (`TransferCounterpartCreated`/`Matched`/`Discarded`)
- [ ] T006 Port em `src/modules/financial/application/ports/expected-counterpart-store.ts` (`save`, `findById`, `listPendingByAccount`, `findByOriginReconciliation`)
- [ ] T007 [P] Adapter in-memory `src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts`
- [ ] T008 Schema Drizzle: adicionar `fin_expected_counterpart` em `src/modules/financial/adapters/persistence/schemas/mysql.ts` (varchar ids, bigint cents, varchar movement/status/type, índices `(destination_account_ref,status)` e `(origin_reconciliation_ref)`), depois `pnpm run db:generate` e versionar a migration
- [ ] T009 Mapper + adapter drizzle `src/modules/financial/adapters/persistence/repos/expected-counterpart-store.drizzle.ts` (row↔domínio via `Result`)
- [ ] T010 Registrar contrato dos 3 eventos em `handbook/architecture/` (EN-passado, payloads)

**Checkpoint**: agregado, port, dois adapters e tabela existem — US1–US3 podem começar.

---

## Phase 3: User Story 1 — Contrapartida esperada no destino (P1) · ticket `FIN-COUNTERPART-CREATE`

**Goal**: registrar A→B cria a contrapartida `Pending` na conta de destino.
**Independent test**: `record-manual-entry(type=Transfer, destino=B)` → contrapartida `Pending` (sinal oposto, valor da origem) surge em B; sem destino → nada criado.

### Tests (W0 RED) — antes de `src/`

- [ ] T011 [P] [US1] Teste de domínio `tests/modules/financial/domain/expected-counterpart/create.test.ts` (create: valor>0, `destino≠origem`, movement oposto, status Pending, evento Created)
- [ ] T012 [US1] Teste de application `tests/modules/financial/application/use-cases/record-manual-entry-counterpart.test.ts` (type=Transfer+destino → cria contrapartida; sem destino ou type≠Transfer → não cria — guard de regressão)

### Implementation (W1 → GREEN)

- [ ] T013 [US1] `create` no agregado `src/modules/financial/domain/expected-counterpart/expected-counterpart.ts` (deriva movement oposto, valida, emite `TransferCounterpartCreated`)
- [ ] T014 [US1] Integrar no `src/modules/financial/application/use-cases/record-manual-entry.ts`: quando `type='Transfer'` + `destinationAccountRef`, criar a contrapartida na mesma unit-of-work + publicar evento no outbox
- [ ] T015 [US1] Wiring na composição `src/modules/financial/adapters/http/composition.ts` (injetar `expectedCounterpartStore`)

### Quality (W2/W3)

- [ ] T016 [US1] Code review read-only (skill `code-reviewer`) → `004-code-review/REVIEW.md`
- [ ] T017 [US1] Gate W3 (`typecheck`+`format:check`+`lint`+`test`) verde + fechar ticket + PR para `dev`

---

## Phase 4: User Story 2 — Casar as duas pernas em 1 clique (P1) · ticket `FIN-COUNTERPART-MATCH`

**Goal**: import do extrato de B sugere transação×contrapartida; confirmar consome (dedup) + vincula A↔B.
**Independent test**: com contrapartida Pending em B, importar extrato com crédito real → sugestão `kind=counterpart`; confirmar → duas pernas conciliadas e vinculadas, 0 duplicata, contrapartida `Matched`.
**Depende de**: US1 (agregado + contrapartida criada).

### Tests (W0 RED)

- [ ] T018 [P] [US2] Teste de domínio `tests/modules/financial/domain/expected-counterpart/match.test.ts` (`match` exige Pending; senão `counterpart-not-pending`; grava `matchedTransactionRef`; evento Matched)
- [ ] T019 [US2] Teste de application `tests/modules/financial/application/use-cases/suggest-matches-counterpart.test.ts` (sugere transação×contrapartida: valor exato + janela ~5d; empate → mais antiga não consumida)
- [ ] T020 [US2] Teste de application `tests/modules/financial/application/use-cases/confirm-counterpart.test.ts` (confirmar consome a contrapartida — dedup, sem 2ª transação — + vínculo A↔B)

### Implementation (W1 → GREEN)

- [ ] T021 [US2] `match` no agregado `expected-counterpart.ts` (Pending→Matched + evento)
- [ ] T022 [US2] Estender `src/modules/financial/application/use-cases/suggest-matches.ts` para comparar transações Pending de B × contrapartidas Pending (reusa `domain/reconciliation/match-score.ts`), retornando `kind='counterpart'` com rótulo da conta de origem
- [ ] T023 [US2] Estender `src/modules/financial/application/use-cases/confirm-reconciliation.ts` para aceitar alvo `counterpart`: concilia a transação real + `match` + grava vínculo A↔B + evento Matched (dedup por consumo)
- [ ] T024 [P] [US2] Borda: schema Zod + DTO em `src/modules/financial/adapters/http/schemas.ts` e `dto.ts` (sugestão `kind`, confirm `target.counterpartId`) — validar com `zod-expert`
- [ ] T025 [US2] Rota em `src/modules/financial/adapters/http/plugin.ts` (suggestions expõe counterpart; confirm aceita o alvo counterpart) + `error-mapping.ts` (`counterpart-not-pending`→409, `counterpart-not-found`→422)

### Quality (W2/W3)

- [ ] T026 [US2] Code review read-only → `004-code-review/REVIEW.md`
- [ ] T027 [US2] Gate W3 verde + fechar ticket + PR para `dev`

---

## Phase 5: User Story 3 — Desfazer origem trata a contrapartida (P2) · ticket `FIN-COUNTERPART-UNDO`

**Goal**: desfazer a conciliação de origem descarta (Pending) ou reabre (Matched) a contrapartida.
**Independent test**: criar contrapartida (US1), desfazer origem → Pending vira Discarded; se Matched, o par de B é reaberto sem contagem dobrada.
**Depende de**: US1 (criar) e US2 (matched, para o caso de reabertura).

### Tests (W0 RED)

- [ ] T028 [P] [US3] Teste de domínio `tests/modules/financial/domain/expected-counterpart/discard.test.ts` (`discard`: Pending→Discarded; Matched exige reabertura antes; Discarded terminal; evento Discarded)
- [ ] T029 [US3] Teste de application `tests/modules/financial/application/use-cases/undo-reconciliation-counterpart.test.ts` (undo origem: Pending→Discarded; Matched→reabre o par de B; sem contagem dobrada)

### Implementation (W1 → GREEN)

- [ ] T030 [US3] `discard` (+ reabertura) no agregado `expected-counterpart.ts`
- [ ] T031 [US3] Estender `src/modules/financial/application/use-cases/undo-reconciliation.ts`: localizar contrapartida por `origin_reconciliation_ref` e tratar (discard/reopen) na mesma tx + evento Discarded

### Quality (W2/W3)

- [ ] T032 [US3] Code review read-only → `004-code-review/REVIEW.md`
- [ ] T033 [US3] Gate W3 verde + fechar ticket + PR para `dev`

---

## Phase 6: Polish & Cross-Cutting

- [ ] T034 [P] Cobertura de integração Drizzle do `expected-counterpart-store` atrás de `MYSQL_INTEGRATION` em `tests/modules/financial/adapters/persistence/`
- [ ] T035 [P] Coleção Bruno de smoke E2E do fluxo A→B (manual-entry → suggestions → confirm → undo) em `api-collections/core-api/`
- [ ] T036 Atualizar `handbook/` (fluxo de transferência com contrapartida) e fechar a feature; confirmar SC-001..SC-005 via `quickstart.md`

---

## Dependencies & Execution

- **Serialização de stories**: US1 → US2 → US3 (US2 precisa da contrapartida criada; US3 do caso Matched). 1 ticket/sessão.
- **Foundational (Phase 2)** bloqueia todas as stories.
- **Paralelizável** dentro de fase: tarefas `[P]` tocam arquivos distintos (ex.: T003/T004/T005/T007; T011 vs T012; T024 vs domínio; T034/T035).

## Parallel example (Foundational)

```
# Após T001/T002, rodar em paralelo:
T003 expected-counterpart-id.ts
T004 types.ts
T005 events.ts
T007 in-memory store
```

## Implementation Strategy

- **MVP = US1 + US2** (o fluxo de 1 lançamento + casamento com dedup é o valor central). US3 (undo) é robustez P2.
- Entregar **1 PR por ticket** (CREATE, MATCH, UNDO), cada um com gate W3 verde e regressão zero (transferência sem destino e casamento transação×título atuais intocados).

## Format validation

Todas as 36 tarefas seguem `- [ ] Txxx [P?] [US?] descrição + caminho`. Setup/Foundational/Polish sem label de story; fases de US com `[US1]`/`[US2]`/`[US3]`.
