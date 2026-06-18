# Implementation Plan: Conciliação Bancária (módulo Financeiro)

**Branch**: `017-fin-conciliacao-bancaria` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-fin-conciliacao-bancaria/spec.md`

## Summary

Entregar o **Submódulo Conciliação Bancária** (BC Core ⭐) **completo** (US1–US6) no módulo
`financial`: importar extrato **OFX/CSV** (parser à mão, sem lib) com anti-duplicidade por **FITID**
(nativo no OFX, sintético no CSV); **sugerir** match por score determinístico (read-model) sem nunca
conciliar sozinho (R1); **conciliar** Individual/Múltiplo/Parcial com tratamento de diferença e
fechamento 100% (R3); **lançamento manual** (tarifas) e **lote**; **desfazer** (Unreconcile)
preservando histórico (R7); **fechar período** e **exportar** (OFX/CSV). Transiciona títulos
`Paid→Reconciled` (e volta) na mesma transação, e **publica** os eventos cross-módulo no outbox
(`PayableReconciled`, `ReconciliationUndone` — **só produtor**). Borda **HTTP** `/api/v2/financial/...`
(Fastify+Zod). Decisões em [research.md](./research.md); modelo em [data-model.md](./data-model.md).

## Technical Context

**Language/Version**: TypeScript 6 · Node.js 24 LTS · ESM (NodeNext)
**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4) · `node:crypto` (FITID sintético/hash) ·
Fastify + Zod (borda, ADR-0027/0033) · `node:test`. **Sem dependência nova** (OFX/CSV parser à mão —
D-FORMATS, ADR-0011).
**Storage**: MySQL 8 (`fin_*`) — extratos, transações, conciliações, itens, lançamentos manuais,
períodos, rejeições. Sem object-storage nesta feature (export é resposta HTTP, não persistida).
**Testing**: `node:test` + `fastify.inject` (borda) + Drizzle MySQL real (`pnpm run test:integration`,
inclui índice único FITID).
**Target Platform**: backend (modular monolith), módulo `financial`.
**Project Type**: módulo de BC único (`financial`) — **sem novo módulo** (Orçamento NÃO é criado aqui).
**Performance Goals**: importação = dezenas–centenas de transações/arquivo, síncrona ≤ poucos segundos;
sugestão de match é read sob demanda (sem job).
**Constraints**: R1 (nunca automático) · R2 (só `Paid`) · R3 (fechamento 100%) · R5 (FITID único) ·
R7 (desfazer preserva histórico). Sem JSON/ENUM/trigger (ADR-0020).
**Scale/Scope**: N contas-cedente; múltiplos períodos; BC completo em 8 tickets W0→W3.

**Resolvido no Phase 0 (research.md)**: formatos sem-lib (D-FORMATS), FITID nativo/sintético
(D-FITID), fronteiras de agregado (D-AGGREGATES), score/sugestão read-model (D-MATCH), transição
`Paid↔Reconciled` na mesma tx (D-TRANSITION), eventos EN produtor-only (D-EVENTS), tabelas `fin_*`
(D-PERSIST), borda v2 (D-HTTP), dependência de 016/`Paid` (D-DEP).

## Constitution Check

_GATE: avaliado contra a constituição v1.2.0 (princípios I–IX)._

| Princípio                                 | Status | Nota                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                              | ✅     | Roda por tickets; W0 RED antes de `src/`. Ver "Estimativa de Pipeline".                                                                                                                                                                                                                                                                   |
| II. Regressão zero                        | ✅     | Gate W3 + `test:integration` antes de merge.                                                                                                                                                                                                                                                                                              |
| III. pnpm                                 | ✅     | Sem `npm`. Sem dependência nova (parser à mão).                                                                                                                                                                                                                                                                                           |
| IV. Modular monolith / isolamento         | ✅     | Toca **apenas** `financial` (`fin_*`). `payable_id`/`debit_account_ref` são refs lógicas. Cross-módulo só por evento (outbox, produtor). **Não** cria Orçamento.                                                                                                                                                                          |
| V. Domínio puro                           | ✅     | Agregados `BankStatement`/`Reconciliation` + VOs (`Fitid`, `MatchScore`) com `Result<T,E>`, sem `throw`/classe. Parsing OFX/CSV vive no **adapter**.                                                                                                                                                                                      |
| VI. MySQL 8 + Drizzle, migrations geradas | ✅     | Tabelas via `pnpm run db:generate`. Índice único FITID, CHECK enums. Sem JSON/ENUM nativo/trigger.                                                                                                                                                                                                                                        |
| VII. HTTP-first                           | ✅     | Rotas `/api/v2/financial/...` (Fastify+Zod) cobrindo importar/sugerir/conciliar/desfazer/manual/lote/fechar/exportar.                                                                                                                                                                                                                     |
| VIII. TS strict + idioma                  | ✅     | EN no código; eventos EN-passado; erros kebab-case EN; docs/commits PT.                                                                                                                                                                                                                                                                   |
| IX. Citação canônica ACDG                 | ✅     | MCP `acdg-skills` **ON**. D-AGGREGATES ancorada em Vernon p. 458 (_Reference Other Aggregates by Identity_) + p. 446 (small aggregates); D-TRANSITION em Vernon p. 450 (_Model True Invariants in Consistency Boundaries_). Citações literais em [research.md](./research.md). Restam citações de TDD/Clean Code no W0/W2 de cada ticket. |

**Resultado**: PASS — sem violação arquitetural e sem pendência de processo (citações de fronteira/
consistência já anexadas). Sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/017-fin-conciliacao-bancaria/
├── plan.md              # este arquivo
├── research.md          # Phase 0 — D-FORMATS, D-FITID, D-AGGREGATES, D-MATCH, D-TRANSITION, D-EVENTS, D-PERSIST, D-HTTP, D-DEP
├── data-model.md        # Phase 1 — agregados, VOs, transições, tabelas fin_*
├── quickstart.md        # Phase 1 — como rodar/testar
└── contracts/
    ├── http-reconciliation.md   # endpoints /api/v2/financial/... + schemas/erros
    └── ports.md                 # BankStatementParser, *Repository, PayableLookup, PeriodStore, Exporter
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/
│   ├── payable/                  # EXISTE — + transições reconcile()/unreconcile() (Paid↔Reconciled)
│   ├── statement/                # NOVO — agregado BankStatement + StatementTransaction; VO Fitid; import dedup (puro)
│   └── reconciliation/           # NOVO — agregado Reconciliation + ReconciliationItem + ManualEntry; VO MatchScore; score (puro); events/errors
├── application/
│   ├── ports/                    # NOVO: bank-statement-parser, bank-statement-repository, reconciliation-repository, payable-lookup, reconciliation-period-store, reconciliation-exporter
│   └── use-cases/                # NOVO: import-bank-statement, suggest-matches, confirm-reconciliation, reject-suggestion, undo-reconciliation, record-manual-entry, confirm-batch, close-period, export-reconciliation, search-paid-payables
├── adapters/
│   ├── persistence/
│   │   ├── schemas/mysql.ts      # + fin_bank_statements, fin_statement_transactions, fin_reconciliations, fin_reconciliation_items, fin_manual_entries, fin_reconciliation_periods, fin_rejected_suggestions
│   │   ├── migrations/mysql/     # 0005+ geradas por db:generate (uma por ticket)
│   │   └── repos/                # *-repository.{in-memory,drizzle}.ts
│   ├── statement-parsers/        # NOVO — ofx-parser.ts, csv-parser.ts (Node puro), fake-parser.ts
│   ├── export/                   # NOVO — ofx/csv exporter (sem lib)
│   └── http/                     # + rotas, schemas Zod, error-mapping, composition (wiring)
└── public-api/
    ├── events.ts                 # + PayableReconciled, ReconciliationUndone, BankStatementImported, ManualEntryRecorded, ReconciliationPeriodClosed
    └── permissions.ts            # + reconciliation:{import,read,reconcile,undo,close}

tests/modules/financial/
├── domain/{statement,reconciliation}/*.test.ts
├── adapters/statement-parsers/{ofx,csv}-parser.test.ts
├── application/use-cases/*.test.ts
└── adapters/http/financial-reconciliation.http.test.ts
```

**Structure Decision**: módulo `financial` (BC único). Dois novos subdomínios (`statement/`,
`reconciliation/`) + parsers e exporter em `adapters/`. Reusa `Clock`/`IdGenerator`/outbox do
financial. **Não** importa adapter de outro módulo (ADR-0006).

## Complexity Tracking

> Sem violações de constituição a justificar. (A pendência IX é de processo, não de arquitetura.)
> A amplitude (BC completo) é gerida por **fatiamento em 8 tickets**, não por exceção arquitetural.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] 7 tabelas novas (`fin_bank_statements`, `fin_statement_transactions`,
  `fin_reconciliations`, `fin_reconciliation_items`, `fin_manual_entries`,
  `fin_reconciliation_periods`, `fin_rejected_suggestions`) · [x] índice **único** `(debit_account_ref,
fitid)` · [x] FKs ON DELETE CASCADE intra-boundary · [ ] nenhuma alteração no enum de
  `fin_payables.status` (já aceita `Reconciled`).
- **Prefixo de isolamento correto?** `fin_*` — ADR-0014: **sim**.
- **Outbox**: novos eventos → `append` no outbox do financial: **sim** (`PayableReconciled`,
  `ReconciliationUndone`, `BankStatementImported`, `ManualEntryRecorded`, `ReconciliationPeriodClosed`).
- **Comando**: `pnpm run db:generate` por ticket (migrations `0005+`, **serializadas após a 0004 da
  016** — D-DEP; uma por ticket, lição PRs #83–86). CHARSET/COLLATE à mão na migration.
- **Restrições MySQL 8** (ADR-0020): sem JSON/ENUM/trigger/stored proc. Anti-dup por índice único +
  dedup no app (conta duplicatas); transição `Paid↔Reconciled` + criação da conciliação na mesma tx
  (`db.transaction`).

## Contrato HTTP

Detalhe em [contracts/http-reconciliation.md](./contracts/http-reconciliation.md). Resumo:

- **US1**: `POST /bank-statements`, `GET /bank-statements/:id/transactions`.
- **US2**: `GET /statement-transactions/:id/suggestions`, `POST /reconciliations`, `POST
/statement-transactions/:id/reject-suggestion`.
- **US3**: `POST /reconciliations/:id/undo`.
- **US4**: `POST /reconciliations` (N títulos + `difference`), `GET /payables?status=Paid`.
- **US5**: `POST /statement-transactions/:id/manual-entry`, `POST /reconciliations/batch`.
- **US6**: `POST /reconciliation-periods/close`, `GET /reconciliation-periods/:id/export`.
- Permissões novas `reconciliation:*` (separação de funções vs `payable:transmit`). Aditivo; nenhuma
  rota existente muda.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** (2 agregados novos + transição em agregado existente + parsers + 7 tabelas +
  outbox + borda HTTP, cobrindo US1–US6).
- **Justificativa**: BC inteiro. **Fatiar em 8 tickets W0→W3** (serializados; cada um com sua migration):
  1. `FIN-RECON-STATEMENT-DOMAIN` (M) — agregado `BankStatement` + `StatementTransaction` + VO `Fitid`
     (nativo/sintético) + lógica de dedup + evento `BankStatementImported`. Puro.
  2. `FIN-RECON-PARSERS` (M) — port `BankStatementParser` + `ofx-parser`/`csv-parser` (Node puro) +
     fake; testes de estrutura + FITID sintético no CSV.
  3. `FIN-RECON-STATEMENT-PERSIST-HTTP` (M) — `fin_bank_statements`/`fin_statement_transactions` +
     migration `0005` + repos Drizzle/InMemory + **índice único FITID** + `importBankStatement` +
     rota `POST /bank-statements` + `GET .../transactions`.
  4. `FIN-RECON-MATCH` (M) — VO `MatchScore` + função de score (pura) + `suggestMatches` (read) +
     `rejectSuggestion` + `fin_rejected_suggestions` + endpoints de sugestão/rejeição.
  5. `FIN-RECON-CORE-DOMAIN` (M) — agregado `Reconciliation` + `ReconciliationItem` +
     `payable.reconcile()/unreconcile()` + Individual/Múltiplo/Parcial + invariante R3 + eventos
     `PayableReconciled`/`ReconciliationUndone`. Puro.
  6. `FIN-RECON-CORE-PERSIST-HTTP` (L) — `fin_reconciliations`/`fin_reconciliation_items` + migration
     `0006` + repos + `confirmReconciliation`/`undoReconciliation` (tx única + outbox) + rotas
     `POST /reconciliations`, `POST /reconciliations/:id/undo`, `GET /payables?status=Paid` + E2E.
  7. `FIN-RECON-MANUAL-BATCH` (M) — `fin_manual_entries` + migration `0007` + `recordManualEntry` +
     `confirmBatch` (LoteSugerido) + `ManualEntryRecorded` + endpoints.
  8. `FIN-RECON-PERIOD-EXPORT` (M) — `fin_reconciliation_periods` + migration `0008` + `closePeriod`
     (`period-has-pending`) + `ReconciliationPeriodClosed` + `exportReconciliation` (OFX/CSV) + endpoints.
- **Plano de testes W0 (RED)** (por ticket):
  - `domain/statement/bank-statement.test.ts` — dedup por FITID (descarte silencioso + contagem),
    atomicidade, FITID sintético do CSV.
  - `adapters/statement-parsers/{ofx,csv}-parser.test.ts` — parsing de exemplos + normalização de tipo.
  - `domain/reconciliation/reconciliation.test.ts` — R3 (fechamento 100%), tipos
    Individual/Múltiplo/Parcial, `reconcile`/`unreconcile`, recusa de título não-`Paid` (R2),
    preservação no desfazimento (R7).
  - `application/use-cases/*.test.ts` — importar, confirmar (R1: confirmação manual), desfazer,
    parcial/múltiplo, manual/lote, fechar período (`period-has-pending`).
  - `adapters/http/financial-reconciliation.http.test.ts` — `/api/v2/financial/...` (201/204/409/422),
    separação de funções (permissões).
  - **Outbox**: assert de `PayableReconciled`/`ReconciliationUndone` enfileirados na tx de confirmar/desfazer.

## Dependências e riscos (D-DEP)

- **Depende da 016** (`fin_cedente_accounts` + título chegando a `Paid`). Recomenda-se **mergear 016
  antes** dos tickets de persistência (3, 6) para a `debit_account_ref` ter destino físico. Enquanto
  isso, tickets de domínio (1, 5) e parsers (2) avançam sem bloqueio; testes semeiam `Paid`/conta.
- **Princípio IX** (citações ACDG): ✅ D-AGGREGATES/D-TRANSITION já ancoradas (Vernon p. 458/450 —
  research.md). Restam citações de TDD/Clean Code no W0/W2 de cada ticket.
- **Próximo passo**: `/speckit-tasks` para gerar `tasks.md` a partir deste plano (e, opcionalmente,
  `/speckit-taskstoissues` para abrir os 8 tickets como sub-issues do épico Financeiro #64).
