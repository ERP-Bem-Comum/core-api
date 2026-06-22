# Data Model — 024 (outbox transacional do Financeiro)

## Nova tabela: `fin_outbox` (espelha `ctr_outbox`)

Modelo: `src/modules/contracts/adapters/persistence/schemas/mysql.ts:315` (`ctrOutbox`) + ADR-0015 §"Schema da outbox". Prefixo `fin_` (ADR-0014). Migration gerada (`db:generate`).

| Coluna           | Tipo                                   | Nota                                                                                              |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `event_id`       | `char(36)` **PK** notNull              | UUID v4 do evento — **idempotência** (PK; reinsert do mesmo evento → `ER_DUP_ENTRY` reverte a tx) |
| `aggregate_id`   | `char(36)` notNull                     | id do agregado (documento / conciliação)                                                          |
| `aggregate_type` | `varchar(32)` notNull + CHECK          | catálogo do módulo: `IN ('Document','Reconciliation', …)`                                         |
| `event_type`     | `varchar(64)` notNull + CHECK nonempty | PascalCase (ex.: `PayableReconciled`)                                                             |
| `schema_version` | `smallint` notNull                     | versão do contrato do payload (inicia em 1)                                                       |
| `payload`        | `varchar(8192)` notNull                | envelope serializado — **varchar, não JSON** (ADR-0020)                                           |
| `occurred_at`    | `datetime(3)` notNull                  | instante do fato                                                                                  |
| `enqueued_at`    | `datetime(3)` notNull                  | instante do append                                                                                |
| `processed_at`   | `datetime(3)` **null**                 | NULL = não processado (worker preenche)                                                           |
| `attempts`       | `smallint` notNull default 0           | tentativas de entrega (worker)                                                                    |

**Índices**: `(processed_at, occurred_at)` — scan do worker (`WHERE processed_at IS NULL ORDER BY occurred_at`); `(aggregate_id)`.

**Proibições (ADR-0020)**: sem JSON nativo, sem ENUM, sem AUTO_INCREMENT, sem `ON DUPLICATE KEY UPDATE`.

## Entidade de leitura: evento appendável do Financeiro

- Já existe no domínio (`FinancialAppendableEvent` / eventos de documento + `ReconciliationEvent`). O helper `appendFinOutboxInTx` mapeia `evento → linha do fin_outbox` (`event_id`, `aggregate_*`, `event_type`, `payload` serializado, timestamps) — espelha `eventToOutboxInsert` de contracts.

## Transição de fronteira (não há transição de domínio nova)

```
ANTES:  repo.save(agg, entries)            // tx A (estado) — COMMIT
        outbox.append(events)              // tx B (separada) — janela de perda

DEPOIS: repo.save(agg, entries, events)    // UMA tx:
          INSERT/UPDATE estado
          appendFinOutboxInTx(tx, events)  // INSERT fin_outbox — mesma tx
        // COMMIT atômico: evento existe sse estado persistido (ADR-0015)
```

Idem para `reconciliationRepo.confirm/confirmManualEntry/undo(..., events)`.

## Reversão (CA2/CA3)

Se o INSERT no `fin_outbox` falhar (CHECK/PK/erro), o `throw` dentro do callback de `db.transaction` reverte **toda** a tx — estado anterior preservado, nenhum evento órfão. O repo converte para slug de erro de persistência (`*-repository-failure`), sem vazar `Error` (`.claude/rules/adapters.md`).
