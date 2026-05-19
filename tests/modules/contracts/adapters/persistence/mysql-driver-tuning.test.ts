/**
 * CTR-DB-DRIVER-POOL-TUNING — W0 (RED)
 *
 * Cobre:
 *   CA-9  — `buildPoolOptions` retorna `timezone: 'Z'` (M2) + `idleTimeout: 270_000` (H3).
 *   CA-10 — caller pode sobrescrever via `idleTimeoutMs`.
 *   CA-11 (integration, opt-in) — `SELECT @@session.time_zone` ⇒ `+00:00` após `openMysql`.
 *   CA-12 (integration, opt-in) — default `applyMigrations === false` (M5).
 *
 * No W0 RED, este arquivo NÃO compila por causa do import `buildPoolOptions`
 * que ainda não existe — esse é o sinal de RED esperado.
 *
 * Sustentação:
 *   - audit `handbook/reviews/0002-audit-adapters-persistence-mysql.md` §H3, §M2, §M5.
 *   - best-practice MySQL `handbook/reference/mysql/best-practices/jusdb/03-timeout-variables-production-guide.md` §"Pool–MySQL alignment".
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { sql } from 'drizzle-orm';

import {
  openMysql,
  buildPoolOptions,
} from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';

// Credenciais sincronizadas com `pnpm test:integration`.
const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const DUMMY_ROOT_PWD = 'rootpw-migration-test-only';
const CONTAINER = 'core-api-mysql';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';
const skipReason = (): string =>
  integrationEnabled() ? 'unexpected' : 'MYSQL_INTEGRATION≠1 (rode `pnpm test:integration`)';

const resetCoreDatabase = (): void => {
  spawnSync(
    'bash',
    [
      '-c',
      `docker exec ${CONTAINER} mysql --protocol=tcp -h 127.0.0.1 -uroot -p"${DUMMY_ROOT_PWD}" -e "DROP DATABASE IF EXISTS core; CREATE DATABASE core CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" mysql`,
    ],
    { encoding: 'utf-8', timeout: 15_000 },
  );
};

// ─── CA-9 — defaults estruturais do pool ──────────────────────────────────
describe('CTR-DB-DRIVER-POOL-TUNING — CA-9: defaults do pool (estrutural)', () => {
  it('CA-9.1: buildPoolOptions inclui timezone="Z" (audit §M2)', () => {
    const opts = buildPoolOptions({ connectionString: VALID_CONN });
    assert.equal(opts.timezone, 'Z');
  });

  it('CA-9.2: buildPoolOptions inclui idleTimeout=270_000 (audit §H3, best-practice 03)', () => {
    const opts = buildPoolOptions({ connectionString: VALID_CONN });
    assert.equal(opts.idleTimeout, 270_000);
  });

  it('CA-9.3: defaults preservados — enableKeepAlive, keepAliveInitialDelay, waitForConnections', () => {
    const opts = buildPoolOptions({ connectionString: VALID_CONN });
    assert.equal(opts.enableKeepAlive, true);
    assert.equal(opts.keepAliveInitialDelay, 10_000);
    assert.equal(opts.waitForConnections, true);
    assert.equal(opts.queueLimit, 0);
  });
});

// ─── CA-10 — idleTimeoutMs custom ─────────────────────────────────────────
describe('CTR-DB-DRIVER-POOL-TUNING — CA-10: override de idleTimeoutMs', () => {
  it('CA-10.1: caller passa idleTimeoutMs e o valor vence o default', () => {
    const opts = buildPoolOptions({ connectionString: VALID_CONN, idleTimeoutMs: 60_000 });
    assert.equal(opts.idleTimeout, 60_000);
  });

  it('CA-10.2: idleTimeoutMs omitido cai no default 270_000', () => {
    const opts = buildPoolOptions({ connectionString: VALID_CONN });
    assert.equal(opts.idleTimeout, 270_000);
  });
});

// ─── CA-11 — integration: session time_zone = +00:00 ──────────────────────
describe('CTR-DB-DRIVER-POOL-TUNING — CA-11: session time_zone (integration)', () => {
  it('CA-11: SELECT @@session.time_zone retorna +00:00 após openMysql', async (t) => {
    if (!integrationEnabled()) {
      t.skip(skipReason());
      return;
    }
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: false });
    assert.ok(r.ok, `openMysql falhou: ${!r.ok ? r.error : ''}`);
    if (!r.ok) return;
    try {
      const result = await r.value.db.execute(sql`SELECT @@session.time_zone AS tz`);
      // mysql2 retorna [rows, fields]; drizzle.execute devolve diretamente um array de rows.
      // Defensivo: aceitar ambos os shapes.
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      const first = (rows as readonly { tz?: unknown }[])[0];
      assert.ok(first, 'esperava ao menos 1 row');
      assert.equal(first.tz, '+00:00', 'session.time_zone deve ser +00:00 — audit §M2');
    } finally {
      await r.value.close();
    }
  });
});

// ─── CA-12 — integration: default applyMigrations === false ──────────────
describe('CTR-DB-DRIVER-POOL-TUNING — CA-12: default applyMigrations (integration)', () => {
  it('CA-12: openMysql sem applyMigrations NÃO aplica migrations (M5 prod-safe)', async (t) => {
    if (!integrationEnabled()) {
      t.skip(skipReason());
      return;
    }
    // Reset hard — sem tabelas do domínio.
    resetCoreDatabase();

    const r = await openMysql({ connectionString: VALID_CONN }); // sem applyMigrations
    assert.ok(r.ok, `openMysql falhou: ${!r.ok ? r.error : ''}`);
    if (!r.ok) return;

    try {
      // SELECT em tabela do domínio: deve falhar com ER 1146 (Table doesn't exist).
      let raised: Error | null = null;
      try {
        await r.value.db.execute(sql`SELECT * FROM ctr_contracts LIMIT 1`);
      } catch (e) {
        raised = e instanceof Error ? e : new Error(JSON.stringify(e));
      }
      assert.ok(
        raised !== null,
        'esperava erro ER_NO_SUCH_TABLE em ctr_contracts — default applyMigrations deveria ser false',
      );
      assert.match(
        raised.message,
        /doesn't exist|ER_NO_SUCH_TABLE/,
        'mensagem deve indicar tabela inexistente',
      );
    } finally {
      await r.value.close();
    }
  });
});
