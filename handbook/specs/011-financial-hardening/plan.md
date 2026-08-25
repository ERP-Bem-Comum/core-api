# Implementation Plan: Financial Hardening (pós-Fatia 2)

**Branch**: `011-financial-hardening` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-financial-hardening/spec.md`

## Summary

Quatro débitos/achados de code-review do módulo `financial`, agrupados numa feature de hardening sobre a borda já entregue (Fatias 1+2). Cada um é um slice independente, mapeado a uma issue:

- **#52** (P1, segurança) — mascarar slug interno em erros 4xx: `code` público (`conflict`/`not-found`/`bad-request`/`unprocessable`) + `message` PT-BR; slug só no log.
- **#55** (P2, concorrência) — `cancelDocument` passa a exigir `expectedVersion` (optimistic lock), fechando o TOCTOU entre `findById` e `delete`.
- **#56** (P3, smell) — rename de domínio `FinancialTimelineEntry.kind` → `eventType` + remoção de `DocumentCancelled` do subconjunto da trilha (response schema + CHECK via migration).
- **#54** (P3, contrato) — bounds reais (`maxLength`) nos campos `changes.*` do response schema da trilha.

**Abordagem técnica**: refactor cirúrgico, escopo restrito a `src/modules/financial/`. Uma única migration (CHECK da trilha). Resposta de `/timeline` byte-idêntica; mudança de comportamento observável apenas em #52 (body de erro) e #55 (DELETE passa a exigir `version`).

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM, NodeNext) · Node.js 24 LTS

**Primary Dependencies**: Fastify 5 + Zod + `fastify-zod-openapi@5.6.1` (borda HTTP, OpenAPI) · Drizzle ORM + `mysql2` (persistência)

**Storage**: MySQL 8.4 (ADR-0020); tabelas `fin_*` (ADR-0014); coluna `version` p/ optimistic lock; CHECK `ck_fin_tl_event_type` na trilha

**Testing**: `node:test` + `--experimental-strip-types`; `fastify.inject` p/ borda; suíte de contrato de repositório + integração MySQL (`pnpm run test:integration:financial`)

**Target Platform**: servidor Linux (container) — borda HTTP `/api/v2/financial/*`

**Project Type**: web-service (modular monolith, módulo `financial`)

**Performance Goals**: N/A — sem impacto de performance; nenhum hot-path novo

**Constraints**: zero mudança de comportamento exceto onde os CAs exigem (#52 body de erro, #55 contrato de entrada do cancel); resposta `/timeline` byte-idêntica

**Scale/Scope**: 1 BC (`financial`); ~10 arquivos de produção tocados + 1 migration; 4 slices independentes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                                | Status | Nota                                                                                                                                                                                    |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — TDD W0→W3 fail-first                 | ✅     | Cada slice abre ticket próprio; W0 RED definido por issue (ver `research.md`).                                                                                                          |
| II — Regressão zero                      | ✅     | `/timeline` byte-idêntico travado por CT-014; suíte ≥ baseline; gate W3 por ticket.                                                                                                     |
| III — pnpm único                         | ✅     | Migration via `pnpm run db:generate`; nenhum `npm`.                                                                                                                                     |
| IV — Modular monolith, isolamento por BC | ✅     | **Só** `fin_*`. Não toca `contracts`/`auth`/`partners`. Bugs latentes análogos em outros módulos ficam fora de escopo (issue própria).                                                  |
| V — Domínio puro (sem classes/throw)     | ✅     | Rename de campo `Readonly<{}>`; erros seguem string-literal union EN kebab-case (`document-version-conflict`).                                                                          |
| VI — MySQL 8 + Drizzle, migration gerada | ✅     | 1 migration gerada (CHECK), nunca SQL à mão; sem JSON/trigger/proc/ENUM nativo.                                                                                                         |
| VII — HTTP-first                         | ✅     | Borda financial já ativa (ADR-0037); nenhum novo servidor/ADR.                                                                                                                          |
| VIII — TS strict + idioma por camada     | ✅     | `eventType` em EN; mensagens de erro em PT-BR via dicionário na borda; `import type`, `.ts` nos imports.                                                                                |
| IX — Citação canônica das decisões-chave | ⚠️     | Decisões-chave (#52 OWASP API8; #55 simetria de optimistic lock) exigem citação ≥4 linhas registrada no W0/W2 de cada ticket (acdg-skills ou fallback local). Anotado em `research.md`. |

**Resultado**: sem violações. Nenhuma entrada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-financial-hardening/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas por issue (consolida 4 relatórios de agentes)
├── data-model.md        # Phase 1 — entidades afetadas
├── quickstart.md        # Phase 1 — como validar
├── contracts/
│   └── README.md        # Phase 1 — deltas de contrato HTTP (envelope erro, DELETE+version, timeline bounds)
├── checklists/
│   └── requirements.md  # quality gate da spec
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/
│   ├── document/
│   │   ├── events.ts                       # + TIMELINE_EVENT_TYPES (#56b)
│   │   └── repository.ts                   # delete(id, expectedVersion) (#55)
│   └── timeline/
│       ├── types.ts                        # kind → eventType (#56a)
│       └── projection.ts                   # kind → eventType (#56a)
├── application/use-cases/
│   └── cancel-document.ts                  # + expectedVersion (#55)
└── adapters/
    ├── http/
    │   ├── plugin.ts                       # mascaramento 4xx (#52); DELETE lê version (#55)
    │   ├── schemas.ts                      # bounds changes.* (#54); cancelDocumentBodySchema (#55)
    │   ├── dto.ts                          # entry.kind → entry.eventType (#56a)
    │   └── error-messages.ts               # NOVO — dicionário PT-BR (#52)
    └── persistence/
        ├── schemas/mysql.ts                # CHECK sem DocumentCancelled (#56b)
        ├── repos/document-repository.drizzle.ts    # delete condicional + version (#55)
        ├── repos/document-repository.in-memory.ts  # delete + version (#55)
        ├── mappers/timeline.mapper.ts      # kind → eventType (#56a)
        └── migrations/mysql/0002_*.sql     # NOVO (gerado) — ALTER CHECK (#56b)

src/shared/http/
├── errors.ts                               # toErrorEnvelope (referência; #52)
└── reply.ts                                # sendResult — caminho DELETE (#52/#55)

tests/modules/financial/                    # W0 RED por slice (ver research.md §plano de teste)
```

**Structure Decision**: modular monolith existente; toda a mudança vive em `src/modules/financial/` (+ referência a `src/shared/http/` para o envelope de erro). Sem nova pasta/módulo.

## Complexity Tracking

> Sem violações de Constituição. Nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] CHECK constraint (`ck_fin_tl_event_type`) · [ ] tabelas · [ ] colunas · [ ] índices · [ ] FKs
- **Prefixo de isolamento correto?** `fin_*` — sim (ADR-0014).
- **Outbox**: não exige novo evento (`DocumentCancelled` já existe; não há novo evento de domínio).
- **Comando**: editar o `check(...)` em `adapters/persistence/schemas/mysql.ts:380` (remover `'DocumentCancelled'`) → `pnpm run db:generate` → versionar `0002_*.sql`. Auditar o SQL emitido (`ALTER TABLE fin_document_timeline DROP CHECK ... / ADD CONSTRAINT ... CHECK`).
- **Restrições MySQL 8** (ADR-0020): cumpridas — só ALTER de CHECK nomeado; sem JSON/trigger/proc/ENUM nativo.

## Contrato HTTP (borda financial — ADR-0037 ativo)

Ver detalhe em [`contracts/README.md`](./contracts/README.md). Resumo dos deltas:

- **Envelope de erro 4xx** (#52): `code` deixa de ser o slug interno e passa a `conflict`/`not-found`/`bad-request`/`unprocessable`; `message` em PT-BR. 5xx inalterado. **Backward-compat**: clientes que liam o slug em `error.code` precisam migrar para o `code` público (mudança intencional, alinhada à segurança).
- **`DELETE /api/v2/financial/documents/:id`** (#55): passa a exigir `version` (body `{ "version": <int> }`); versão defasada → 409 `conflict`; ausência de `version` → 400. **Backward-compat**: contrato de entrada muda (coordenado com web-app v2).
- **`GET /api/v2/financial/documents/:id/timeline`** (#54): response schema ganha `maxLength` em `changes.field` (60) e `changes.before`/`after` (65535) no OpenAPI. Payload de dados inalterado.

## Estimativa de Pipeline (W0 size)

4 tickets independentes (um por issue), executáveis em paralelo:

| Ticket (sugestão)             | Issue | Size  | Justificativa                                                                                                            | W0 RED                                                                                                       |
| ----------------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `FIN-HTTP-ERROR-PUBLIC-CODE`  | #52   | **M** | toca `plugin.ts` + `reply.ts` (DELETE) + novo `error-messages.ts`; inventário de ~20 slugs; corrige 2 bugs de mapeamento | `fastify.inject` CA-H1..H8 (409/404/422/400 com `code` público sem slug; 5xx guard)                          |
| `FIN-CANCEL-OPTIMISTIC-LOCK`  | #55   | **M** | port + drizzle + in-memory + use case + http schema/handler; tx com SELECT FOR UPDATE                                    | use case (InMemory) + contrato de repo + integração: cancel version-ok → 204; version-stale → 409 sem apagar |
| `FIN-TIMELINE-MODEL-TIDY`     | #56   | **M** | rename (6 edições) + `TIMELINE_EVENT_TYPES` + migration do CHECK                                                         | typecheck RED (`docEntry.eventType`); integração: cascade apaga trilha + CHECK rejeita `DocumentCancelled`   |
| `FIN-TIMELINE-CHANGES-BOUNDS` | #54   | **S** | 2 linhas em `schemas.ts` + teste de schema                                                                               | `safeParse` N+1 chars em `field`/`before`/`after`; `maxLength` no OpenAPI                                    |

**Ordem recomendada**: #54 (S, isolado) → #52 (P1 segurança) → #55 → #56. #55 e #56 tocam ambos persistência/timeline — sequenciar para evitar conflito de merge na mesma área.
