/**
 * CORE-DB-POOL-CONFIG-INVARIANT — W0 (RED) — invariante de config de pool mysql2.
 *
 * Origem: handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md
 * Lição-mãe: "config presente ≠ config com efeito". CA-8 é o teste de EFEITO (a conexão
 * ociosa fecha de fato) que o CTR-DB-DRIVER-POOL-TUNING NÃO tinha.
 *
 * DEVE FALHAR: `src/shared/persistence/mysql-pool-config.ts` (buildPoolOptions compartilhado
 * que retorna Result e garante `maxIdle < connectionLimit` por construção) ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createPool } from 'mysql2/promise';

import { buildPoolOptions } from '#src/shared/persistence/mysql-pool-config.ts';
import { mysqlTestConnectionString, mysqlTestUrl } from '#tests/support/mysql-conn.ts';

const CONN = mysqlTestConnectionString({ user: 'core', password: 'pw' });

describe('buildPoolOptions — invariante estrutural (CORE-DB-POOL-CONFIG-INVARIANT)', () => {
  it('CA-1: config válida → ok e maxIdle < connectionLimit (reaper do mysql2 arma)', () => {
    const r = buildPoolOptions({ connectionString: CONN, connectionLimit: 10 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.ok(
      r.value.maxIdle! < r.value.connectionLimit!,
      `maxIdle (${String(r.value.maxIdle)}) deve ser < connectionLimit (${String(r.value.connectionLimit)})`,
    );
    assert.ok(r.value.maxIdle! >= 1);
  });

  it('CA-2: maxIdle explícito >= connectionLimit → err(pool-config-idle-timeout-inert)', () => {
    const r = buildPoolOptions({ connectionString: CONN, connectionLimit: 10, maxIdle: 10 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'pool-config-idle-timeout-inert');
  });

  it('CA-3: connectionLimit < 1 → err(pool-config-connection-limit-invalid)', () => {
    const r = buildPoolOptions({ connectionString: CONN, connectionLimit: 0 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'pool-config-connection-limit-invalid');
  });

  it('CA-4: maxIdle explícito < 1 → err(pool-config-max-idle-invalid)', () => {
    const r = buildPoolOptions({ connectionString: CONN, connectionLimit: 10, maxIdle: 0 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'pool-config-max-idle-invalid');
  });

  it('CA-5: default preserva timezone Z / idleTimeout 270_000 / enableKeepAlive / waitForConnections', () => {
    const r = buildPoolOptions({ connectionString: CONN });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.timezone, 'Z');
    assert.equal(r.value.idleTimeout, 270_000);
    assert.equal(r.value.enableKeepAlive, true);
    assert.equal(r.value.waitForConnections, true);
    // Invariante mesmo no default: reaper sempre arma.
    assert.ok(r.value.maxIdle! < r.value.connectionLimit!);
  });

  it('CA-6: overrides válidos (connectionLimit/maxIdle/idleTimeoutMs) refletem no PoolOptions', () => {
    const r = buildPoolOptions({
      connectionString: CONN,
      connectionLimit: 8,
      maxIdle: 3,
      idleTimeoutMs: 120_000,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.connectionLimit, 8);
    assert.equal(r.value.maxIdle, 3);
    assert.equal(r.value.idleTimeout, 120_000);
  });
});

// CA-8 — teste de EFEITO: prova que uma conexão ociosa é DE FATO fechada após idleTimeout
// (a contagem viva converge para maxIdle). É o que faltava no ticket original — presença de
// campo nunca provou reciclagem. Opt-in MYSQL_INTEGRATION=1, validar no x99 (nunca Docker no Mac).
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const EFFECT_CONN = mysqlTestUrl();

describe('buildPoolOptions — EFEITO de reaping (CA-8)', { skip: !integrationEnabled() }, () => {
  it('CA-8: conexões ociosas acima de maxIdle fecham após idleTimeout', async () => {
    const built = buildPoolOptions({
      connectionString: EFFECT_CONN,
      connectionLimit: 4,
      maxIdle: 1,
      idleTimeoutMs: 1500,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;

    const pool = createPool(built.value);
    try {
      // Adquire 4 conexões concorrentes (sobe o pool ao connectionLimit) e libera todas.
      const conns = await Promise.all([0, 1, 2, 3].map(() => pool.getConnection()));
      for (const c of conns) c.release();

      // Aguarda além do idleTimeout — o reaper deve fechar as ociosas acima de maxIdle.
      await new Promise((resolve) => {
        setTimeout(resolve, 3500);
      });

      // Internals do mysql2: conexões vivas convergem para maxIdle (1).
      const core = (
        pool as unknown as { pool: { _allConnections: { toArray: () => readonly unknown[] } } }
      ).pool;
      const alive = core._allConnections.toArray().length;
      assert.ok(
        alive <= 1,
        `esperava <= maxIdle(1) conexões vivas após idleTimeout, veio ${alive}`,
      );
    } finally {
      await pool.end();
    }
  });
});
