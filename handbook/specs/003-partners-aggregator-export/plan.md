# Implementation Plan: Agregador de busca + paridade de export CSV (`partners` `/api/v1`)

**Branch**: `003-partners-aggregator-export` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-partners-aggregator-export/spec.md`

> Plano do épico (melhorias P2/P3). Consolida `spec.md` (com as 2 decisões travadas no `/speckit-clarify`),
> o `api-readiness-report` do front (`web-app/specs/008-partners/`, ITENs 3/4) e o recon do módulo `partners`. Constitution Check (I–IX). **Fatia em
> tickets W0→W3.**

## Summary

Fechar os gaps **restantes** de borda HTTP de `partners` (`/api/v1`): **(1)** agregador `GET /partners`
paginado dos 4 tipos (projeção plana, composto na borda lendo os 4 readers — CQRS read-side, Vernon p.193) e
**(2)** paridade de export CSV (`collaborators`/`financiers`/`acts`, espelhando `suppliers`). Sem domínio novo,
sem schema novo — é trabalho de **borda** (rotas + projeção/serialização) reusando readers e o util CSV
compartilhado. Decisões travadas: paginação **merge in-memory** (`name,type,id` + cap 10k→503) e permissão do
agregador = **AND das 4 reads**.

## Technical Context

**Language/Version**: TypeScript 6→7 strict, ESM (NodeNext) · Node 24 LTS
**Primary Dependencies**: Fastify 5 + `fastify-zod-openapi` (ADR-0025/0027) · Zod 4 · `shared/utils/csv.ts` (toCsv, ADR-0002)
**Storage**: MySQL 8.4 (`par_*`, ADR-0014) — **leitura apenas** via readers existentes; **nenhuma tabela/coluna/migration nova**
**Testing**: `node:test` + `--experimental-strip-types` · `fastify.inject` (rotas) · integração via `test:integration:partners` (aqui não toca persistência)
**Target Platform**: Node 24 server (borda HTTP ativa — ADR-0025/0033) + CLI
**Performance Goals**: agregador p95 < 200ms (4 reads in-memory via `Promise.all`); cap `MAX_TOTAL=10_000` → 503
**Constraints**: RBAC em toda rota; `requestId` no envelope; CSV escape anti-injection (util compartilhado); merge in-memory determinístico (`name,type,id`)
**Scale/Scope**: 1 módulo (`partners`) · 4 rotas novas (1 agregador + 3 export) · 2 serializers novos (financier/act-csv) · 1 projeção/merge · 0 migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                         | Aderência | Nota                                                                                                                             |
| --------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                      | ✓         | cada ticket abre `.pipeline/<TICKET>/` com W0 RED antes de `src/`                                                                |
| II. Regressão zero                | ✓         | W3 = typecheck+format+lint+test verdes                                                                                           |
| III. pnpm only                    | ✓         | zero dep nova (Fastify/Zod/util CSV já presentes)                                                                                |
| IV. Modular Monolith / isolamento | ✓         | só BC `partners` (`par_*`); agregador lê os readers do próprio módulo; sem cross-BC                                              |
| V. Domínio puro                   | ✓         | projeção `PartnerListItem` e serializers CSV são **adapters de borda** (não domínio); domínio intocado                           |
| VI. MySQL 8 + Drizzle migrations  | ✓         | **nenhuma mudança de schema** — leitura via readers existentes; sem `db:generate`                                                |
| VII. CLI-first; HTTP exige ADR    | ✓         | HTTP já habilitado (ADR-0025/0033); estende plugins existentes de `partners`                                                     |
| VIII. TS strict + ESM + idioma    | ✓         | `import type`, `.ts` nos imports, `#src/*`; erros EN kebab-case; docs/commits PT                                                 |
| IX. Cânone + citação              | ✓         | decisão-chave (read-side composition / DTO cruzando agregados) ancorada em Vernon p.193 (citação ≥4 linhas em "Review do Plano") |

**Resultado: PASS** — sem violações. Composição read-side na borda (CQRS de leitura) é padrão legítimo; nada a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-partners-aggregator-export/
├── spec.md (+ checklists/requirements.md)
├── plan.md (este) · research.md · data-model.md · quickstart.md
├── contracts/        # contratos HTTP (agregador + 3 exports) — Zod request/response
└── bdd/              # cenários Gherkin por user story
   (tasks.md gerado pelo /speckit-tasks)
```

### Source Code (estende o módulo `partners`; só borda)

```text
src/modules/partners/
├── adapters/
│   ├── http/
│   │   ├── partner-aggregate-query.ts   # NOVO — projeção PartnerListItem + filtro + merge + sort (name,type,id) + paginate + cap MAX_TOTAL
│   │   ├── partners-plugin.ts           # NOVO — GET /partners (agregador); authorize AND das 4 reads; Zod query/response
│   │   ├── collaborator-plugin.ts       # + GET /collaborators/export (reusa collaborator-csv.ts)
│   │   ├── financier-plugin.ts          # + GET /financiers/export
│   │   ├── act-plugin.ts                # + GET /acts/export
│   │   ├── partners-schemas.ts          # NOVO — Zod do agregador (query + PartnersPage)
│   │   └── composition.ts               # + wiring dos 4 readers no agregador (deps)
│   └── export/
│       ├── financier-csv.ts             # NOVO — serializer (espelha supplier-csv.ts)
│       └── act-csv.ts                   # NOVO — serializer (espelha supplier-csv.ts)
└── public-api/permissions.ts            # (reusa supplier/financier/collaborator/act:read; sem permissão nova)

src/server.ts                            # + registro do partners-plugin {prefix:'/api/v1'}
```

**Structure Decision**: módulo vertical `partners` estendido (sem estrutura nova). A composição do agregador
isola-se em `partner-aggregate-query.ts` (projeção + merge + paginação), espelhando o helper já existente
`supplier-list-query.ts` (`paginateRecords`). Os exports reusam o padrão `supplier-plugin.ts` (rota + serializer).

## Complexity Tracking

> Constitution Check passou sem violações — nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [ ] nenhuma — feature de **leitura/serialização** apenas (readers + util CSV existentes).
- **Prefixo de isolamento**: N/A (sem schema). **Outbox**: não. **Comando**: N/A (`db:generate` não roda).

## Contrato HTTP (borda ativa — ADR-0025/0033)

Todas sob `/api/v1`, `requireAuth` + `authorize`, envelope `{error:{code,message,requestId}}`, Zod (detalhe em `contracts/`):

| Método | Rota                           | Permissão                                                                               | US     |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------- | ------ |
| GET    | `/api/v1/partners`             | `supplier:read` **AND** `financier:read` **AND** `collaborator:read` **AND** `act:read` | US-001 |
| GET    | `/api/v1/collaborators/export` | `collaborator:read`                                                                     | US-002 |
| GET    | `/api/v1/financiers/export`    | `financier:read`                                                                        | US-002 |
| GET    | `/api/v1/acts/export`          | `act:read`                                                                              | US-002 |

- **Agregador**: query `{ search?, type?, page?, limit? }`; resposta `{ items: PartnerListItem[], meta }`; `type` inválido → 400; soma > `MAX_TOTAL` → 503 (`partners-aggregate-too-large`).
- **Exports**: `Content-Type: text/csv` + `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`; escape anti-injection (util); respeitam filtros da listagem do tipo.
- **Backward-compat**: rotas **novas**; nada migra de `/api/v1`.

## Fatiamento em tickets W0→W3

| Ordem | Ticket                            | Size | Escopo                                                                                                                                                                                                                                                                                                 | Depende de |
| ----- | --------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1     | **`PARTNERS-AGGREGATOR-HTTP`**    | M    | `partner-aggregate-query.ts` (projeção `PartnerListItem` + filtro `search`/`type` + merge `Promise.all` + sort `(name,type,id)` + paginate + cap `MAX_TOTAL`→503) + `partners-plugin.ts` (`GET /partners`, guard AND-4-reads) + `partners-schemas.ts` + wiring `composition.ts` + registro `server.ts` | —          |
| 2     | **`PARTNERS-EXPORT-PARITY-HTTP`** | M    | serializers `financier-csv.ts` + `act-csv.ts` (espelham `supplier-csv.ts`) + rotas `GET /collaborators/export` (reusa `collaborator-csv.ts`), `GET /financiers/export`, `GET /acts/export` (reusam o filtro/`*ForExport` de cada tipo)                                                                 | —          |

> Tickets independentes (podem ser paralelos). Cada um percorre W0→W3 com seu próprio `pnpm run pipeline:state init <TICKET> --size M`.

## Estimativa de Pipeline (W0 size)

- **Épico**: **M** (2 tickets M; sem domínio/persistência/migration).
- **Justificativa**: 1 M de composição/paginação na borda + 1 M de paridade de export (2 serializers + 3 rotas).
- **Plano de testes W0 (RED) — primeiras suítes a falhar:**
  - `tests/modules/partners/adapters/http/partner-aggregate-query.test.ts` — projeção + filtro + merge + sort + cap (unit, ticket 1).
  - `tests/modules/partners/adapters/http/partners-aggregate.routes.test.ts` — `GET /partners` 404 → paginação/sort/cap 503/AND-perms 403 (ticket 1).
  - `tests/modules/partners/adapters/export/financier-csv.test.ts` + `act-csv.test.ts` — serializers + escape anti-injection (unit, ticket 2).
  - `tests/modules/partners/adapters/http/partners-export-parity.routes.test.ts` — `/collaborators|financiers|acts/export` 404 → CSV + headers + 403 (ticket 2).

## Review do Plano (`/acdg-skills:ddd-architect` + especialistas do clarify)

Decisão-chave: **agregador como composição read-side na borda** (lê os 4 readers, monta DTO plano) — não um
novo agregado nem leitura cruzada de `par_*`. Ancorada em Vernon, _Implementing DDD_, Cap. 4 (CQRS):

> Command-Query Responsibility Segregation, or CQRS
>
> It can be difficult to query from Repositories all the data users need to view. This is especially so when user experience design creates views of data that cuts across a number of Aggregate types and instances. (...) we could require clients to use multiple Repositories to get all the necessary Aggregate instances, then assemble just what's needed into a Data Transfer Object (DTO).
> — _(Linha 3086, p. 193, Vaughn Vernon, Implementing Domain-Driven Design)_

- **Paginação in-memory** (parecer mysql-database-expert): consistente com o padrão atual (readers retornam tudo; rotas por-tipo já paginam in-memory via `paginateRecords`). `Promise.all` nos 4 readers; sort `(name,type,id)` determinístico; cap `MAX_TOTAL=10_000`→503. Gatilho p/ paginação no DB: `EXPLAIN type=ALL` sob carga / p95 > SLO / total > ~5k.
- **Permissão AND-4-reads** (parecer security-backend-expert): least-privilege sem criar permissão nova; quem usa o seletor de contratado (feature 002) pode contratar qualquer tipo → deve ler os 4. Filtro dinâmico por permissão = ADR futuro se surgir perfil de subconjunto.
- **Sem domínio/schema**: projeção e serializers são adapters de apresentação (Princ. V); reusam `shared/utils/csv.ts` (Princ. III).

**Veredito**: plano APROVADO — borda pura, sem tocar domínio/persistência; alinhado a ADR-0006/0014/0033.
