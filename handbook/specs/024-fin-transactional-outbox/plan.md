# Implementation Plan: Outbox transacional do Financeiro (atomicidade estado+evento)

**Branch**: `024-fin-transactional-outbox` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-fin-transactional-outbox/spec.md`

## Summary

O Financeiro persiste estado e enfileira evento em **duas operações separadas** (`repo.save(...)` commita; depois `outbox.append(...)` numa tx separada — `save-document.ts:151/156` e análogos), e o outbox é **in-memory mesmo no driver MySQL** (`composition.ts:340` `createInMemoryOutbox()`). Um crash entre os passos perde o evento (dual-write, #127/ADR-0015).

**Abordagem (clarify + discussão de especialistas)**: introduzir a tabela **`fin_outbox`** (espelhando `ctr_outbox`) e gravar estado **+** INSERT no outbox dentro de **uma única `db.transaction`**, em **dois repos** (DocumentRepository.save; ReconciliationRepository.confirm/confirmManualEntry/undo). Os use-cases passam os eventos **para dentro** da operação do repo (como `contracts` faz), que chama o helper `appendFinOutboxInTx` na sua tx — eliminando o `outbox.append` separado. Conformidade com ADR-0015; **sem novo ADR**.

## Technical Context

**Language/Version**: TypeScript 6 (strict) · Node.js 24 LTS · ESM `NodeNext`.

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4); `node:test`. Padrão de referência: `contracts/adapters/persistence/repos/outbox-repository.drizzle.ts` (`appendOutboxInTx`) + `schemas/mysql.ts` (`ctrOutbox`).

**Storage**: MySQL 8 — **nova tabela `fin_outbox`** (prefixo `fin_`, ADR-0014) via **migration Drizzle** (achado de recon: não existe). Espelha `ctr_outbox`: `event_id` char(36) PK (idempotência), `aggregate_id`, `aggregate_type`(+CHECK), `event_type`(+CHECK nonempty), `schema_version`, `occurred_at`, `enqueued_at`, `processed_at` nullable, `attempts`, `payload` **varchar(8192)** (não JSON — ADR-0020), index `(processed_at, occurred_at)` + `(aggregate_id)`.

**Testing**: `node:test`. Unit (repos in-memory com outbox in-memory). **Integração drizzle-mysql** (Docker): injeta falha entre estado e outbox e confirma `COUNT(agregado)` e `COUNT(fin_outbox)` == baseline (rollback total) — CA2/CA3.

**Target Platform**: backend modular-monolith.

**Project Type**: modular monolith backend (ADR-0006).

**Performance Goals**: 1 INSERT a mais na tx existente (baixo volume OLTP). PK `event_id` UUID v4 — page splits negligíveis na escala do outbox.

**Constraints**: ADR-0015 (outbox: atomicidade via tx, durabilidade via tabela, idempotência via PK). ADR-0020 (payload varchar, sem JSON nativo; sem `ON DUPLICATE KEY UPDATE`). ADR-0014 (`fin_*`). ADR-0006 (1 BC).

**Scale/Scope**: 1 migration + 1 schema entry + 1 helper + 2 repos (DocumentRepository + ReconciliationRepository) + ~9 use-cases (7 documento + confirm/confirmManualEntry/undo conciliação) + adapters in-memory (paridade) + testes. Tamanho **L**.

## Constitution Check

| Princípio                            | Status | Nota                                                                                                                           |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| I. TDD W0→W3 fail-first              | ✅     | W0 RED: teste que injeta falha no outbox e prova rollback (hoje estado persiste + evento órfão/perdido).                       |
| II. Regressão zero                   | ✅     | Gate W3 + integração (Docker).                                                                                                 |
| III. pnpm único                      | ✅     | Sem deps novas.                                                                                                                |
| IV. Modular monolith + isolamento    | ✅     | Só `fin_*`. Tabela `fin_outbox` no prefixo do módulo (ADR-0014).                                                               |
| V. Domínio puro                      | ✅     | Eventos já são do domínio; a mudança é na fronteira transacional do adapter/use-case. Sem `throw` no domínio.                  |
| VI. MySQL/Drizzle migrations geradas | ✅     | **Migration nova** (`fin_outbox`) via `pnpm run db:generate` após editar `schema.ts`. Sem JSON/ENUM/AUTO_INCREMENT (ADR-0020). |
| VII. HTTP-first; CLI aposentada      | ✅     | Sem rota nova; mudança interna. Validação por teste (sem CLI).                                                                 |
| VIII. TS strict + ESM + idioma       | ✅     | EN; `import type`; `.ts`.                                                                                                      |
| IX. Decisões ancoradas no cânone     | ✅     | Decisão de escopo por discussão de 3 especialistas; citações Vernon:7562 / Newman:2966 — ver [research.md](./research.md).     |

**Resultado**: PASS. `Complexity Tracking` vazio (a tabela nova é conformidade com ADR-0015, não exceção).

## Project Structure

### Documentation (this feature)

```text
specs/024-fin-transactional-outbox/
├── plan.md · spec.md (+Clarifications) · research.md · data-model.md · quickstart.md
├── contracts/outbox-atomic-append.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/financial/
├── adapters/persistence/schemas/mysql.ts             # (W1) + tabela finOutbox (espelha ctrOutbox)
│   └── migrations/mysql/00NN_*.sql                    # (W1) migration gerada (db:generate)
├── adapters/persistence/repos/
│   ├── fin-outbox-helpers.ts                          # (W1, NOVO) appendFinOutboxInTx(tx, events) + event→row
│   ├── document-repository.drizzle.ts                # (W1) save() recebe events; appendFinOutboxInTx na sua tx
│   ├── document-repository.in-memory.ts              # (W1) paridade: save() recebe events → outbox in-memory
│   ├── reconciliation-repository.drizzle.ts          # (W1) confirm/confirmManualEntry/undo recebem events
│   └── reconciliation-repository.in-memory.ts        # (W1) paridade
├── domain/document/repository.ts                      # (W1) assinatura do port save() ganha events
├── application/ports/ (reconciliation-repository.ts)  # (W1) assinaturas confirm/undo ganham events
├── application/use-cases/                             # (W1) 7 documento + 3 conciliação: passam events ao repo; removem outbox.append
└── adapters/http/composition.ts                       # (W1) mysql: outbox via fin_outbox (repo); memory: outbox in-memory no repo

tests/modules/financial/adapters/persistence/
├── *outbox*.in-memory.test.ts                         # (W0) helper + rollback in-memory (simula falha)
└── *outbox*.drizzle-mysql.test.ts                     # (W0) integração: falha no outbox → COUNT==baseline (Docker)
```

**Structure Decision**: espelha `contracts` (events threaded para dentro do repo; `appendOutboxInTx` na tx). Dois repos (document + reconciliation) compartilham o helper `appendFinOutboxInTx`. A tabela `fin_outbox` mora no schema do módulo financial.

## Complexity Tracking

> Sem violações. A tabela `fin_outbox` é conformidade com ADR-0015 (não exceção a justificar).

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **tabela nova** (`fin_outbox`) · [ ] colunas · [x] índices (`(processed_at, occurred_at)`, `(aggregate_id)`)
- **Prefixo de isolamento**: `fin_` (ADR-0014) ✅
- **Outbox**: esta feature É o outbox — INSERT em `fin_outbox` dentro da tx do estado.
- **Comando**: editar `schema.ts` → `pnpm run db:generate` → versionar a migration. Espelhar `ctrOutbox` (char(36) PK, payload varchar(8192), CHECKs, índice unprocessed). Sem JSON/ENUM/AUTO_INCREMENT (ADR-0020).
- **DLQ (`fin_outbox_failed`)**: **fora do escopo** — é concern do worker (entrega), que a spec excluiu. Adiar.

## Contrato HTTP (Fase 2+)

**N/A** — sem rota nova nem mudança de contrato. A garantia é interna (durabilidade atômica). As respostas das operações são idênticas no caminho de sucesso (FR-007). Ver [contracts/outbox-atomic-append.md](./contracts/outbox-atomic-append.md) (contrato interno: append atômico + semântica de falha).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** (migration + 2 repos + ~9 use-cases + helper + adapters in-memory + integração). Ticket `FIN-OUTBOX-ATOMIC` (fatiável: A) `fin_outbox` + helper + DocumentRepository (7 use-cases); B) ReconciliationRepository (3 use-cases)).
- **Justificativa**: 2 repos com tx própria + threading de eventos por 9 use-cases + migration + teste de integração com injeção de falha. O padrão existe (contracts) mas a superfície é grande.
- **Plano de testes W0 (RED)**:
  1. **Helper/rollback in-memory**: um adapter de outbox in-memory que **falha** no append → `repo.save(agg, entries, events)` deve reverter (estado não persiste) e retornar slug de erro (CA1/CA3). RED: hoje não há `save`-com-eventos-na-tx.
  2. **Integração drizzle-mysql** (Docker): com um `fin_outbox` cujo INSERT é forçado a falhar (ex.: payload > limite / violação de CHECK) dentro da tx → `COUNT(fin_documents)` e `COUNT(fin_outbox)` == baseline; o caminho feliz grava ambos (CA2). RED: hoje o append é fora da tx (e o outbox nem é MySQL).
  3. Idem para a conciliação (confirm/undo): falha no outbox reverte o flip de `fin_payables` (CA2 na conciliação).
