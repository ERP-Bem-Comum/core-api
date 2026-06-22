# W1 — Implementação · FIN-OUTBOX-ATOMIC (#127) — em progresso (FUNDAÇÃO GREEN)

**Wave**: W1 · **Status**: in-progress (fundação verde; fatias A/B pendentes) · **Data**: 2026-06-22

## Fundação entregue e VERIFICADA (GREEN)

1. **Tabela `fin_outbox`** em `src/modules/financial/adapters/persistence/schemas/mysql.ts` — espelha `ctr_outbox`: `event_id` varchar(36) PK (idempotência), `aggregate_id`/`aggregate_type`(+CHECK `IN ('Document','Reconciliation','Statement','ReconciliationPeriod')`), `event_type`(+CHECK nonempty), `schema_version` int, `occurred_at`/`enqueued_at` datetime(3), `processed_at` null, `attempts` int default 0 (+CHECK ≥0), `payload` varchar(8192) (não-JSON, ADR-0020). Índices `(processed_at, occurred_at)` + `(aggregate_id)`. Convenção financial: `varchar(36)` (não `char`).
2. **Migration** `migrations/mysql/0018_goofy_martin_li.sql` (via `pnpm run db:generate:financial` — NÃO o `db:generate` puro, que é de contracts).
3. **Helper** `repos/fin-outbox-helpers.ts`: `appendFinOutboxInTx(tx, events, now?)` + `finEventToOutboxInsert` + `extractAggregateInfo`. `tx` é tipo estrutural `{ insert }` (aceita db ou tx). Mapper: `documentId`→Document, `reconciliationId`→Reconciliation, `statementId`→Statement, `periodId`→ReconciliationPeriod. **`payload = JSON.stringify(event)`**. Achado: `DocumentEvent` **não tem `occurredAt`** (≠ Reconciliation/Statement/Period) → mapper usa `now` quando ausente.

## Verificação (GREEN)

| Gate | Resultado |
|---|---|
| `fin-outbox-helpers.test.ts` (unit) | ✅ 2/2 (RED do W0 → GREEN) |
| `fin-outbox-schema.drizzle-mysql.test.ts` (integração, Docker) | ✅ suíte financial **42/42** (RED → GREEN; tabela criada pela 0018) |
| typecheck · format · lint | ✅ |

Achado de processo: `scripts/ci/test-integration.ts` usa lista explícita — o teste de schema foi adicionado à lista `financial`.

## Restante do W1 (TDD por fatia)

- **Fatia A (documento)**: estender `DocumentRepository.save` p/ receber `events` → `appendFinOutboxInTx` na tx (`document-repository.drizzle.ts:224` + in-memory) → atualizar 7 use-cases (passar events; remover `outbox.append`). RED: `document-outbox-atomic.{in-memory,drizzle-mysql}.test.ts` (falha no outbox → `COUNT==baseline`).
- **Fatia B (conciliação)**: idem em `ReconciliationRepository.confirm/confirmManualEntry/undo` (`reconciliation-repository.drizzle.ts:51`) + 3 use-cases.
- **Composição**: wiring mysql do `fin_outbox` (remover `createInMemoryOutbox` dos use-cases mysql).
- Adicionar os 2 testes de atomicidade à lista do runner de integração.

## Fatia A — repo-level GREEN (2026-06-22)

Implementado o threading dos eventos para DENTRO do repo de documentos (atomicidade na tx):
- **Port** `DocumentRepository`: `save(agg, entries, expectedVersion?, events?)` + `delete(id, version, events?)` — `events` tipado como `DocumentEvent` (domínio, sem importar application). Opcional/trailing → back-compat (callers sem evento não quebram).
- **Drizzle** (`document-repository.drizzle.ts`): `appendFinOutboxInTx(tx, events ?? [])` como último passo da `db.transaction` do `save` E do `delete` (cancel usa delete).
- **In-memory** (`document-repository.in-memory.ts`): factory aceita `outbox?` (default interno); `save`/`delete` fazem `outbox.append` ANTES de persistir (falha → não persiste; rollback simulado). Paridade com o Drizzle.

**Verificado**:
- `document-outbox-atomic.drizzle-mysql.test.ts` (NOVO, no runner): CA2 sucesso (documento + fin_outbox na mesma tx) + CA3 rollback (evento malformado event_type='' → CHECK rejeita → tx reverte, COUNT==baseline). **Integração financial 44/44**.
- typecheck ✅ · `pnpm test` **3120/0** (sem regressão — use-cases ainda no caminho antigo).

## Restante da Fatia A (ATIVAÇÃO)

Os 7 use-cases ainda chamam `save(sem events)` + `outbox.append` separado. Falta: passar `events` ao `save`/`delete` e **remover** o `outbox.append` + a dep `outbox` (ripple p/ composition + tests que injetam outbox). E o teste de rollback in-memory (outbox injetado que falha). Depois: **Fatia B (conciliação)** + composição mysql.

## Checkpoint

Fundação + Fatia A (repo-level) verdes e versionáveis. Próximo: ativação dos 7 use-cases.
