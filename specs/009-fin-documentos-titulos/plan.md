# Implementation Plan: Financeiro — Fatia 1: Gestão de Documentos + Geração de Títulos

**Branch**: `feat/fin-module` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-fin-documentos-titulos/spec.md` · Domínio: [domain.md](./domain.md) · ADRs: [adr/](./adr/) · Métricas: [metrics.md](./metrics.md)

## Summary

Primeira fatia vertical do **Módulo Financeiro** (`src/modules/financial/`, schema `fin_*`): registrar um **Documento** (Fato Gerador) e gerar automaticamente os **Títulos** (Pai = líquido + Filhos = retenções), com máquina de estados `Draft → Open → Approved` (+ desfazer aprovação, cancelamento) e **trilha por-campo** (Time Travel). Abordagem: agregado `Document` raiz com `Payable` interno (ADR-0002), refs cross-BC leves por UUID (ADR-0001), eventos via outbox (ADR-0015), borda HTTP `/api/v1` (ADR-0037). Sem banco/conciliação (fatias futuras).

## Technical Context

**Language/Version**: TypeScript 6.0 · Node.js 24 LTS · ESM/NodeNext

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4 — ADR-0020); Fastify + Zod (borda HTTP — ADR-0025/0027/0037); `@aws-sdk/client-s3` (não usado nesta fatia — sem upload de PDF ainda)

**Storage**: MySQL 8.4, schema isolado `fin_*` (ADR-0014). Sem JSON nativo/ENUM/triggers/stored procs (ADR-0020)

**Testing**: `node:test` + `--experimental-strip-types`; integração via Docker compose (`pnpm run test:integration`); borda via `fastify.inject` + coleções Bruno (ADR-0034)

**Target Platform**: servidor Linux (container Debian bookworm-slim — ADR-0033)

**Project Type**: web-service (modular monolith, módulo `financial`)

**Performance Goals**: borda `/api/v1` — `POST /documents` p95 < 300ms; `approve` p95 < 200ms; listagem p95 < 400ms (ver `metrics.md` MP-001..004)

**Constraints**: domínio puro `Result<T,E>` sem throw/class; Money em `bigint` cents; refs validadas só por formato (UUID v4); idioma EN no código / PT em docs

**Scale/Scope**: fatia 1 — 2 agregados (`Document`, `Payable`) + read-model timeline; ~6 use cases; ~6 rotas HTTP; 1 migration inicial `fin_*`

## Constitution Check

_GATE: deve passar antes da Fase 0; re-checar após a Fase 1._

| Princípio                         | Status | Observação                                                                                  |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✅     | ticket `FIN-DOCUMENTO-TITULOS` size **L**; W0 RED antes de `src/`                           |
| II. Regressão zero                | ✅     | gate W3 completo no fim                                                                     |
| III. pnpm                         | ✅     | sem `npm`                                                                                   |
| IV. Modular monolith + isolamento | ✅     | `fin_*` isolado; cross-BC só via `public-api` + refs leves; outbox p/ eventos               |
| V. Domínio puro                   | ✅     | `ts-domain-modeler` — sem class/throw; branded; switch exaustivo                            |
| VI. MySQL 8 + Drizzle             | ✅     | schema Drizzle `fin_*`; `db:generate`; sem JSON/ENUM nativo                                 |
| VII. HTTP-first                   | ✅     | borda `/api/v1` Fastify+Zod; sem CLI embutida (ADR-0037)                                    |
| VIII. TS strict + ESM + idioma    | ✅     | strict completo; `import type`; `.ts` ext; `#src/*`                                         |
| IX. Citações canônicas            | ✅     | Evans/Vernon/Newman via fallback local (`acdg-skills` off) — domain/ADRs/metrics já citados |

**Violações que exigem justificativa (Complexity Tracking):** apenas as **refs órfãs** (plano/categoria sem dono) — ver tabela abaixo. Nenhuma viola ADR aceito.

## Project Structure

### Documentation (this feature)

```text
specs/009-fin-documentos-titulos/
├── plan.md          # este arquivo
├── research.md      # Fase 0 (decisões técnicas)
├── data-model.md    # Fase 1 (schema fin_* Drizzle)
├── quickstart.md    # Fase 1 (como rodar/testar)
├── contracts/       # Fase 1 (financial-http.md — endpoints /api/v1)
├── spec.md · discovery.md · domain.md · metrics.md · adr/0001-0005
└── tasks.md         # Fase 6b (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/
│   ├── shared/            # ids.ts (DocumentId, PayableId), refs.ts (Contract/BudgetPlan/Category/ProgramRef)
│   ├── document/          # types, errors, events, document.ts (create/submit/adjust/approve/undoApproval/cancel), repository.ts
│   ├── payable/           # types, errors (entidade interna ao agregado Document)
│   └── timeline/          # types (FinancialTimelineEntry, FieldChange) — read-model
├── application/
│   ├── ports/             # DocumentRepository (domain), EventBus/Outbox, Clock
│   └── use-cases/         # saveDocument, adjustDocument, approveDocument, undoApproval, cancelDocument, getDocumentTimeline, listDocuments
├── adapters/
│   ├── http/              # plugin, schemas (Zod), dto, composition — rotas /api/v2/financial
│   ├── persistence/       # schemas/mysql.ts (fin_*), mappers, repos (drizzle + in-memory), driver, migrations
│   └── outbox/            # outbox.in-memory + drizzle
└── public-api/            # index.ts, events.ts, permissions.ts, refs.ts (barrel — ADR-0006)

tests/modules/financial/   # espelho: domain/ · application/ · adapters/ (integração)
```

**Structure Decision**: módulo `financial` espelha a estrutura de `contracts`/`programs` (camadas domain/application/adapters/public-api). Agregado `Document` em `domain/document/`; `Payable` como entidade interna (sem repository próprio nesta fatia — ADR-0002).

## Complexity Tracking

| Violação                                                   | Why Needed                                                                                        | Simpler Alternative Rejected Because                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Refs órfãs (`BudgetPlanRef`/`CategoryRef` sem módulo dono) | Documento precisa classificar plano/categoria; módulo Orçamento não existe (sem fonte de domínio) | Criar Orçamento agora = elicitar um BC inteiro do zero (big design up front) p/ um campo que na fatia 1 é só tag — ADR-0001 |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabelas novas (`fin_documents`, `fin_payables`, `fin_document_timeline`, `fin_retentions`, `fin_registered_taxes`) · [x] índices · [x] FKs (internas ao `fin_*`) · detalhe em `data-model.md`
- **Prefixo de isolamento correto?** `fin_*` — ADR-0014: **sim**
- **Outbox**: novo evento exige `INSERT` em `core.outbox`? **sim** (DocumentSaved/PayableApproved/...)
- **Comando**: editar `schema.ts` → `pnpm run db:generate` → versionar a migration `fin_*`
- **Restrições MySQL 8** (ADR-0020): status como `varchar` + CHECK (sem ENUM nativo); sem JSON nativo (timeline `changes` decidida em `data-model.md`); UUID em `varchar(36)`; Money em `bigint`

## Contrato HTTP (ADR-0037 — borda ativa)

- **Endpoints novos** (detalhe Zod em `contracts/financial-http.md`):
  - `POST /api/v2/financial/documents` — cria/salva documento → gera pai+filhos (`Open`). Perm: `fiscal-document:write`
  - `PATCH /api/v2/financial/documents/:id` — ajusta em `Open` (recalcula). Perm: `fiscal-document:write`
  - `POST /api/v2/financial/documents/:id/approve` — aprova (herança). Perm: `payable:approve`
  - `POST /api/v2/financial/documents/:id/undo-approval` — `Approved`→`Open`. Perm: `payable:approve`
  - `DELETE /api/v2/financial/documents/:id` — cancela (só `Open`, hard delete). Perm: `fiscal-document:cancel`
  - `GET /api/v2/financial/documents` (lista paginada) + `GET /:id` + `GET /:id/timeline`. Perm: `fiscal-document:read`
- **Backward-compat / versionamento**: `/api/v1` novo; sem quebra.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** (BC novo, 2 agregados + read-model, outbox, migration, borda HTTP)
- **Justificativa**: módulo `financial` inexistente (a ignorar o atual); múltiplas camadas, eventos cross-cutting, borda HTTP — escopo L.
- **Plano de testes W0 (RED)**: `tests/modules/financial/domain/document/document.test.ts` (cálculo do líquido, geração de filhos por tipo, máquina de estados, herança, imutabilidade, hard delete) falham por inexistência da API; depois `application/use-cases/*.test.ts` (orquestração + outbox) e `adapters/http/*.test.ts` (rotas + autorização via `fastify.inject`).

```

```
