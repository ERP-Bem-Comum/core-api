# Implementation Plan: Financeiro — Fatia 2: Listagem + Trilha por-campo (Time Travel)

**Branch**: `feat/fin-listagem-timeline` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: [spec.md](./spec.md) · Domínio: [domain.md](./domain.md) · ADRs: [adr/](./adr/) · Métricas: [metrics.md](./metrics.md) · Research: [research.md](./research.md) · Data Model: [data-model.md](./data-model.md) · Contrato: [contracts/financial-http.md](./contracts/financial-http.md)

## Summary

Segunda fatia do **Módulo Financeiro** (estende a fatia 1, em `dev`). Entrega: (1) **listagem real** `GET /api/v2/financial/documents`
com filtros + paginação (substitui o stub); (2) **trilha por-campo (Time Travel)** materializada (`fin_document_timeline` +
`fin_timeline_field_changes`), gravada na mesma transação dos use cases, com `GET /documents/:id/timeline`; (3) **optimistic
lock enforçado** (`version` → `409`); (4) **remoção das permissões inertes** (`payable:read`/`payable:undo-approval`). Diff
por função pura sobre snapshots (eventos da fatia 1 intactos — ADR-0001). Sem split reader/writer (dívida diferida — ADR-0003).

## Technical Context

**Language/Version**: TypeScript 6.0 · Node.js 24 LTS · ESM/NodeNext

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4 — ADR-0020); Fastify + Zod (borda — ADR-0027/0037)

**Storage**: MySQL 8.4, `fin_*` (ADR-0014). 2 tabelas novas (timeline + field_changes); sem JSON/ENUM nativo

**Testing**: `node:test` + `--experimental-strip-types`; integração via Docker (`pnpm run test:integration:financial`); borda via `fastify.inject` + Bruno

**Project Type**: web-service (modular monolith, módulo `financial`)

**Performance Goals**: `GET /documents` p95 < 400 ms (MP-003); `GET /:id/timeline` p95 < 400 ms (MP-004); overhead da trilha por mutação +≤ 50 ms p95 (MP-005)

**Constraints**: domínio puro `Result<T,E>`; trilha materializada na mesma tx do agregado; diff por função pura; read path no writer pool; idioma EN no código / PT em docs

**Scale/Scope**: estende 1 agregado (instrumentação) + 1 read-model (`DocumentTimeline`) + `findPaged`; 2 rotas de leitura + 409 em 3 rotas; 1 migration `fin_*` (append)

## Constitution Check

| Princípio                         | Status | Observação                                                                  |
| --------------------------------- | ------ | --------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✅     | ticket size **M**; W0 RED antes de `src/`                                   |
| II. Regressão zero                | ✅     | fatia 1 em prod na `dev`; suíte global deve seguir verde                    |
| III. pnpm                         | ✅     | sem `npm`                                                                   |
| IV. Modular monolith + isolamento | ✅     | só `fin_*`; mudança RBAC subtrativa via public-api; sem import cross-domain |
| V. Domínio puro                   | ✅     | `DocumentTimeline`/`FieldChange` + diff por função pura; sem class/throw    |
| VI. MySQL 8 + Drizzle             | ✅     | 2 tabelas + índices; diff 1FN (sem JSON); migration append                  |
| VII. HTTP-first                   | ✅     | borda `/api/v2`; 2 rotas de leitura + 409                                   |
| VIII. TS strict + ESM + idioma    | ✅     | strict; `import type`; `.ts`; `#src/*`                                      |
| IX. Citações canônicas            | ✅     | Vernon:3257/3255 + Evans:1435/1471 (fallback local; ADRs)                   |

**Violações que exigem justificativa**: nenhuma nova. A dívida do split reader/writer (ADR-0003) é diferimento explícito, não violação.

## Project Structure (delta da fatia 2)

```text
src/modules/financial/
├── domain/
│   ├── timeline/            # NOVO: types.ts (FieldChange, FinancialTimelineEntry, TimelineTarget),
│   │                        #       projection.ts (diffDocument, projectEntry — puras), repository.ts (port)
│   └── document/            # query.ts (DocumentListFilter, Page<T>) + findPaged no repository.ts (port)
├── application/use-cases/   # instrumentar os 7 mutantes (projetar+append trilha na mesma tx);
│                            # +expectedVersion em adjust/approve/undoApproval; +listDocuments (findPaged)
├── adapters/
│   ├── persistence/         # schemas/mysql.ts (+2 tabelas), mappers (timeline), repos
│   │                        #   (timeline drizzle + in-memory; document.findPaged; save compartilha tx),
│   │                        #   migration fin_* nova
│   └── http/                # plugin.ts (GET /documents real + GET /:id/timeline + 409), dto.ts (timeline DTO),
│                            #   schemas.ts (timeline response), composition.ts (wire timeline repo + listDocuments real)
└── public-api/              # permissions.ts (remove payable:read/undo-approval)

src/modules/auth/domain/authorization/permission-catalog.ts  # remove as 2 permissões inertes (+ teste)

tests/modules/financial/     # espelho: domain/timeline (projeção/diff), application (instrumentação + 409),
                             # adapters/http (lista+timeline+409), adapters/persistence (timeline + findPaged integração)
```

**Structure Decision**: `domain/timeline/` espelha `contracts/domain/timeline/` (types + projection + repository). A trilha
não é agregado (read-model); a projeção é função pura. `findPaged` entra no port `DocumentRepository` existente.

## Complexity Tracking

| Item                                         | Why Needed                                             | Mitigação                                                         |
| -------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Trilha materializada na mesma tx do agregado | Consistência read-model↔agregado (SC-004; Vernon:3257) | Padrão de tx multi-tabela já existe no repo da fatia 1            |
| Listagem no writer pool (sem split)          | YAGNI; sem réplica/métricas (ADR-0003)                 | Dívida registrada com gatilho MP-003/MP-005; revisar pós-métricas |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] 2 tabelas novas (`fin_document_timeline`, `fin_timeline_field_changes`) · [x] índices · [x] FKs ON DELETE CASCADE (internas `fin_*`). Sem alterar tabelas da fatia 1.
- **Prefixo de isolamento**: `fin_*` (ADR-0014) — sim.
- **Outbox**: sem evento novo (reusa os 5 da fatia 1).
- **Comando**: editar `schema.ts` → `pnpm run db:generate` → versionar migration `fin_*`.
- **Restrições MySQL 8** (ADR-0020): CHECK em `target_kind`/`event_type`; diff em tabela filha (sem JSON); UUID `varchar(36)`; datetime(3).

## Contrato HTTP (ADR-0037)

- `GET /api/v2/financial/documents` — listagem real (filtros + paginação). Perm `fiscal-document:read`.
- `GET /api/v2/financial/documents/:id/timeline` — trilha por-campo. Perm `fiscal-document:read`.
- `PATCH`/`approve`/`undo-approval` — passam a enforçar `version` → `409 document-version-conflict`.
- Detalhe Zod em `contracts/financial-http.md`. Backward-compat: lista era stub (passa a retornar dados); 409 é novo código nas 3 rotas (clientes da fatia 1 que não enviavam version correto passam a receber 409 — esperado pela decisão clarify).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **M** (estende módulo existente; 1 read-model + projeção + findPaged + instrumentação + 409 + RBAC; 1 migration append).
- **Plano de testes W0 (RED)**: `domain/timeline/projection.test.ts` (diff por-campo, projeção por marco); `application/use-cases/*` (instrumentação da trilha na mesma tx + 409 optimistic lock + findPaged); `adapters/http/*` (lista com filtros/paginação, timeline, 403/404/409); `adapters/persistence/*` (timeline drizzle compartilhando tx + findPaged — integração); teste do catálogo RBAC (permissões removidas).
