# Implementation Plan: Financial List DTO

**Branch**: `012-financial-list-dto` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-financial-list-dto/spec.md`

## Summary

Enriquecer o item da listagem do grid de Contas a Pagar (`GET /api/v2/financial/documents`). A verificação do Phase 0 mudou o recorte de entrega:

- **US1 (P1) — campos locais do documento**: `series`, `grossValueCents`, `paymentMethod`, `contractRef`. Já existem em `fin_documents`/agregado; basta expô-los no read-model `DocumentListItem`, no SELECT do `findPaged` e no `DocumentSummaryDto`. **Sem migration, sem dependência cross-módulo. Executável agora.** Size **S**.
- **US2 (P2) — fornecedor (nome+CNPJ) via read-model**: **BLOQUEADA**. A decisão do clarify (read-model via outbox) exige eventos de fornecedor do `partners`, que **não são publicados** hoje (ver `research.md`). Pré-requisito grande no módulo `partners`. Vira issue separada.

**Esta feature entrega US1.** US2 e seu pré-requisito ficam registrados como bloqueio/issue.

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM, NodeNext) · Node.js 24 LTS

**Primary Dependencies**: Fastify 5 + Zod + `fastify-zod-openapi` (borda) · Drizzle ORM + `mysql2` (read path `findPaged`)

**Storage**: MySQL 8.4 — `fin_documents` (colunas `series`, `gross_value`, `payment_method`, `contract_ref`, `supplier_ref` já existentes)

**Testing**: `node:test` + `fastify.inject`; suíte de contrato de repo + integração MySQL

**Target Platform**: servidor Linux — borda HTTP `/api/v2/financial/*`

**Project Type**: web-service (modular monolith, módulo `financial`)

**Performance Goals**: N/A — leitura paginada já existente; US1 só adiciona colunas ao SELECT

**Constraints**: zero mudança de comportamento exceto adição de campos no item; campos pré-existentes inalterados

**Scale/Scope**: US1 — ~3 arquivos (`query.ts`, `document-repository.drizzle.ts`, `dto.ts`+`schemas.ts`). Sem migration.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                 | US1 (esta feature) | Nota                                                                                                                                                                                             |
| ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — TDD W0→W3             | ✅                 | 1 ticket; W0 RED no DTO/listagem enriquecida.                                                                                                                                                    |
| II — Regressão zero       | ✅                 | Campos pré-existentes do item inalterados; suíte ≥ baseline.                                                                                                                                     |
| III — pnpm                | ✅                 | Sem migration; nenhum `npm`.                                                                                                                                                                     |
| IV — Isolamento por BC    | ✅                 | Só `fin_*`. US1 não toca outros módulos. (US2 exigiria eventos `partners`→`financial` via outbox — ADR-0015.)                                                                                    |
| V — Domínio puro          | ✅                 | `DocumentListItem` é read-model `Readonly<{}>`; sem classes.                                                                                                                                     |
| VI — MySQL + Drizzle      | ✅                 | US1 sem migration (colunas já existem).                                                                                                                                                          |
| VII — HTTP-first          | ✅                 | Enriquece response schema existente; sem nova rota.                                                                                                                                              |
| VIII — TS strict + idioma | ✅                 | EN no código; campos novos seguem o padrão do DTO.                                                                                                                                               |
| IX — Citação canônica     | ⚠️                 | US1 é refactor de leitura (baixo risco) — citação leve no W2. A decisão arquitetural (read-model) já foi tomada no clarify; o pré-requisito de US2 exigirá ADR de evento `partners`→`financial`. |

**Resultado US1**: sem violações. **US2 fica fora desta feature** (bloqueada) — sem entrada em Complexity Tracking porque não será implementada aqui.

## Project Structure

### Documentation (this feature)

```text
specs/012-financial-list-dto/
├── plan.md
├── research.md          # Phase 0 — verificação de eventos do partners (US2 bloqueada) + decisões US1
├── data-model.md        # Phase 1 — DocumentListItem + DocumentSummaryDto enriquecidos (US1)
├── quickstart.md        # Phase 1
├── contracts/README.md  # Phase 1 — delta do response item de GET /documents
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (US1 — repository root)

```text
src/modules/financial/
├── domain/document/query.ts                                   # + series, grossValue, paymentMethod, contractRef no DocumentListItem
└── adapters/
    ├── persistence/repos/document-repository.drizzle.ts        # findPaged: SELECT + mapper inline incluem as 4 colunas
    ├── persistence/repos/document-repository.in-memory.ts      # espelhar o read-model no fake
    └── http/
        ├── dto.ts                                              # listItemToSummaryDto: mapear os 4 campos
        └── schemas.ts                                          # documentSummarySchema: + series, grossValueCents, paymentMethod, contractRef
```

**Structure Decision**: modular monolith existente; US1 toca só `src/modules/financial/`. Sem nova pasta, sem migration.

## Complexity Tracking

> Sem violações para US1. US2 (bloqueada) não é implementada aqui.

## Migrations Drizzle (core-api)

- **US1**: **nenhuma** — `series`, `gross_value`, `payment_method`, `contract_ref` já existem em `fin_documents`.
- **US2 (futura, bloqueada)**: exigiria tabela read-model `fin_*` (ex.: `fin_supplier_view`) — fora desta feature.

## Contrato HTTP (borda financial)

Ver [`contracts/README.md`](./contracts/README.md). Delta US1: o item de `GET /api/v2/financial/documents` ganha `series` (nullable), `grossValueCents`, `paymentMethod`, `contractRef` (nullable). Campos pré-existentes inalterados. Backward-compat: adição apenas (clientes antigos ignoram campos novos).

## Estimativa de Pipeline (W0 size)

| Ticket (sugestão)    | User Story | Size  | Justificativa                                               | W0 RED                                                                                                                                                         |
| -------------------- | ---------- | ----- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIN-LIST-DTO-LOCAL` | US1        | **S** | 4 campos locais ao read-model + SELECT + DTO; sem migration | `fastify.inject`: item da listagem traz `series`/`grossValueCents`/`paymentMethod`/`contractRef`; contrato de repo + integração: `findPaged` retorna os campos |

**Bloqueado (não nesta feature):**

- `US2` (fornecedor via read-model) → depende de **pré-requisito no `partners`**: infra de outbox + publicar `SupplierRegistered`/`SupplierUpdated`. Recomenda-se abrir issue (épico Colaborador/Parceiros) + ADR de contrato de evento `partners`→`financial`.
