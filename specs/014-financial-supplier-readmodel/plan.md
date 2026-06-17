# Implementation Plan: Financial Supplier Read-Model

**Branch**: `014-financial-supplier-readmodel` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-financial-supplier-readmodel/spec.md`

## Summary

O `financial` passa a resolver nome + CNPJ do fornecedor no grid de Contas a Pagar a partir de uma **cópia local denormalizada** (`fin_supplier_view`), mantida por eventos `SupplierRegistered`/`SupplierEdited` consumidos do `par_outbox` (contrato ADR-0043) — sem chamada cross-módulo síncrona em runtime. A ligação produtor→consumidor fica num **worker dedicado em composition root** (fora dos módulos): lê o `par_outbox` via public-api do `partners` e aplica no `financial` via public-api do `financial` (2 pools; nenhum módulo importa o outro — ADR-0006/0014). Idempotência + resistência a fora-de-ordem por **upsert com guard de `occurred_at`**. Um **backfill one-shot** (ADR-0041) popula a cópia a partir dos fornecedores já existentes. Por fim, a listagem (`GET /api/v2/financial/documents`) é enriquecida com `supplierName`/`supplierDocument` via LEFT JOIN intra-`financial`.

## Technical Context

**Language/Version**: TypeScript 6 / Node.js 24 LTS (ESM, NodeNext) — ADR-0009
**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4 — ADR-0020); Fastify + Zod na borda HTTP (ADR-0027/0033)
**Storage**: MySQL 8.4; nova tabela `fin_supplier_view` (prefixo `fin_*` — ADR-0014)
**Testing**: `node:test` + `--experimental-strip-types`; integração via Docker (`test:integration:financial`)
**Target Platform**: processo único (modular monolith) + workers/jobs dedicados por entrypoint (ADR-0041)
**Project Type**: backend modular monolith
**Performance Goals**: listagem sem N+1 nem chamada cross-módulo (SC-002); consistência eventual em ~1 ciclo de outbox (SC-003)
**Constraints**: isolamento de módulos (ADR-0006/0014); sem JSON nativo/ENUM/trigger (ADR-0020); `document` alfanumérico (ADR-0044)
**Scale/Scope**: cardinalidade de fornecedores modesta (centenas–milhares); read-model leve (1 linha por `supplierRef`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                           | Status | Nota                                                                                                                                                                                                                                        |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                        | ✅     | Cada ticket abre pipeline; W0 RED antes de `src/`.                                                                                                                                                                                          |
| II. Regressão zero                  | ✅     | Gate W3 + integração por ticket.                                                                                                                                                                                                            |
| III. pnpm                           | ✅     | Só pnpm; scripts novos em `package.json`.                                                                                                                                                                                                   |
| IV. Modular Monolith / isolamento   | ✅     | Consumo cross-BC só por eventos (ADR-0015) + public-api (ADR-0006); ligação no composition root (nenhum módulo importa o outro); read-model em `fin_*` (ADR-0014). Toca 2 BCs mas o `partners` **não é alterado** (só lido via public-api). |
| V. Domínio puro                     | ✅     | Read-model não é agregado; aplicação do evento é função pura `Result<T,E>`; sem classes/throw.                                                                                                                                              |
| VI. MySQL+Drizzle, migration gerada | ✅     | `fin_supplier_view` via `schema.ts` + `db:generate`; upsert sem JSON/ENUM.                                                                                                                                                                  |
| VII. HTTP-first                     | ✅     | Enriquece response do grid (sem nova rota); consumo via worker/job (sem CLI embutida).                                                                                                                                                      |
| VIII. TS strict + idioma            | ✅     | EN no código, PT em docs/commits; `import type`, `.ts`, `#src/*`.                                                                                                                                                                           |
| IX. Citação canônica                | ✅     | Decisão-chave (read-model por eventos vs leitura cruzada) citada em `research.md` (Newman, _Building Microservices_).                                                                                                                       |

**Resultado**: PASS. Sem violações → "Complexity Tracking" vazio.

## Project Structure

### Documentation (this feature)

```text
specs/014-financial-supplier-readmodel/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões + citação canônica
├── data-model.md        # Phase 1 — fin_supplier_view + DocumentListItem enriquecido
├── quickstart.md        # Phase 1 — como rodar consumer/backfill + validar o grid
├── contracts/           # Phase 1 — contrato do response DTO + contrato de consumo do evento
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── modules/
│   ├── financial/
│   │   ├── domain/document/query.ts                 # DocumentListItem += supplierName/supplierDocument
│   │   ├── domain/supplier-view/                     # NOVO — tipo read-model + regra de aplicação (pura)
│   │   ├── application/ports/supplier-view-store.ts  # NOVO — port de escrita/leitura do read-model
│   │   ├── adapters/persistence/
│   │   │   ├── schemas/mysql.ts                      # += fin_supplier_view
│   │   │   ├── migrations/mysql/                     # migration gerada
│   │   │   └── repos/supplier-view-store.{drizzle,in-memory}.ts  # NOVO
│   │   ├── adapters/http/{dto.ts,schemas.ts}         # item += supplierName/supplierDocument
│   │   └── public-api/index.ts                      # expõe applySupplierEvent + store factory + openMysqlFinancial
│   └── partners/
│       └── public-api/index.ts                      # expõe o necessário p/ o worker: outbox ops, EventDelivery/ProcessedEvent, runLoop, driver, list de fornecedores p/ backfill
├── workers/
│   └── supplier-view-projection/run.ts              # NOVO — composition root: par_outbox → financial read-model
└── jobs/
    └── financial/supplier-view-backfill/run.ts      # NOVO — one-shot (ADR-0041): partners list → financial read-model

tests/
├── modules/financial/...                            # W0 RED por ticket (store, applyEvent, dto/http)
└── workers/supplier-view-projection/...             # consumer wiring (in-memory)
```

**Structure Decision**: read-model e regra de aplicação ficam **dentro do `financial`** (dono do `fin_*`); a **ligação** com o `par_outbox` fica num **composition root** (`src/workers/…`) que não pertence a nenhum módulo, espelhando como `src/server.ts` compõe módulos. Backfill é job one-shot em `src/jobs/financial/…` (ADR-0041).

## Complexity Tracking

> Sem violações de constituição — seção vazia.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabela nova (`fin_supplier_view`) · [ ] colunas · [x] índice (PK `supplier_ref`) · [ ] FK (sem FK cross-módulo — ADR-0014) · [ ] nenhuma
- **Prefixo de isolamento correto?** `fin_*` — sim (ADR-0014).
- **Outbox**: não emite evento novo (é **consumidor**). Nenhum INSERT em outbox.
- **Comando**: editar `financial/.../schemas/mysql.ts` → `pnpm run db:generate` → versionar a migration gerada.
- **Restrições MySQL 8 (ADR-0020)**: upsert via `INSERT ... ON DUPLICATE KEY UPDATE` (permitido) com guard `occurred_at`; sem JSON nativo (document/name são `varchar`), sem trigger/proc/ENUM.

## Contrato HTTP (Fase 2+)

- **Endpoints alterados**: `GET /api/v2/financial/documents` — cada item do array ganha `supplierName: string | null` e `supplierDocument: string | null`. **Sem** nova rota; **sem** alteração de filtros/paginação.
- **Backward-compat**: adição apenas (FR-008/FR-009). Campos pré-existentes intactos; clientes antigos ignoram os novos.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** — read-model novo + migration + consumer cross-módulo (composition root, 2 pools) + worker + backfill job + enriquecimento de DTO. Fatiado em tickets:
  1. `FIN-SUPPLIER-VIEW-SCHEMA` (M) — schema/migration + port `SupplierViewStore` + repos drizzle/in-memory (upsert idempotente + guard `occurred_at`).
  2. `FIN-SUPPLIER-VIEW-APPLY` (M) — regra pura de aplicação do evento (parse payload, filtro, recência) + `applySupplierEvent` na public-api do `financial`.
  3. `PAR-PUBLIC-API-CONSUMER-SURFACE` (S) — expor no `partners` public-api o necessário p/ o worker (outbox ops/runLoop/EventDelivery/ProcessedEvent/driver) + list de fornecedores p/ backfill.
  4. `WORKER-SUPPLIER-PROJECTION` (M) — composition root `src/workers/supplier-view-projection/run.ts` + script `worker:supplier-projection`.
  5. `FIN-SUPPLIER-VIEW-LIST-DTO` (M) — `findPaged` LEFT JOIN `fin_supplier_view` → `DocumentListItem` += campos → `dto.ts`/`schemas.ts`.
  6. `FIN-SUPPLIER-VIEW-BACKFILL` (M) — job one-shot `src/jobs/financial/supplier-view-backfill/run.ts` + script.
  7. `ADR-0045-CROSS-MODULE-READ-MODEL` (S) — ADR da topologia de consumo + CHANGELOG/README.
- **Justificativa**: cada ticket é independentemente testável (W0 RED próprio) e segue a ordem de dependência abaixo.
- **Plano de testes W0 (RED)** por ticket: ver `tasks.md` (gerado por `/speckit-tasks`).

## Dependências entre tickets

```
SCHEMA ─┬─► APPLY ─┬─► WORKER ──► (consumer vivo)
        │          └─► BACKFILL (usa APPLY + partners list)
        └─► LIST-DTO (lê fin_supplier_view; independe do consumer estar rodando)
PAR-PUBLIC-API-CONSUMER-SURFACE ──► WORKER + BACKFILL
ADR-0045 pode abrir a feature (documenta a topologia antes do código).
```
