# Implementation Plan: Transferência entre contas com contrapartida pendente

**Branch**: `feat/269-transfer-counterpart` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/029-fin-transfer-counterpart/spec.md`

## Summary

Ao conciliar uma transferência A→B (via `record-manual-entry` com `destinationAccountRef`, tipo `Transfer`), criar na conta de destino uma **Contrapartida Esperada** — novo agregado do `financial` (`fin_expected_counterpart`) com ciclo de vida próprio (`Pending → Matched | Discarded`). Ao importar o extrato de B, o motor de sugestão passa a casar **transação real × contrapartida esperada** (valor exato + janela de data, reusando `match-score`); confirmar consome a contrapartida (dedup — sem duplicar) e vincula as duas pernas. Desfazer a origem trata a contrapartida (descarta se Pending, reabre se Matched). Módulo produtor: eventos `TransferCounterpartCreated/Matched/Discarded` via outbox.

**Decisão central (research.md):** a contrapartida é **agregado próprio**, não uma `StatementTransaction` marcada — ela é uma _expectativa_, não um _fato_ de extrato (sem `fitid`), com invariantes/ciclo distintos (Vernon, _IDDD_, p.450 — "Model True Invariants in Consistency Boundaries").

## Technical Context

**Language/Version**: TypeScript 6 · Node.js 24 LTS · ESM (NodeNext)
**Primary Dependencies**: Drizzle + `mysql2` (MySQL 8.4) · Fastify 5 + Zod (borda) · nenhuma nova dependência
**Storage**: MySQL 8.4 — nova tabela `fin_expected_counterpart` (prefixo `fin_*`, ADR-0014/0020)
**Testing**: `node:test` + `--experimental-strip-types` (unit/domínio + application in-memory + HTTP `fastify.inject`); integração Drizzle atrás de `MYSQL_INTEGRATION`
**Target Platform**: processo único (modular monolith), borda HTTP `/api/v2/financial`
**Project Type**: web-service (borda HTTP) — módulo `financial`
**Performance Goals**: N/A (fluxo interativo de conciliação, baixa cardinalidade)
**Constraints**: domínio puro (`Result<T,E>`, sem throw/class); produtor de eventos apenas (outbox-MySQL); ADR-0020 (sem JSON nativo/ENUM/trigger)
**Scale/Scope**: 1 agregado novo + 3 eventos + 1 tabela + extensão de `suggest-matches`/`confirm`/`undo`; **fatiado em 3 tickets por user story**

## Constitution Check

_GATE: passa antes da Fase 0; re-checado após Fase 1._

| Princípio                               | Status | Nota                                                                                                   |
| :-------------------------------------- | :----- | :----------------------------------------------------------------------------------------------------- |
| I. Pipeline W0→W3 fail-first            | ✅     | 3 tickets (US1/US2/US3), cada um W0 RED antes de `src/`                                                |
| II. Regressão zero                      | ✅     | reusa reconciliation/statement; guards de não-regressão no W0 (transferência sem destino segue igual)  |
| III. pnpm único                         | ✅     | sem `npm`; sem nova dependência                                                                        |
| IV. Modular Monolith / isolamento       | ✅     | só `fin_*`; sem cruzar BC; eventos via outbox (produtor)                                               |
| V. Domínio puro                         | ✅     | novo agregado = funções + `Readonly` + smart constructor + `Result`; status = union EN kebab           |
| VI. MySQL 8 + Drizzle, migration gerada | ✅     | `fin_expected_counterpart` via `db:generate`; movement/status = `varchar` (não ENUM), cents = `bigint` |
| VII. HTTP-first, CLI aposentada         | ✅     | evolui rotas de conciliação existentes (Fastify+Zod); sem CLI nova                                     |
| VIII. TS strict + idioma                | ✅     | `import type`, `.ts`, `#src/*`; código EN, docs/commits PT                                             |
| IX. Citação canônica das decisões-chave | ✅     | fronteira de agregado citada (Vernon, p.450) — ver research.md                                         |

**Sem violações → sem Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/029-fin-transfer-counterpart/
├── plan.md              # este arquivo
├── spec.md              # specify + clarify (feito)
├── research.md          # Fase 0 — decisão de modelagem + citação
├── data-model.md        # Fase 1 — agregado, tabela, eventos, matching
├── quickstart.md        # Fase 1 — como exercitar via HTTP
├── contracts/
│   └── http.md          # Fase 1 — deltas de rota/schema
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/
│   ├── expected-counterpart/            # NOVO agregado
│   │   ├── expected-counterpart.ts      # create/match/discard (Result)
│   │   ├── expected-counterpart-id.ts   # branded id
│   │   ├── types.ts                     # ExpectedCounterpart, status, errors
│   │   └── events.ts                    # TransferCounterpartCreated/Matched/Discarded
│   └── reconciliation/                  # reuso (match-score, undo)
├── application/
│   ├── use-cases/
│   │   ├── record-manual-entry.ts       # US1: cria contrapartida quando type=Transfer + destino
│   │   ├── suggest-matches.ts           # US2: + transação×contrapartida
│   │   ├── confirm-reconciliation.ts    # US2: confirma par → consome contrapartida (dedup)
│   │   └── undo-reconciliation.ts       # US3: trata contrapartida (discard/reopen)
│   └── ports/
│       └── expected-counterpart-store.ts  # NOVO port
└── adapters/
    ├── persistence/
    │   ├── schemas/mysql.ts             # + fin_expected_counterpart
    │   └── repos/expected-counterpart-store.{drizzle,in-memory}.ts
    └── http/                            # suggestions/confirm/undo DTO + schema deltas

tests/modules/financial/                 # espelho: domain + application(in-memory) + http(inject)
```

**Structure Decision**: módulo `financial` existente; novo sub-agregado `expected-counterpart/` no domínio + 1 port + 2 adapters (drizzle/in-memory), reusando reconciliation/statement/cedente. Nenhum módulo novo.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabela nova `fin_expected_counterpart` · [x] índices (por `destination_account_ref` + `status`; e por `origin_reconciliation_ref`) · [x] FKs lógicas (refs a `fin_cedente_accounts` / reconciliation)
- **Prefixo de isolamento**: `fin_*` (ADR-0014) — sim.
- **Outbox**: sim — os 3 eventos novos exigem `INSERT` em `core.outbox` na mesma tx (ADR-0015).
- **Comando**: editar `schemas/mysql.ts` → `pnpm run db:generate` → versionar migration.
- **Restrições MySQL 8 (ADR-0020)**: `movement`/`status`/`type` = `varchar` (sem ENUM); cents = `bigint`; datas decompostas; sem JSON/trigger/proc.

## Contrato HTTP (Fase 2+)

Ver [contracts/http.md](./contracts/http.md). Resumo:

- `record-manual-entry` (POST existente): comportamento estendido — cria a contrapartida quando `type=Transfer` + `destinationAccountRef` (sem novo campo de request).
- `get-statement-suggestions` / `suggest-matches`: response passa a incluir sugestões do tipo **contrapartida** (novo `kind`), rotuladas com a conta de origem.
- `confirm-reconciliation`: aceita confirmar um par transação×contrapartida.
- `undo-reconciliation`: efeito colateral de tratar a contrapartida.
- Backward-compat: transferência sem destino, e o casamento transação×título atual, seguem idênticos.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** — agregado novo + tabela + 3 eventos + outbox + extensão do motor de sugestão + borda.
- **Fatiamento (1 módulo/sessão, 3 tickets):**
  - **FIN-COUNTERPART-CREATE** (US1) — agregado + tabela/migration + `record-manual-entry` cria a contrapartida + evento Created.
  - **FIN-COUNTERPART-MATCH** (US2) — `suggest-matches` transação×contrapartida + confirm consome (dedup) + vínculo + evento Matched.
  - **FIN-COUNTERPART-UNDO** (US3) — undo-origin descarta/reabre a contrapartida + evento Discarded.
- **Plano de testes W0 (RED) — por ticket:**
  - US1: `expected-counterpart.test.ts` (create/opposite-sign/link) + `record-manual-entry` cria contrapartida (in-memory) + guard "sem destino → não cria".
  - US2: `suggest-matches` sugere transação×contrapartida (valor exato + janela) + `confirm` consome (dedup: 0 duplicata) + vínculo A↔B.
  - US3: `undo-reconciliation` descarta contrapartida Pending / reabre Matched.

## Complexity Tracking

N/A — Constitution Check sem violações.
