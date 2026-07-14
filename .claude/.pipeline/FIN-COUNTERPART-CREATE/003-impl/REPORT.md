# W1 — GREEN · FIN-COUNTERPART-CREATE (US1 + Foundational · spec 029 · #269)

> **Outcome:** GREEN · Skills: `ts-domain-modeler` + `drizzle-schema-author` + `ports-and-adapters` · Módulo `financial` (worktree `269-counterpart`)

## Escopo entregue

**Foundational (Phase 2 — T003–T010)** + **US1 (T013–T015)** num único ticket, conforme `000-request.md`.

### Domínio novo (`src/modules/financial/domain/expected-counterpart/`)

- `expected-counterpart-id.ts` — branded id (`generate`/`rehydrate` → `Result`).
- `types.ts` — `ExpectedCounterpart` (`Readonly`), `ExpectedCounterpartStatus` (`Pending|Matched|Discarded`), `ExpectedCounterpartType` (`Transfer`), union de erros EN kebab.
- `events.ts` — `TransferCounterpartCreated` / `Matched` / `Discarded` (EN-passado; `valueCents` como number serializável, ids → string no wire).
- `expected-counterpart.ts` — `create` (US1): valida `valueCents > 0` + `destino ≠ origem`, deriva `movement` **oposto** ao da origem, status `Pending`, emite `TransferCounterpartCreated`. `match`/`discard` ficam para `FIN-COUNTERPART-MATCH`/`UNDO`.

### Port + adapters

- `application/ports/expected-counterpart-store.ts` — `save`(+events) / `findById` / `listPendingByAccount` / `findByOriginReconciliation`.
- `adapters/persistence/repos/expected-counterpart-store.in-memory.ts` — publica eventos no outbox interno antes de mutar (paridade da atomicidade do Drizzle; outbox opcional default).
- `adapters/persistence/repos/expected-counterpart-store.drizzle.ts` — `save` abre 1 tx: INSERT + `appendFinOutboxInTx` (evento + estado na MESMA tx — ADR-0015).
- `adapters/persistence/mappers/expected-counterpart.mapper.ts` — row↔domínio via `Result` (`valueCents` bigint↔number).

### Schema + migration

- `schemas/mysql.ts` — tabela `fin_expected_counterpart` (varchar ids, bigint cents, varchar type/movement/status + CHECK, `expected_date` date, `created_at`/`updated_at` datetime). Índices `(destination_account_ref, status)` e `(origin_reconciliation_ref)`.
- Migration `0034_numerous_rhodey.sql` gerada via `db:generate:financial`. Segue o padrão das migrations recentes (0027/0028): sem CHARSET/COLLATE manual (nota do schema é aspiracional e abandonada; ADR-0020 não a exige).

### Integração + wiring

- `outbox.ts` — `FinancialAppendableEvent` ganha `ExpectedCounterpartEvent`.
- `fin-outbox-helpers.ts` — `extractAggregateInfo` ganha branch `counterpartId` → `aggregateType='ExpectedCounterpart'` (senão cairia no fallback `periodId`).
- `record-manual-entry.ts` — novo dep `expectedCounterpartStore`; quando `type='Transfer'` + `destinationAccountRef` presente, cria+salva a contrapartida no destino após confirmar a perna de origem. Fora de Transfer / sem destino → nada criado (guard de não-regressão).
- `adapters/http/composition.ts` — `expectedCounterpartStore` nos `Pools` + build memory (in-memory) + build mysql (drizzle) + injeção no `record`.

## Cobertura dos CAs (todos GREEN)

| CA | Camada | Prova |
| :-- | :-- | :-- |
| CA1 | application | `record-manual-entry-counterpart.test.ts` — Transfer+destino → 1 contrapartida Pending em B (movement oposto, valor da transação) |
| CA2 | application | sem destino **e** type≠Transfer → nenhuma contrapartida (não-regressão) |
| CA3 | domínio | `create.test.ts` — valor>0, destino≠origem, Pending, movement oposto (ambas direções), evento Created |
| CA4 | adapter | evento publicado no outbox na mesma tx do save (drizzle `save` + `appendFinOutboxInTx`; in-memory espelha) |

## Qualidade (prévia do W3, na worktree)

- `pnpm run typecheck` → **verde**.
- `pnpm run lint` → **verde**.
- `pnpm run format:check` → **verde** (9 arquivos formatados: schema + meta drizzle + SDD/CLAUDE.md do setup W0).
- `pnpm test` → **3944 pass · 0 fail · 19 skipped** (integração MySQL sem `MYSQL_INTEGRATION`).

## Nota de não-regressão

Tornar `expectedCounterpartStore` obrigatório no `RecordManualEntryDeps` quebrou 4 testes pré-existentes que montam `recordManualEntry` (http / drizzle-mysql / manual-entry.use-cases / period.use-cases). Corrigidos injetando o store (in-memory nos 3 in-memory; drizzle no de integração) — regressão zero.

## Achado registrado (fora de escopo)

O link `handbook/domain/06-event-line-context.md` citado em `handbook/architecture/04-integration-events.md` aponta para arquivo inexistente (débito pré-existente). Contrato dos 3 eventos registrado na matriz interna `handbook/domain_questions/financeiro/06-event-flow.md` (§I).

## Handoff W2

`code-reviewer` (read-only): auditar adesão a domain/application/adapters rules, boundary de agregado (contrapartida = agregado próprio), atomicidade do outbox, e a decisão de criar a contrapartida em unit-of-work separada da reconciliation (2 stores; documentar limitação vs. plano "mesma unit-of-work").

## Handoff W3

`ts-quality-checker`: gate já verde na worktree; **falta validar a migration `0034` no x99** (MySQL 8.4, túnel) — CHECK constraints + índices + INSERT real de uma contrapartida.
