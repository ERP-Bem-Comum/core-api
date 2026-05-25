# 000 — Request CTR-OUTBOX-SCHEMA

> **Frente B — Outbox Pattern (ADR-0015).** **Ticket #1 da série de 7** (cf. `.claude/.planning/OUTBOX-MYSQL.md`).
> Cria 3 tabelas + índices + CHECKs no schema MySQL + migration Drizzle. Valida via E2E.
> Depende de `CTR-DOMAIN-MAPPER-RESULT` ✅ (erros tagged habilitam observabilidade do outbox) + `CTR-DOMAIN-RESTRUCTURE` ✅.
> 18º ticket consecutivo do protocolo **Opção B**.

## Decisões aplicáveis (do plano OUTBOX-MYSQL.md)

- **D1** ✅ Tabela por módulo: `core.ctr_outbox` (alinhado ADR-0014 prefix `ctr_*`).
- **D2** ✅ `repo.save(aggregate, events)` — repo abre tx, insere state + outbox atomicamente (escopo futuro — ticket #4).
- **D3** ✅ EN no wire (`event_type='ContractStateUpdated'`).
- **D4** ✅ Worker via subcomando CLI (`pnpm cli:contracts run-outbox-worker`) — escopo futuro (ticket #6).
- **D5** ✅ Port `EventDelivery` + `LoggerEventDelivery` default — escopo futuro (ticket #2).

## Escopo (apenas schema + migration; sem código consumidor)

### 1. Tabela `ctr_outbox` — eventos pendentes/processados

```sql
CREATE TABLE ctr_outbox (
  event_id        CHAR(36)        NOT NULL,          -- UUID v4 do evento
  aggregate_id    CHAR(36)        NOT NULL,          -- ContractId ou AmendmentId
  aggregate_type  VARCHAR(32)     NOT NULL,          -- 'Contract' | 'Amendment'
  event_type      VARCHAR(64)     NOT NULL,          -- PascalCase EN (ContractCreated, ContractStateUpdated, ...)
  schema_version  SMALLINT        NOT NULL,          -- 1
  occurred_at     DATETIME(3)     NOT NULL,          -- timestamp do domain event
  enqueued_at     DATETIME(3)     NOT NULL,          -- INSERT na outbox (audit)
  processed_at    DATETIME(3)     NULL,              -- worker marca após delivery OK
  attempts        SMALLINT        NOT NULL DEFAULT 0,
  payload         VARCHAR(8192)   NOT NULL,          -- JSON serializado (PROIBIDO JSON nativo — ADR-0020)
  PRIMARY KEY (event_id),
  CONSTRAINT ctr_outbox_attempts_nonneg_chk CHECK (attempts >= 0),
  CONSTRAINT ctr_outbox_event_type_nonempty_chk CHECK (CHAR_LENGTH(event_type) > 0),
  CONSTRAINT ctr_outbox_aggregate_type_chk CHECK (aggregate_type IN ('Contract', 'Amendment'))
);

-- Índice composto (processed_at NULL primeiro) — worker faz range scan eficiente
CREATE INDEX ctr_outbox_processed_at_occurred_at_idx
  ON ctr_outbox (processed_at, occurred_at);

-- Índice para auditoria por agregado
CREATE INDEX ctr_outbox_aggregate_id_idx
  ON ctr_outbox (aggregate_id);
```

**Justificativa do `VARCHAR(8192)` para payload:** ADR-0020 proíbe JSON nativo MySQL. 8KB cobre eventos do domínio com folga (maior atual: `ContractStateUpdated` com snapshot ≈ 500 bytes serializado).

### 2. Tabela `ctr_outbox_dead_letter` — eventos que falharam N vezes

```sql
CREATE TABLE ctr_outbox_dead_letter (
  event_id        CHAR(36)        NOT NULL,
  aggregate_id    CHAR(36)        NOT NULL,
  aggregate_type  VARCHAR(32)     NOT NULL,
  event_type      VARCHAR(64)     NOT NULL,
  schema_version  SMALLINT        NOT NULL,
  occurred_at     DATETIME(3)     NOT NULL,
  enqueued_at     DATETIME(3)     NOT NULL,           -- copiado da outbox original
  failed_at       DATETIME(3)     NOT NULL,           -- timestamp do roteamento para dead letter
  attempts        SMALLINT        NOT NULL,           -- max attempts atingido
  last_error      VARCHAR(2048)   NOT NULL,           -- tag + payload do erro tagged
  payload         VARCHAR(8192)   NOT NULL,           -- copiado da outbox original
  PRIMARY KEY (event_id),
  CONSTRAINT ctr_outbox_dlq_aggregate_type_chk CHECK (aggregate_type IN ('Contract', 'Amendment'))
);

CREATE INDEX ctr_outbox_dlq_failed_at_idx
  ON ctr_outbox_dead_letter (failed_at);
```

### 3. Tabela `eventos_processados` — idempotência do consumer

> **Nota linguística:** ADR-0015 §"Idempotência" usa o nome `eventos_processados` em PT-BR (linguagem ubíqua do domínio do consumer). Isso é exceção justificada — tabela conceitual cross-módulo (não tem prefix `ctr_*`).

```sql
CREATE TABLE eventos_processados (
  consumer_id     VARCHAR(64)     NOT NULL,           -- e.g., 'logger-default', 'financial-module'
  event_id        CHAR(36)        NOT NULL,
  processed_at    DATETIME(3)     NOT NULL,
  PRIMARY KEY (consumer_id, event_id)
);

-- Índice para auditoria temporal
CREATE INDEX eventos_processados_processed_at_idx
  ON eventos_processados (processed_at);
```

### 4. Migration Drizzle

```
src/modules/contracts/adapters/persistence/migrations/mysql/<timestamp>-outbox.sql
```

Gerada via `pnpm run db:generate` após declarar as 3 tabelas em `schemas/mysql.ts`.

### 5. Declarações em `schemas/mysql.ts`

Adicionar 3 `mysqlTable` definitions: `ctrOutbox`, `ctrOutboxDeadLetter`, `eventosProcessados`. Indices via `index('name').on(...)`. CHECK constraints via `check('name', sql\`...\`)`.

## Critérios de aceitação

- **CA1** — `ctr_outbox`, `ctr_outbox_dead_letter`, `eventos_processados` definidas em `schemas/mysql.ts`.
- **CA2** — 3 índices criados: `ctr_outbox_processed_at_occurred_at_idx`, `ctr_outbox_aggregate_id_idx`, `ctr_outbox_dlq_failed_at_idx`.
- **CA3** — 4 CHECK constraints: attempts >= 0, event_type não-vazio, aggregate_type IN (...) na outbox e na DLQ.
- **CA4** — Migration SQL gerada em `migrations/mysql/<timestamp>-outbox.sql` via `pnpm run db:generate`.
- **CA5** — `pnpm test:integration` continua verde (schema novo não quebra fluxo existente; tabelas vazias).
- **CA6** — Teste novo `tests/modules/contracts/adapters/persistence/outbox-schema.test.ts` valida via raw SQL:
  - INSERT em `ctr_outbox` com payload válido funciona.
  - INSERT com `attempts = -1` rejeita por CHECK.
  - INSERT com `aggregate_type = 'X'` rejeita por CHECK.
  - SELECT com filtro `processed_at IS NULL ORDER BY occurred_at` usa o índice composto (EXPLAIN).
- **CA7** — Gates W3: typecheck ✅, test ✅, lint ✅, format:check ⚠️ (README pré-existente OK).

## Não-objetivos (escopo futuro)

- Ports `OutboxPort` / `EventDelivery` → ticket #2 `CTR-OUTBOX-PORTS-AND-MAPPERS`.
- Adapter Drizzle do OutboxPort → ticket #3.
- Refactor de `repo.save(agg, events)` → ticket #4.
- Worker → ticket #5.
- CLI subcommand → ticket #6.
- `public-api/events.ts` → ticket #7.

## Riscos

1. **Schema novo + migration:** se `db:generate` produzir SQL diferente do esperado, ajustar manualmente. ADR-0020 lista features SQL permitidas — não inventar.
2. **`VARCHAR` para payload:** 8KB é suficiente para eventos atuais; revisitar se novo evento atingir o limite.
3. **`eventos_processados` sem prefix:** documentar exceção no schema (nome PT-BR justificado por ser cross-module).
4. **Mitigação Bug #47936** — Opus + checklist ativo. Ticket de schema é mecânico — deve fechar em 1 round.
