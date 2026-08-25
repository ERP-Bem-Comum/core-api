# Implementation Plan: Partners — outbox de eventos de fornecedor

**Branch**: `013-partners-supplier-outbox` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-partners-supplier-outbox/spec.md`

## Summary

Habilitar o `partners` a **publicar eventos de fornecedor via outbox** (ADR-0015), **replicando** o padrão consolidado do `contracts` (`ctr_outbox` + worker), com prefixo `par_*`. Publica `SupplierRegistered` (cadastro) e `SupplierEdited` (toda edição) com **payload de integração autocontido** (`supplierRef`, `name`, `document`/CNPJ, `occurredAt`). É o pré-requisito #92 da US2 da #47 (read-model de fornecedor no `financial`).

**Escopo = produtor.** O consumer/read-model no `financial` é a feature seguinte (US2). A entrega usa o `EventDelivery` (logger, como o `contracts` hoje) — o roteamento real ao consumidor é definido na US2.

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM, NodeNext) · Node.js 24 LTS

**Primary Dependencies**: Drizzle ORM + `mysql2` (outbox + repo); `node:test`; worker standalone (`node` + `--experimental-strip-types`)

**Storage**: MySQL 8.4 (ADR-0020) — novas tabelas `par_outbox` + `par_outbox_dead_letter` (prefixo `partners_*`/`par_*`); payload em `varchar(8192)` via `JSON.stringify` (sem JSON nativo)

**Testing**: `node:test` (unit/contrato) + integração MySQL (`pnpm run test:integration:partners`)

**Target Platform**: servidor Linux; worker de publicação como processo (espelha `worker:outbox` do contracts)

**Project Type**: web-service (modular monolith, módulo `partners`)

**Performance Goals**: N/A — volume de eventos de fornecedor é baixo; worker com backoff (poll/idle) como o `contracts`

**Constraints**: comunicação cross-BC só por eventos/outbox (ADR-0006/0015); não tocar `financial`/`contracts`/`auth`; não há FK física entre `par_outbox` e consumidores (ADR-0014)

**Scale/Scope**: replicação do outbox do `contracts` no `partners` + evolução do `save` do supplier + 2 use cases + mapper de payload + 1 migration + ADR

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                              | Status | Nota                                                                                                                                                                       |
| -------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — TDD W0→W3                          | ✅     | Tickets com W0 RED (outbox append na tx; eventos publicados com payload).                                                                                                  |
| II — Regressão zero                    | ✅     | Suíte ≥ baseline; o `save` do supplier evolui sem quebrar os fluxos atuais.                                                                                                |
| III — pnpm                             | ✅     | Migration via `pnpm run db:generate:partners`; nenhum `npm`.                                                                                                               |
| IV — Isolamento por BC                 | ✅     | Só `partners` produz; o `financial` consome via outbox (ADR-0015) — sem leitura cruzada de tabelas.                                                                        |
| V — Domínio puro                       | ✅     | Payload de integração montado no **adapter** (Opção A) — não toca o domínio do supplier; eventos seguem string-literal union.                                              |
| VI — MySQL + Drizzle, migration gerada | ✅     | `par_outbox`/`par_outbox_dead_letter` via migration; sem JSON/trigger/proc/ENUM nativo (payload em `varchar`).                                                             |
| VII — HTTP-first                       | ✅     | Sem nova rota; eventos nascem nos use cases de escrita já existentes. Worker é processo (como contracts).                                                                  |
| VIII — TS strict + idioma              | ✅     | Eventos EN-passado; outbox em EN; sem `any`.                                                                                                                               |
| IX — Citação canônica                  | ⚠️     | Decisões-chave (outbox/at-least-once; payload de integração vs evento de domínio) exigem citação (Vernon _Implementing DDD_ Domain Events; ADR-0015) no W2 de cada ticket. |

**Resultado**: sem violações. Outbox é o padrão **prescrito** (ADR-0015) — replicar, não inventar.

## Project Structure

### Documentation (this feature)

```text
specs/013-partners-supplier-outbox/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/README.md        # contrato de evento partners → financial
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/partners/
├── application/ports/outbox.ts                         # NOVO — OutboxPort + WorkerOutboxOps (espelha contracts)
├── adapters/persistence/
│   ├── schemas/mysql.ts                                # + par_outbox, par_outbox_dead_letter
│   ├── mappers/outbox.mapper.ts                        # NOVO — evento+agregado → row (payload integração)
│   ├── repos/outbox-repository.{drizzle,in-memory}.ts  # NOVO — append + worker ops
│   └── repos/supplier-repository.drizzle.ts            # save(supplier, events) + db.transaction + appendOutboxInTx
├── application/use-cases/{register-supplier,edit-supplier}.ts  # passam o evento ao save
└── worker/{outbox-worker,config,run}.ts                # NOVO — copiado/adaptado do contracts

handbook/architecture/                                  # ADR/contrato de evento partners → financial
package.json                                            # + "worker:outbox:partners"
```

**Structure Decision**: replicação do outbox do `contracts` dentro de `src/modules/partners/`. Não toca outros módulos.

## Complexity Tracking

> Sem violações. A "duplicação" do outbox (vs extrair um pacote compartilhado) é deliberada: ADR-0014 isola por BC; um pacote shared de outbox seria refactor à parte (fora do escopo).

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabelas novas (`par_outbox`, `par_outbox_dead_letter`) · [ ] colunas · [x] índices (processed_at/occurred_at; aggregate_id) · [x] CHECK (`aggregate_type IN ('Supplier')`, `attempts >= 0`)
- **Prefixo de isolamento**: `par_*`/`partners_*` (ADR-0014).
- **Comando**: editar `schemas/mysql.ts` → `pnpm run db:generate:partners` → versionar `migrations/mysql/0009_*.sql`. Inserir CHARSET/COLLATE manual se Drizzle não emitir (limitação conhecida).
- **Restrições MySQL 8** (ADR-0020): payload em `varchar(8192)` (não JSON); sem trigger/proc/ENUM nativo.

## Contrato de evento (partners → financial)

Ver [`contracts/README.md`](./contracts/README.md). `SupplierRegistered` e `SupplierEdited`, payload `{ supplierRef, name, document, occurredAt }`. Registrar em **ADR + handbook** (FR-007). At-least-once + idempotência por `event_id`.

## Estimativa de Pipeline (W0 size)

| Ticket (sugestão)     | User Story | Size  | Justificativa                                                                                                             | W0 RED                                                                                                                                |
| --------------------- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `PAR-OUTBOX-INFRA`    | US1        | **M** | replica schema + port + adapters + worker do contracts (muito copiável); migration `par_outbox`/dead-letter               | contrato de outbox (append na tx atômico; worker marca processed/dead-letter; idempotência) — InMemory + integração MySQL             |
| `PAR-SUPPLIER-EVENTS` | US2        | **M** | `save(supplier, events)` + `db.transaction` + mapper de payload; use cases register/edit passam o evento; ADR de contrato | cadastro/edição publica evento com `supplierRef`/`name`/`document` (snapshot pós-op) — verificável no outbox sem consultar o partners |

**Ordem**: `PAR-OUTBOX-INFRA` (fundação) → `PAR-SUPPLIER-EVENTS` (usa o outbox). O worker/script (`worker:outbox:partners`) entra no PAR-OUTBOX-INFRA. O **consumer no `financial`** (US2 da #47) é feature seguinte, não aqui.
