---
description: 'Task list — Conciliação Bancária (017)'
---

# Tasks: Conciliação Bancária (módulo Financeiro)

**Input**: Design documents from `specs/017-fin-conciliacao-bancaria/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: **OBRIGATÓRIOS** — constituição I (TDD fail-first W0→W3): todo task de teste é RED antes de
tocar `src/`. Cada user story percorre W0 (testes RED) → W1 (impl mínima) → W2 (review) → W3 (gate).

**Organização**: tasks agrupados por user story (US1–US6). O mapeamento para os **8 tickets**
W0→W3 do plano está em cada cabeçalho de fase. Convenção de path: `src/modules/financial/…` e
`tests/modules/financial/…`.

> **Mapa fase → ticket de pipeline** (`.claude/.pipeline/<TICKET>/`):
> US1 → `FIN-RECON-STATEMENT-DOMAIN` + `FIN-RECON-PARSERS` + `FIN-RECON-STATEMENT-PERSIST-HTTP` ·
> US2 → `FIN-RECON-MATCH` + `FIN-RECON-CORE-DOMAIN` + `FIN-RECON-CORE-PERSIST-HTTP` ·
> US3/US4 → `FIN-RECON-CORE-DOMAIN`/`FIN-RECON-CORE-PERSIST-HTTP` (undo / múltiplo-parcial) ·
> US5 → `FIN-RECON-MANUAL-BATCH` · US6 → `FIN-RECON-PERIOD-EXPORT`.
>
> ⚠️ **Serialização de arquivos compartilhados** (NÃO paralelizar entre stories): `schemas/mysql.ts`,
> `public-api/events.ts`, `public-api/permissions.ts`, `adapters/http/{plugin,composition,schemas}.ts`
> são append-only e tocados por várias stories → edição serial. **Uma migration por ticket**
> (`0005+`, serializadas após a `0004` da 016 — D-DEP/lição PRs #83–86).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos distintos, sem dependência pendente)
- **[Story]**: US1…US6 (mapeia para spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: esqueleto dos novos subdomínios no módulo `financial` (já existente).

- [ ] T001 [P] Criar esqueleto de pastas de domínio: `src/modules/financial/domain/statement/` e `src/modules/financial/domain/reconciliation/` (arquivos `types.ts`/`index.ts` vazios)
- [ ] T002 [P] Criar esqueleto de adapters: `src/modules/financial/adapters/statement-parsers/` e `src/modules/financial/adapters/export/`
- [ ] T003 [P] Criar esqueleto de testes: `tests/modules/financial/domain/{statement,reconciliation}/`, `tests/modules/financial/adapters/statement-parsers/`, e confirmar `tests/modules/financial/application/use-cases/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: kernel compartilhado por TODAS as stories. ⚠️ Bloqueia US1–US6.

- [ ] T004 Estender `src/modules/financial/public-api/events.ts` com os literais EN-passado e payloads v1: `BankStatementImported`, `PayableReconciled`, `ReconciliationUndone`, `ManualEntryRecorded`, `ReconciliationPeriodClosed`
- [ ] T005 Estender `src/modules/financial/public-api/permissions.ts` com `reconciliation:import`, `reconciliation:read`, `reconciliation:reconcile`, `reconciliation:undo`, `reconciliation:close`
- [ ] T006 [P] Confirmar reuso (sem duplicar) de `Money`, `Clock`, `IdGenerator` e do port de outbox do `financial` para os novos subdomínios — registrar pontos de injeção em `adapters/http/composition.ts`

**Checkpoint**: kernel pronto — US1 pode começar.

---

## Phase 3: User Story 1 - Importar extrato com anti-duplicidade (Priority: P1) 🎯 MVP

**Goal**: importar OFX/CSV de uma conta-cedente, criar transações `Pending` com `FITID`, descartar duplicatas silenciosamente (R5).

**Independent Test**: importar arquivo de 10 transações → 10 `Pending`; reimportar → 0 novas + contagem de duplicatas.

### Tests for User Story 1 (W0 — RED) ⚠️

- [ ] T007 [P] [US1] Teste de domínio `BankStatement`: dedup por FITID (descarte silencioso + contagem), atomicidade da importação, FITID sintético do CSV em `tests/modules/financial/domain/statement/bank-statement.test.ts`
- [ ] T008 [P] [US1] Teste do VO `Fitid` (nativo + sintético sha256 determinístico) em `tests/modules/financial/domain/statement/fitid.test.ts`
- [ ] T009 [P] [US1] Testes dos parsers OFX/CSV (parsing + normalização de tipo + FITID ausente no CSV) em `tests/modules/financial/adapters/statement-parsers/ofx-parser.test.ts` e `csv-parser.test.ts`
- [ ] T010 [P] [US1] Teste do use-case `importBankStatement` (dedup + atomicidade + reporte de duplicatas) em `tests/modules/financial/application/use-cases/import-bank-statement.test.ts`
- [ ] T011 [P] [US1] Teste HTTP `POST /bank-statements` (201/422/404/409) e `GET /bank-statements/:id/transactions` em `tests/modules/financial/adapters/http/financial-reconciliation.http.test.ts`

### Implementation for User Story 1

- [ ] T012 [P] [US1] VO `Fitid` (nativo + sintético `sha256(debitAccountRef|date|value|memo|seq)`) em `src/modules/financial/domain/statement/fitid.ts`
- [ ] T013 [US1] Agregado `BankStatement` + entidade `StatementTransaction` + operação `import(parsed, knownFitids)` (dedup) + `events.ts`/`errors.ts` em `src/modules/financial/domain/statement/`
- [ ] T014 [P] [US1] Port `BankStatementParser` em `src/modules/financial/application/ports/bank-statement-parser.ts`
- [ ] T015 [P] [US1] Adapter `ofx-parser.ts` (Node puro, FITID nativo) em `src/modules/financial/adapters/statement-parsers/ofx-parser.ts`
- [ ] T016 [P] [US1] Adapter `csv-parser.ts` (Node puro + FITID sintético) em `src/modules/financial/adapters/statement-parsers/csv-parser.ts`
- [ ] T017 [P] [US1] `fake-parser.ts` (double de teste) em `src/modules/financial/adapters/statement-parsers/fake-parser.ts`
- [ ] T018 [US1] Tabelas `fin_bank_statements` + `fin_statement_transactions` + **índice único `(debit_account_ref, fitid)`** em `src/modules/financial/adapters/persistence/schemas/mysql.ts`
- [ ] T019 [US1] Gerar migration `0005` (`pnpm run db:generate`) + inserir CHARSET/COLLATE à mão (utf8mb4_unicode_ci; UUID/FK utf8mb4_bin)
- [ ] T020 [P] [US1] Port `BankStatementRepository` (`save`, `knownFitids`, `listTransactions`) em `src/modules/financial/application/ports/bank-statement-repository.ts`
- [ ] T021 [US1] Repos `bank-statement-repository.{in-memory,drizzle}.ts` em `src/modules/financial/adapters/persistence/repos/`
- [ ] T022 [US1] Use-case `importBankStatement` (parse → dedup → persistir → append `BankStatementImported`) em `src/modules/financial/application/use-cases/import-bank-statement.ts`
- [ ] T023 [US1] Rotas `POST /api/v2/financial/bank-statements` + `GET /…/:id/transactions` + schemas Zod + `error-mapping` + wiring em `composition.ts` (`src/modules/financial/adapters/http/`)

**Checkpoint**: US1 funcional e testável isolada — importação + visibilidade do extrato.

---

## Phase 4: User Story 2 - Conciliar título com transação (confirmação manual) (Priority: P1) 🎯 MVP

**Goal**: conciliar 1:1 manualmente; título `Paid→Reconciled`; publicar `PayableReconciled`. Score só sugere (R1).

**Independent Test**: título `Paid` + transação `Pending` de mesmo valor → confirmar → título `Reconciled`, `Conciliacao` `Active`, evento no outbox.

### Tests for User Story 2 (W0 — RED) ⚠️

- [ ] T024 [P] [US2] Teste de domínio `Reconciliation` (Individual): R1 (confirmação manual), R2 (`title-not-paid`), `transaction-already-reconciled` em `tests/modules/financial/domain/reconciliation/reconciliation.test.ts`
- [ ] T025 [P] [US2] Teste do VO `MatchScore` + função de score (faixas alta/média/baixa) em `tests/modules/financial/domain/reconciliation/match-score.test.ts`
- [ ] T026 [P] [US2] Teste do use-case `confirmReconciliation` (Paid→Reconciled + outbox `PayableReconciled` por título) em `tests/modules/financial/application/use-cases/confirm-reconciliation.test.ts`
- [ ] T027 [P] [US2] Teste dos use-cases `suggestMatches` (read) e `rejectSuggestion` em `tests/modules/financial/application/use-cases/suggest-matches.test.ts`
- [ ] T028 [P] [US2] Teste HTTP `GET /…/suggestions`, `POST /reconciliations` (201/409/422), `POST /…/reject-suggestion` em `financial-reconciliation.http.test.ts`

### Implementation for User Story 2

- [ ] T029 [P] [US2] VO `MatchScore` + função de score **pura** (critérios ponderados) em `src/modules/financial/domain/reconciliation/match-score.ts`
- [ ] T030 [US2] Agregado `Reconciliation` + `ReconciliationItem` + `confirm()` (Individual) + `events.ts`/`errors.ts` em `src/modules/financial/domain/reconciliation/`
- [ ] T031 [US2] Transição `reconcile()` (`Paid→Reconciled`) no domínio `payable` em `src/modules/financial/domain/payable/`
- [ ] T032 [P] [US2] Port `PayableLookup` (`findPaidById`, `searchPaid`, `openCountBySupplier`) em `src/modules/financial/application/ports/payable-lookup.ts`
- [ ] T033 [P] [US2] Port `ReconciliationRepository` (`saveReconciliation`, `findById`, `rejectSuggestion`) em `src/modules/financial/application/ports/reconciliation-repository.ts`
- [ ] T034 [US2] Tabelas `fin_reconciliations` + `fin_reconciliation_items` + `fin_rejected_suggestions` em `schemas/mysql.ts`
- [ ] T035 [US2] Gerar migration `0006` + CHARSET/COLLATE à mão
- [ ] T036 [US2] Repos `reconciliation-repository.{in-memory,drizzle}.ts` + `payable-lookup.{in-memory,drizzle}.ts` — `saveReconciliation` numa **tx única** (cria `Conciliacao` + payable `Paid→Reconciled` + marca transação + append outbox) em `adapters/persistence/repos/`
- [ ] T037 [US2] Use-case `suggestMatches` (read-model, score) em `src/modules/financial/application/use-cases/suggest-matches.ts`
- [ ] T038 [US2] Use-cases `confirmReconciliation` (Individual) e `rejectSuggestion` em `src/modules/financial/application/use-cases/`
- [ ] T039 [US2] Rotas `GET /…/:id/suggestions`, `POST /reconciliations`, `POST /…/reject-suggestion` + Zod + error-mapping; append `PayableReconciled` (por título) no outbox

**Checkpoint**: MVP completo — importar → sugerir → conciliar 1:1 com evento.

---

## Phase 4b: Conta-cedente — múltiplas contas e conta encerrada (FR-015 / R10)

> Cobre **FR-015** (gap apontado no `/speckit-analyze`): múltiplas contas-cedente + conta encerrada
> não aceita novas conciliações. Lê o status da conta em `fin_cedente_accounts` (da 016 — D-DEP);
> até a 016 pousar, os testes semeiam conta ativa/encerrada.

### Tests (W0 — RED) ⚠️

- [ ] T076 [P] [US2] Teste: importar/conciliar em **conta encerrada** é rejeitado (`account-closed`) e a listagem separa contas **ativas/encerradas** (R10) em `tests/modules/financial/application/use-cases/account-guard.test.ts` + `…/adapters/http/financial-reconciliation.http.test.ts`

### Implementation

- [ ] T077 [US2] Guard `account-closed` em `importBankStatement` e `confirmReconciliation` + leitura de contas (status `Active`/`Closed`) via `CedenteAccountLookup` em `src/modules/financial/application/` e `adapters/persistence/repos/`
- [ ] T078 [US2] Borda: seleção/listagem de contas (ativas/encerradas separadas) e rejeição `409 account-closed` nas rotas de importar/conciliar em `src/modules/financial/adapters/http/`

**Checkpoint**: FR-015 coberto — multi-conta + bloqueio de conta encerrada.

---

## Phase 5: User Story 3 - Desfazer conciliação / Unreconcile (Priority: P2)

**Goal**: desfazer conciliação ativa; título `Reconciled→Paid`; `Conciliacao` vira `Undone` (R7, não deleta); publicar `ReconciliationUndone`.

**Independent Test**: título `Reconciled` + `Conciliacao` `Active` → desfazer → título `Paid`, `Conciliacao` `Undone`, evento no outbox.

### Tests for User Story 3 (W0 — RED) ⚠️

- [ ] T040 [P] [US3] Teste de domínio `undo()`: `Reconciled→Paid`, `Conciliacao` `Undone` (preserva — R7), `reconciliation-already-undone` em `reconciliation.test.ts`
- [ ] T041 [P] [US3] Teste do use-case `undoReconciliation` (outbox `ReconciliationUndone` + guard `period-closed`) em `tests/modules/financial/application/use-cases/undo-reconciliation.test.ts`
- [ ] T042 [P] [US3] Teste HTTP `POST /reconciliations/:id/undo` (200/409) em `financial-reconciliation.http.test.ts`

### Implementation for User Story 3

- [ ] T043 [US3] `Reconciliation.undo(reason?)` + `payable.unreconcile()` (`Reconciled→Paid`) em `src/modules/financial/domain/reconciliation/` e `domain/payable/`
- [ ] T044 [US3] `ReconciliationRepository.undo` (tx única: `Conciliacao→Undone` + payable→`Paid` + transação→`Pending` + append outbox) nos repos
- [ ] T045 [US3] Use-case `undoReconciliation` em `src/modules/financial/application/use-cases/undo-reconciliation.ts`
- [ ] T046 [US3] Rota `POST /reconciliations/:id/undo` + Zod; append `ReconciliationUndone` no outbox

**Checkpoint**: reversibilidade com histórico preservado.

---

## Phase 6: User Story 4 - Conciliação múltipla (1:N) e parcial (Priority: P2)

**Goal**: conciliar N títulos numa transação; tratar diferença (Juros/Multa/Desconto/Tarifa); fechar só com soma = valor (R3).

**Independent Test**: transação R$ 8.450 + título R$ 8.000 + diferença R$ 450 como `Interest` → `Conciliacao` `Partial`, fechamento 100%.

### Tests for User Story 4 (W0 — RED) ⚠️

- [ ] T047 [P] [US4] Teste de domínio `Multiple` (1:N) + `Partial` + invariante R3 (`reconciliation-not-balanced`) + tratamento de diferença em `reconciliation.test.ts`
- [ ] T048 [P] [US4] Teste do `confirmReconciliation` com N títulos + `difference`, e do use-case `searchPaidPayables` em `tests/modules/financial/application/use-cases/`
- [ ] T049 [P] [US4] Teste HTTP `POST /reconciliations` (N + difference, 422 não-balanceado) e `GET /payables?status=Paid` em `financial-reconciliation.http.test.ts`

### Implementation for User Story 4

- [ ] T050 [US4] `Reconciliation`: tipos `Multiple`/`Partial` + invariante R3 (Σ itens + diferença = valor) + `difference` em `src/modules/financial/domain/reconciliation/`
- [ ] T051 [US4] Estender `confirmReconciliation` (N `payableIds` + `difference`) em `application/use-cases/confirm-reconciliation.ts`
- [ ] T052 [US4] Use-case `searchPaidPayables` + impl `PayableLookup.searchPaid`/`openCountBySupplier` nos repos
- [ ] T053 [US4] Rotas: aceitar `payableIds[N]`+`difference` em `POST /reconciliations`; `GET /api/v2/financial/payables?status=Paid&…filtros`

**Checkpoint**: conciliação do mundo real (parcelas, juros, multas).

---

## Phase 7: User Story 5 - Lançamento manual e conciliação em lote (Priority: P3)

**Goal**: lançar transações sem título (tarifas) e confirmar lotes recorrentes; publicar `ManualEntryRecorded`.

**Independent Test**: tarifa R$ 4,90 sem título → lançar como `FeePenaltyInterest` → `ManualEntry` + `Conciliacao` `ManualEntry`, transação `Reconciled`.

### Tests for User Story 5 (W0 — RED) ⚠️

- [ ] T054 [P] [US5] Teste de domínio `ManualEntry` + `Conciliacao` tipo `ManualEntry` em `tests/modules/financial/domain/reconciliation/manual-entry.test.ts`
- [ ] T055 [P] [US5] Teste dos use-cases `recordManualEntry` + `confirmBatch` (outbox `ManualEntryRecorded`) em `tests/modules/financial/application/use-cases/`
- [ ] T056 [P] [US5] Teste HTTP `POST /statement-transactions/:id/manual-entry` + `POST /reconciliations/batch` em `financial-reconciliation.http.test.ts`

### Implementation for User Story 5

- [ ] T057 [US5] `ManualEntry` (boundary) + `Conciliacao` tipo `ManualEntry` em `src/modules/financial/domain/reconciliation/`
- [ ] T058 [US5] Tabela `fin_manual_entries` em `schemas/mysql.ts`
- [ ] T059 [US5] Gerar migration `0007` + CHARSET/COLLATE
- [ ] T060 [US5] Repo de manual entries + use-case `recordManualEntry` em `repos/` e `application/use-cases/record-manual-entry.ts`
- [ ] T061 [US5] Use-case `confirmBatch` (consome `LoteSugerido`) em `application/use-cases/confirm-batch.ts`
- [ ] T062 [US5] Rotas `POST /…/manual-entry` + `POST /reconciliations/batch`; append `ManualEntryRecorded` no outbox

**Checkpoint**: cauda longa (tarifas) coberta.

---

## Phase 8: User Story 6 - Fechamento de período e exportação (Priority: P3)

**Goal**: fechar período (só com tudo conciliado/justificado); bloquear alterações; exportar OFX/CSV; publicar `ReconciliationPeriodClosed`.

**Independent Test**: período todo conciliado → fechar → `ReconciliationPeriodClosed`; nova importação no período → `period-closed`.

### Tests for User Story 6 (W0 — RED) ⚠️

- [ ] T063 [P] [US6] Teste de domínio do período: `close` exige tudo conciliado (`period-has-pending-transactions`); fechado bloqueia (`period-closed`) em `tests/modules/financial/domain/reconciliation/period.test.ts`
- [ ] T064 [P] [US6] Teste dos use-cases `closeReconciliationPeriod` (outbox) e `exportReconciliation` (OFX/CSV) em `tests/modules/financial/application/use-cases/`
- [ ] T065 [P] [US6] Teste HTTP `POST /reconciliation-periods/close` (200/422) + `GET /reconciliation-periods/:id/export?format=ofx|csv` em `financial-reconciliation.http.test.ts`

### Implementation for User Story 6

- [ ] T066 [US6] `ReconciliationPeriod` (domain) + guard `period-closed` aplicável a importar/conciliar/desfazer em `src/modules/financial/domain/reconciliation/`
- [ ] T067 [US6] Tabela `fin_reconciliation_periods` + gerar migration `0008` + CHARSET/COLLATE
- [ ] T068 [US6] Port `ReconciliationPeriodStore` (`isClosed`, `close`) + repos `{in-memory,drizzle}` em `application/ports/` e `adapters/persistence/repos/`
- [ ] T069 [US6] Port `ReconciliationExporter` + adapter OFX/CSV (Node puro, sem lib) em `application/ports/` e `src/modules/financial/adapters/export/`
- [ ] T070 [US6] Use-cases `closeReconciliationPeriod` + `exportReconciliation` em `application/use-cases/`
- [ ] T071 [US6] Rotas `POST /reconciliation-periods/close` + `GET /…/:id/export`; append `ReconciliationPeriodClosed` no outbox

**Checkpoint**: ciclo fechado (selo contábil + relatório).

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T072 [P] Validar `quickstart.md` (fluxo E2E feliz importar → conciliar → desfazer) com `fastify.inject`
- [ ] T073 Gate W3 por ticket: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`; `pnpm run test:integration` cobrindo o **índice único FITID** (descarte na reimportação)
- [ ] T074 [P] Anexar citações canônicas TDD (Beck) e Clean Code (Uncle Bob) no W0/W2 de cada ticket (Princípio IX — fronteiras DDD já citadas em `research.md`)
- [ ] T075 Confirmar **separação de funções** nos testes HTTP: `reconciliation:*` ≠ `payable:transmit` (handbook §2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup. **Bloqueia US1–US6.**
- **US1 (Phase 3)**: depende do Foundational. É o alicerce de dados (transações) para US2–US6.
- **US2 (Phase 4)**: depende do Foundational; consome transações da US1 (testes podem semear). Introduz o agregado `Reconciliation` usado por US3–US6.
- **US3, US4 (Phases 5–6)**: dependem de US2 (agregado `Reconciliation` + transição).
- **US5, US6 (Phases 7–8)**: dependem de US2; US6 introduz o guard de período que afeta US1/US2/US3.
- **Polish (Phase 9)**: depende das stories desejadas.

### Serialização de arquivos compartilhados (NÃO `[P]` entre stories)

`schemas/mysql.ts`, `public-api/events.ts`, `public-api/permissions.ts`,
`adapters/http/{plugin,composition,schemas,error-mapping}.ts` e as **migrations** (`0005`→`0008`,
uma por ticket) são tocados por várias stories → editar em série, na ordem das fases.

### Within Each User Story (TDD W0→W3)

Testes RED (W0) → domínio → ports → adapters/persistência → use-case → borda HTTP → review (W2) →
gate (W3). Migration só após o `schema.ts` da story.

### Parallel Opportunities

- Setup: T001–T003 em paralelo.
- Por story, os testes `[P]` (W0) rodam juntos; VOs/ports em arquivos distintos `[P]` juntos.
- Parsers OFX/CSV/fake (T015–T017) em paralelo.
- Entre stories: **limitado** pela serialização de schema/eventos/HTTP acima — preferir ordem de prioridade.

---

## Parallel Example: User Story 1 (W0 RED)

```bash
# Testes da US1 juntos (todos devem FALHAR antes da impl):
Task: "T007 Teste de domínio BankStatement (dedup FITID) em tests/.../domain/statement/bank-statement.test.ts"
Task: "T008 Teste do VO Fitid em tests/.../domain/statement/fitid.test.ts"
Task: "T009 Testes parsers OFX/CSV em tests/.../adapters/statement-parsers/"
Task: "T010 Teste use-case importBankStatement em tests/.../application/use-cases/import-bank-statement.test.ts"
Task: "T011 Teste HTTP POST /bank-statements em tests/.../adapters/http/financial-reconciliation.http.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Setup + Foundational.
2. US1 (importar) → validar isolada (importação + dedup FITID).
3. US2 (conciliar 1:1 + evento) → **MVP demonstrável**: importar → sugerir → conciliar → `PayableReconciled`.
4. STOP e validar.

### Incremental Delivery (ordem dos tickets)

US1 → US2 → US3 (undo) → US4 (múltiplo/parcial) → US5 (manual/lote) → US6 (período/export). Cada
story é um ticket-grupo W0→W3 com gate verde antes de seguir. Dependência externa: **016** (remessa)
para `fin_cedente_accounts` + título chegando a `Paid` (testes semeiam até a 016 pousar).

---

## Notes

- `[P]` = arquivos distintos, sem dependência pendente. Cuidado com os arquivos compartilhados (serializados).
- TDD não-negociável (constituição I): verificar testes RED antes de implementar.
- Migrations nunca à mão: `pnpm run db:generate`; CHARSET/COLLATE inseridos manualmente; uma por ticket.
- Não misturar módulos na mesma sessão (anti-padrão #4) — tudo aqui é `financial`/`fin_*`.
- Achado fora de escopo → `issue-report` (não consertar no meio; ADR-0040), não perder nem desviar.
