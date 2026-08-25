/**
 * CLI-RETIRE-EMBEDDED — `readWorkerConfig` (entrypoint standalone do worker de outbox).
 *
 * Substitui a cobertura de parsing do antigo `cli/commands/run-outbox-worker.ts` (removido com a CLI).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { readWorkerConfig } from '#src/modules/contracts/worker/config.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const CONN = mysqlTestConnectionString({ user: 'core_app', password: 'pw' });

describe('readWorkerConfig', () => {
  it('connection string ausente → erro', () => {
    const r = readWorkerConfig({});
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'worker-missing-connection-string');
  });

  it('defaults quando só CONTRACTS_DATABASE_URL presente', () => {
    const r = readWorkerConfig({ CONTRACTS_DATABASE_URL: CONN });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.connectionString, CONN);
    assert.equal(r.value.consumerId, 'outbox-logger-default');
    assert.equal(r.value.logFile, undefined);
    assert.deepEqual(r.value.loop, {
      batchSize: 10,
      maxAttempts: 5,
      pollIntervalMs: 100,
      idleSleepMs: 500,
    });
  });

  it('respeita overrides de OUTBOX_*', () => {
    const r = readWorkerConfig({
      CONTRACTS_DATABASE_URL: CONN,
      OUTBOX_BATCH_SIZE: '20',
      OUTBOX_MAX_ATTEMPTS: '3',
      OUTBOX_POLL_MS: '250',
      OUTBOX_IDLE_SLEEP_MS: '1000',
      OUTBOX_CONSUMER_ID: 'prod-worker-1',
      OUTBOX_LOG_FILE: '/var/log/outbox.jsonl',
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.consumerId, 'prod-worker-1');
    assert.equal(r.value.logFile, '/var/log/outbox.jsonl');
    assert.deepEqual(r.value.loop, {
      batchSize: 20,
      maxAttempts: 3,
      pollIntervalMs: 250,
      idleSleepMs: 1000,
    });
  });

  it('valores numéricos inválidos → erro específico', () => {
    const bad = (k: string): unknown =>
      readWorkerConfig({ CONTRACTS_DATABASE_URL: CONN, [k]: '0' });
    assert.equal(
      (bad('OUTBOX_BATCH_SIZE') as { error?: string }).error,
      'worker-invalid-batch-size',
    );
    assert.equal(
      (bad('OUTBOX_MAX_ATTEMPTS') as { error?: string }).error,
      'worker-invalid-max-attempts',
    );
    const neg = readWorkerConfig({ CONTRACTS_DATABASE_URL: CONN, OUTBOX_POLL_MS: '-5' });
    assert.equal(isErr(neg), true);
    if (!neg.ok) assert.equal(neg.error, 'worker-invalid-poll-ms');
    const nan = readWorkerConfig({ CONTRACTS_DATABASE_URL: CONN, OUTBOX_IDLE_SLEEP_MS: 'abc' });
    assert.equal(isErr(nan), true);
    if (!nan.ok) assert.equal(nan.error, 'worker-invalid-idle-sleep-ms');
  });
});
