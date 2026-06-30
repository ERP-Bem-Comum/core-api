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

## Fatia A — ATIVAÇÃO GREEN (2026-06-22)

Os 7 use-cases de documento agora encaminham os eventos PARA DENTRO do repo (atomicidade
estado+evento na mesma tx). Removidos a dep `outbox`, o import `FinancialOutbox`/`OutboxAppendError`
e o `OutboxAppendError` da error union de cada um. Espelha o padrão de contracts (`save(agg, events)`).

- **Criadores** `save-draft`/`save-document`/`submit-draft`: `repo.save(agg, entries, undefined, events)`.
- **Mutadores** `approve-document`/`undo-approval`/`adjust-document` (2 sites — editMetadata + adjust):
  `repo.save(agg, entries, cmd.expectedVersion, events)`.
- **`cancel-document`** (2 sites — Draft + Open): `repo.delete(id, expectedVersion, cancelled.value.events)`.
- **Composição** (`financial/adapters/http/composition.ts`): `outbox` saiu do `deps` base de documento e do
  `cancelDocument({ repo })`. O `createInMemoryOutbox()` permanece SÓ para os use-cases de conciliação
  (Fatia B — ainda no caminho `outbox.append`). No driver mysql, eventos de documento vão agora ao
  `fin_outbox` (Drizzle repo) em vez do in-memory descartável — corrige o achado do `:340`.

**W0 RED → GREEN**: `document-outbox-atomic.in-memory.test.ts` (NOVO) injeta outbox que falha no repo
in-memory e prova rollback no use-case: `saveDocument` → `document-repository-failure` + `findPaged.total==0`;
`cancelDocument` (delete) → erro + documento preservado. RED capturado (`deps.outbox` inexistente → TypeError).

**Ripple de testes**: `save-document` / `adjust-document` / `transitions` / `timeline-recording` passam a
injetar a outbox no repo (3º param) e chamam os use-cases sem `outbox`; asserts `outbox.all()` seguem
válidos (via repo). Seeds de integração `match-suggestion`/`reconciliation-repository.drizzle-mysql`
removeram o `outbox` do `saveDocument` (Drizzle grava no `fin_outbox`).

**Gates (todos verdes)**: typecheck ✅ · `pnpm test` **3122/0** (18 skip integração; zero regressão) ·
format ✅ · lint ✅ · `test:integration:financial` (Docker) **44/44** (CA2/CA3 repo-level + seeds).

## Fatia B — conciliação GREEN (2026-06-22)

Atomicidade estado+evento na unit-of-work da conciliação (espelha a Fatia A).

- **Port** `ReconciliationRepository` (`application/ports/`): `events?: readonly ReconciliationEvent[]`
  trailing em `confirm`/`confirmManualEntry`/`undo` (opcional/back-compat para seeds).
- **Drizzle** (`reconciliation-repository.drizzle.ts`): `appendFinOutboxInTx(tx, events ?? [])` como último
  passo das 3 `db.transaction` (confirm/confirmManualEntry/undo). Eventos da conciliação → `fin_outbox`.
- **In-memory** (`reconciliation-repository.in-memory.ts`): factory aceita `outbox?` (default interno);
  helper `appendOrFail` publica ANTES de mutar os stores (falha → nada muda; rollback simulado).
- **3 use-cases** (`confirm-reconciliation`/`record-manual-entry`/`undo-reconciliation`): passam
  `confirmed.value.events`/`undone.value.events` ao repo; removidos dep `outbox`, import e `OutboxAppendError`.
- **Composição**: `outbox` saiu de confirm/undo/recordManualEntry. O `createInMemoryOutbox()` permanece
  apenas para `importBankStatement` (extrato) e `closeReconciliationPeriod` (período) — agregados
  `Statement`/`ReconciliationPeriod`, **fora do escopo clarificado do #127** (ver Residual abaixo).

**W0 RED → GREEN**: `reconciliation-outbox-atomic.in-memory.test.ts` (NOVO) — outbox que falha injetada no
repo → confirm/undo revertem (título/transação preservam o estado). RED capturado (`isErr` false: repo
sucedia ignorando events/outbox). `reconciliation-outbox-atomic.drizzle-mysql.test.ts` (NOVO, no runner):
CA2 sucesso (conciliação + fin_outbox na mesma tx) + CA3 rollback (event_type='' → CHECK → tx reverte,
título Paid/transação Pending preservados).

**Ripple de testes**: `reconciliation.use-cases` (fake repo captura events no 3º arg; removido `fakeOutbox`),
`manual-entry.use-cases` (outbox injetada no repo), `period.use-cases` (remoção dos 3 use-cases de
conciliação), HTTP `financial-reconciliation`/`financial-manual-entry`, integração `manual-entry.drizzle-mysql`.

**Gates (todos verdes)**: typecheck ✅ · `pnpm test` **3127/0** · format ✅ · lint ✅ ·
`test:integration:financial` (Docker) (CA2/CA3 documento + conciliação).

## Fatia C — extrato + período GREEN (2026-06-22, eliminação total do dual-write)

Cobrança do humano (política de regressão zero): "fora do escopo do clarify" não justifica deixar
dual-write meio-consertado. Estendida a atomicidade aos 2 agregados restantes e **removido o
`createInMemoryOutbox()` da composição** — nenhum evento de domínio do financial fica fora do `fin_outbox`.

- **`BankStatementRepository.save(statement, events?)`** (port + Drizzle `appendFinOutboxInTx` na tx +
  in-memory `outbox?` + append). Use-case `import-bank-statement` passa `imported.value.events`.
- **`ReconciliationPeriodStore.close(period, events?)`** (port + Drizzle: `close` agora envolto em
  `db.transaction` com `appendFinOutboxInTx` + in-memory `outbox?` + append). Use-case
  `close-reconciliation-period` passa `closed.value.events`.
- **Composição**: `createInMemoryOutbox()` e seu import **removidos por completo**. Comentário e docstring
  atualizados. Varredura confirma: zero `FinancialOutbox`/`outbox.append` em use-cases; zero outbox na
  composição. O port só sobrevive como default dos 4 repos in-memory (paridade de teste).
- **W0 RED→GREEN**: `statement-period-outbox-atomic.{in-memory,drizzle-mysql}.test.ts` (novos; o Drizzle no
  runner) — CA3 in-memory (outbox falha → save/close revertem) + CA2/CA3 Drizzle (statement E period).
- **Ripple**: `import-bank-statement(.test, account-closed)` (outbox capturadora vai p/ dentro do repo),
  `period.use-cases` (6 outboxes removidos + import), HTTP `financial-period`, integração `reconciliation-period`.

## Checkpoint — #127 COMPLETO

Fundação + Fatias A (documento) + B (conciliação) + C (extrato/período) verdes. **TODOS** os 4 agregados
emissores do financial (Document, Reconciliation, Statement, ReconciliationPeriod) gravam estado + evento
na MESMA tx → `fin_outbox` no mysql. **Dual-write eliminado; `createInMemoryOutbox()` fora da composição.**

**Gate final (todos verdes)**: typecheck ✅ · `pnpm test` **3127/0** (18 skip; zero regressão) · format ✅ ·
lint ✅ · `test:integration:financial` (Docker) **50/50** — CA2/CA3 para os 4 agregados.

Próximo: W2 (review) → W3 (gate já verde) → commit/PR.
