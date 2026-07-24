/**
 * CTR-OUTBOX-SCHEMA — W0 (RED) — validação E2E do schema MySQL
 *
 * Cobre os CAs do ticket #1 da série Outbox:
 *   CA6-T1 — INSERT em `ctr_outbox` com payload válido é round-trip correto.
 *   CA6-T2 — INSERT com `attempts = -1` rejeita pelo CHECK `ctr_outbox_attempts_nonneg_chk`.
 *   CA6-T3 — INSERT com `aggregate_type = 'X'` rejeita pelo CHECK `ctr_outbox_aggregate_type_chk`.
 *   CA6-T4 — EXPLAIN de SELECT pendente usa o índice composto `ctr_outbox_processed_at_occurred_at_idx`.
 *   CA6-T5 — INSERT em `ctr_outbox_dead_letter` com `aggregate_type = 'Invalid'` rejeita pelo CHECK.
 *
 * Padrão de integração (alinhado com drizzle-mysql.test.ts):
 *   - Guard por variável `MYSQL_INTEGRATION=1`.
 *   - 1 handle MySQL compartilhado (before/after).
 *   - Tabelas outbox truncadas em beforeEach (independência entre testes).
 *   - Raw SQL via `handle.db.execute(sql`...`)` — Drizzle handle não conhece as
 *     tabelas outbox ainda em W0; o teste usa sql raw para ser agnóstico ao schema TS.
 *
 * Estado esperado em W0: RED — as 3 tabelas outbox não existem → erros de
 * "Table doesn't exist" em todos os testes de integração.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { sql } from 'drizzle-orm';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = mysqlTestConnectionString();

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// ─── UUIDs fixos para testes ─────────────────────────────────────────────────
const EVENT_ID_1 = 'eeeeeeee-0001-4001-8001-000000000001';
const EVENT_ID_2 = 'eeeeeeee-0002-4001-8001-000000000002';
const EVENT_ID_3 = 'eeeeeeee-0003-4001-8001-000000000003';
const EVENT_ID_DLQ = 'eeeeeeee-dead-4001-8001-000000000004';
const AGGREGATE_ID = 'aaaaaaaa-0001-4001-8001-000000000001';

// ─── Truncate das tabelas outbox em FK-safe order ────────────────────────────
// `eventos_processados` e `ctr_outbox_dead_letter` não têm FK com `ctr_outbox`
// (DLQ recebe cópia, não FK), então a ordem não é crítica — mas truncar
// separadamente é mais explícito e seguro.
const truncateOutbox = async (handle: MysqlHandle): Promise<void> => {
  await handle.db.execute(sql`DELETE FROM eventos_processados`);
  await handle.db.execute(sql`DELETE FROM ctr_outbox_dead_letter`);
  await handle.db.execute(sql`DELETE FROM ctr_outbox`);
};

// ─── Helper: verifica se um erro (possivelmente encadeado via `cause`) ────────
// contém indicação de CHECK constraint violada.
// O Drizzle wraps o erro mysql2 em `Error('Failed query: ...')` e coloca o erro
// original em `err.cause`. mysql2 por sua vez expõe `errno: 3819` (ER_CHECK_CONSTRAINT_VIOLATED)
// e `code: 'ER_CHECK_CONSTRAINT_VIOLATED'` no objeto de erro.
const isCheckConstraintError = (err: unknown): boolean => {
  const candidates: unknown[] = [err];
  if (err instanceof Error && err.cause !== undefined) {
    candidates.push(err.cause);
  }
  return candidates.some((e) => {
    const msg = String(e instanceof Error ? e.message : e).toLowerCase();
    if (
      msg.includes('check') ||
      msg.includes('constraint') ||
      msg.includes('3819') ||
      msg.includes('er_check_constraint_violated')
    ) {
      return true;
    }
    // mysql2 expõe `errno` e `code` direto no objeto Error
    if (typeof e === 'object' && e !== null) {
      const asObj = e as Record<string, unknown>;
      if (asObj['errno'] === 3819) return true;
      if (typeof asObj['code'] === 'string' && asObj['code'].toLowerCase().includes('check')) {
        return true;
      }
    }
    return false;
  });
};

// ─── Guard: todos os testes de integração encapsulados em `if` ───────────────
if (integrationEnabled()) {
  let handle: MysqlHandle | null = null;

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) {
      throw new Error(`fixture: openMysql falhou — ${r.error}`);
    }
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  beforeEach(async () => {
    if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
    await truncateOutbox(handle);
  });

  // ─── CA6-T1 — INSERT válido e round-trip ─────────────────────────────────
  describe('CTR-OUTBOX-SCHEMA — CA6-T1: INSERT válido em ctr_outbox', () => {
    it('CA6-T1: INSERT com payload válido persiste e o SELECT retorna a row', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');

      const occurredAt = new Date('2026-05-21T12:00:00.000Z');
      const enqueuedAt = new Date('2026-05-21T12:00:00.100Z');
      const payloadJson = JSON.stringify({
        aggregateId: AGGREGATE_ID,
        eventType: 'ContractCreated',
        occurredAt: occurredAt.toISOString(),
      });

      // INSERT
      await handle.db.execute(sql`
        INSERT INTO ctr_outbox
          (event_id, aggregate_id, aggregate_type, event_type, schema_version,
           occurred_at, enqueued_at, processed_at, attempts, payload)
        VALUES
          (${EVENT_ID_1}, ${AGGREGATE_ID}, ${'Contract'}, ${'ContractCreated'}, ${1},
           ${occurredAt}, ${enqueuedAt}, ${null}, ${0}, ${payloadJson})
      `);

      // SELECT round-trip
      const rows = await handle.db.execute(sql`
        SELECT event_id, aggregate_type, event_type, schema_version, attempts, payload
        FROM ctr_outbox
        WHERE event_id = ${EVENT_ID_1}
      `);

      // mysql2 retorna array de rows como primeiro elemento de ResultSetHeader.
      // `as unknown as unknown[]` necessário: ResultSetHeader não sobrepõe diretamente
      // unknown[] (regra do projeto: `as unknown as T` quando cast inevitável).
      const rowArray = rows[0] as unknown as unknown[];
      assert.equal(rowArray.length, 1, 'deve retornar exatamente 1 row');

      const row = rowArray[0] as Record<string, unknown>;
      assert.equal(row['event_id'], EVENT_ID_1, 'event_id deve ser o UUID inserido');
      assert.equal(row['aggregate_type'], 'Contract', 'aggregate_type deve ser "Contract"');
      assert.equal(row['event_type'], 'ContractCreated', 'event_type deve ser "ContractCreated"');
      assert.equal(Number(row['schema_version']), 1, 'schema_version deve ser 1');
      assert.equal(Number(row['attempts']), 0, 'attempts deve ser 0');
      assert.equal(row['payload'], payloadJson, 'payload deve ser round-trip idêntico');
    });
  });

  // ─── CA6-T2 — CHECK attempts >= 0 ────────────────────────────────────────
  describe('CTR-OUTBOX-SCHEMA — CA6-T2: CHECK ctr_outbox_attempts_nonneg_chk', () => {
    it('CA6-T2: INSERT com attempts = -1 rejeita com erro de CHECK constraint', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');

      const occurredAt = new Date('2026-05-21T12:00:00.000Z');
      const enqueuedAt = new Date('2026-05-21T12:00:00.100Z');
      const payloadJson = JSON.stringify({ test: 'attempts-negative' });

      await assert.rejects(
        async () =>
          handle!.db.execute(sql`
            INSERT INTO ctr_outbox
              (event_id, aggregate_id, aggregate_type, event_type, schema_version,
               occurred_at, enqueued_at, processed_at, attempts, payload)
            VALUES
              (${EVENT_ID_2}, ${AGGREGATE_ID}, ${'Contract'}, ${'ContractCreated'}, ${1},
               ${occurredAt}, ${enqueuedAt}, ${null}, ${-1}, ${payloadJson})
          `),
        (err: unknown) => {
          assert.ok(
            isCheckConstraintError(err),
            `erro esperado de CHECK constraint (errno 3819); recebido: ${String(err instanceof Error ? err.message : err)}`,
          );
          return true;
        },
        'INSERT com attempts=-1 deve rejeitar pelo CHECK ctr_outbox_attempts_nonneg_chk',
      );
    });
  });

  // ─── CA6-T3 — CHECK aggregate_type IN ('Contract','Amendment') ───────────
  describe('CTR-OUTBOX-SCHEMA — CA6-T3: CHECK ctr_outbox_aggregate_type_chk', () => {
    it("CA6-T3: INSERT com aggregate_type = 'X' rejeita com erro de CHECK constraint", async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');

      const occurredAt = new Date('2026-05-21T12:00:00.000Z');
      const enqueuedAt = new Date('2026-05-21T12:00:00.100Z');
      const payloadJson = JSON.stringify({ test: 'aggregate-type-invalid' });

      await assert.rejects(
        async () =>
          handle!.db.execute(sql`
            INSERT INTO ctr_outbox
              (event_id, aggregate_id, aggregate_type, event_type, schema_version,
               occurred_at, enqueued_at, processed_at, attempts, payload)
            VALUES
              (${EVENT_ID_3}, ${AGGREGATE_ID}, ${'X'}, ${'ContractCreated'}, ${1},
               ${occurredAt}, ${enqueuedAt}, ${null}, ${0}, ${payloadJson})
          `),
        (err: unknown) => {
          assert.ok(
            isCheckConstraintError(err),
            `erro esperado de CHECK constraint (errno 3819); recebido: ${String(err instanceof Error ? err.message : err)}`,
          );
          return true;
        },
        "INSERT com aggregate_type='X' deve rejeitar pelo CHECK ctr_outbox_aggregate_type_chk",
      );
    });
  });

  // ─── CA6-T4 — EXPLAIN usa índice composto ────────────────────────────────
  //
  // Valida que o plano de execução da query do worker usa o índice
  // `ctr_outbox_processed_at_occurred_at_idx` (ADR-0015 §"Sobre o índice").
  // A query canônica do worker é:
  //   SELECT ... WHERE processed_at IS NULL ORDER BY occurred_at LIMIT 10
  //
  // O EXPLAIN retorna um array de rows; verificamos que ao menos uma row
  // contém o nome do índice no campo `key` ou `possible_keys`.
  describe('CTR-OUTBOX-SCHEMA — CA6-T4: EXPLAIN usa índice composto', () => {
    it('CA6-T4: EXPLAIN SELECT WHERE processed_at IS NULL ORDER BY occurred_at usa ctr_outbox_processed_at_occurred_at_idx', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');

      const explainRows = await handle.db.execute(sql`
        EXPLAIN SELECT event_id, aggregate_id, aggregate_type, event_type,
                       schema_version, occurred_at, enqueued_at, attempts, payload
        FROM ctr_outbox
        WHERE processed_at IS NULL
        ORDER BY occurred_at
        LIMIT 10
      `);

      // `as unknown as unknown[]` — mesmo padrão: ResultSetHeader não sobrepõe unknown[].
      const rows = explainRows[0] as unknown as unknown[];
      assert.ok(rows.length > 0, 'EXPLAIN deve retornar ao menos 1 row');

      // Verifica em qualquer row do plano se o índice composto aparece
      const INDEX_NAME = 'ctr_outbox_processed_at_occurred_at_idx';
      const usesIndex = rows.some((r) => {
        const row = r as Record<string, unknown>;
        // Narrowing explícito antes de String() — regra @typescript-eslint/no-base-to-string.
        // row[*] é unknown; verificamos se é string; se não for, tratamos como ''.
        const rawPk = row['possible_keys'];
        const rawKey = row['key'];
        const possibleKeys = typeof rawPk === 'string' ? rawPk : '';
        const key = typeof rawKey === 'string' ? rawKey : '';
        return possibleKeys.includes(INDEX_NAME) || key.includes(INDEX_NAME);
      });

      assert.ok(
        usesIndex,
        `EXPLAIN deve usar o índice '${INDEX_NAME}' para a query do worker ` +
          '(ADR-0015 §"Sobre o índice"). Plan: ' +
          JSON.stringify(rows, null, 2),
      );
    });
  });

  // ─── CA6-T5 — CHECK DLQ aggregate_type ───────────────────────────────────
  describe('CTR-OUTBOX-SCHEMA — CA6-T5: CHECK ctr_outbox_dlq_aggregate_type_chk', () => {
    it("CA6-T5: INSERT em ctr_outbox_dead_letter com aggregate_type = 'Invalid' rejeita CHECK", async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');

      const occurredAt = new Date('2026-05-21T12:00:00.000Z');
      const enqueuedAt = new Date('2026-05-21T12:00:00.100Z');
      const failedAt = new Date('2026-05-21T12:05:00.000Z');
      const payloadJson = JSON.stringify({ test: 'dlq-invalid-type' });

      await assert.rejects(
        async () =>
          handle!.db.execute(sql`
            INSERT INTO ctr_outbox_dead_letter
              (event_id, aggregate_id, aggregate_type, event_type, schema_version,
               occurred_at, enqueued_at, failed_at, attempts, last_error, payload)
            VALUES
              (${EVENT_ID_DLQ}, ${AGGREGATE_ID}, ${'Invalid'}, ${'ContractCreated'}, ${1},
               ${occurredAt}, ${enqueuedAt}, ${failedAt}, ${3},
               ${'max-retries-exceeded'}, ${payloadJson})
          `),
        (err: unknown) => {
          assert.ok(
            isCheckConstraintError(err),
            `erro esperado de CHECK constraint na DLQ (errno 3819); recebido: ${String(err instanceof Error ? err.message : err)}`,
          );
          return true;
        },
        "INSERT com aggregate_type='Invalid' na DLQ deve rejeitar pelo CHECK ctr_outbox_dlq_aggregate_type_chk",
      );
    });
  });
}
