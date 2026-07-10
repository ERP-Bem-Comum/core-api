/**
 * CORE-WORKER-RUNNER-POOL-REGISTRY — W0 (RED) — registry de pools com dedup por connection-string.
 *
 * Origem: issue #407 + Incident-0001 (causa #2: proliferação de pools). Como todas as
 * *_DATABASE_URL apontam para o MESMO RDS/db `core`/user `core_app` (ADR-0014, isolamento por
 * prefixo de tabela), o registry deduplica: N workers com a mesma URL → 1 pool compartilhado.
 *
 * DEVE FALHAR: `src/shared/persistence/pool-registry.ts` (createPoolRegistry) ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createPoolRegistry } from '#src/shared/persistence/pool-registry.ts';

const URL_A = 'mysql://core_app:pw@127.0.0.1:3306/core';
const URL_B = 'mysql://core_app:pw@10.0.0.9:3306/core';

describe('PoolRegistry — dedup por connection-string (CORE-WORKER-RUNNER-POOL-REGISTRY)', () => {
  it('CA-1: getOrCreate(url) cria 1 pool na 1ª chamada (ok)', async () => {
    const registry = createPoolRegistry();
    const r = registry.getOrCreate(URL_A);
    assert.equal(r.ok, true);
    await registry.closeAll();
  });

  it('CA-2: getOrCreate(mesma url) 2× → MESMO pool (dedup, não cria outro)', async () => {
    const registry = createPoolRegistry();
    const r1 = registry.getOrCreate(URL_A);
    const r2 = registry.getOrCreate(URL_A);
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, true);
    if (!r1.ok || !r2.ok) return;
    assert.equal(r1.value, r2.value, 'a 2ª chamada deve reusar a MESMA referência de pool');
    await registry.closeAll();
  });

  it('CA-3: getOrCreate(urlA) vs getOrCreate(urlB) → pools distintos', async () => {
    const registry = createPoolRegistry();
    const rA = registry.getOrCreate(URL_A);
    const rB = registry.getOrCreate(URL_B);
    assert.equal(rA.ok, true);
    assert.equal(rB.ok, true);
    if (!rA.ok || !rB.ok) return;
    assert.notEqual(rA.value, rB.value, 'URLs distintas devem gerar pools distintos');
    await registry.closeAll();
  });

  it('CA-4: config inválida (connectionLimit 0) propaga err de buildPoolOptions, sem criar pool', () => {
    const registry = createPoolRegistry({ connectionLimit: 0 });
    const r = registry.getOrCreate(URL_A);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'pool-config-connection-limit-invalid');
  });

  it('CA-5: closeAll() fecha todos os pools e é idempotente', async () => {
    const registry = createPoolRegistry();
    registry.getOrCreate(URL_A);
    registry.getOrCreate(URL_B);
    await registry.closeAll();
    // idempotente — segunda chamada não lança.
    await registry.closeAll();
    // após closeAll, o registry recomeça vazio: nova criação para a mesma URL é um pool novo.
    const again = createPoolRegistry();
    const r = again.getOrCreate(URL_A);
    assert.equal(r.ok, true);
    await again.closeAll();
  });
});

// CA-9 — dedup REAL de conexões contra o RDS: N "workers" na MESMA connection-string compartilham
// UM pool (não N pools). É o núcleo do ganho da issue #407 contra o Incident-0001. Opt-in
// MYSQL_INTEGRATION=1, validar no x99 (memory validate-mysql-always-x99-never-mac-docker).
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const EFFECT_CONN =
  process.env['MYSQL_TEST_URL'] ?? 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

describe('PoolRegistry — dedup real de conexões (CA-9)', { skip: !integrationEnabled() }, () => {
  it('CA-9: 3 getOrCreate na MESMA url → 1 pool; conexões vêm do pool único (não 3×)', async () => {
    const registry = createPoolRegistry({ connectionLimit: 4 });
    const p1 = registry.getOrCreate(EFFECT_CONN);
    const p2 = registry.getOrCreate(EFFECT_CONN);
    const p3 = registry.getOrCreate(EFFECT_CONN);
    assert.ok(p1.ok && p2.ok && p3.ok);
    if (!p1.ok || !p2.ok || !p3.ok) return;
    // Dedup: as 3 "montagens de worker" recebem a MESMA referência de pool.
    assert.equal(p1.value, p2.value);
    assert.equal(p2.value, p3.value);
    try {
      // Adquire 4 conexões concorrentes via o pool único — todas resolvem (1 pool serve os 3 workers).
      const conns = await Promise.all([0, 1, 2, 3].map(() => p1.value.getConnection()));
      const [rows] = await conns[0]!.query('SELECT 1 AS ok');
      assert.ok(Array.isArray(rows), 'o pool deve conectar ao RDS de verdade');
      for (const c of conns) c.release();
      // 1 pool → conexões vivas ≤ connectionLimit (4), não 3×4.
      const core = (
        p1.value as unknown as { pool: { _allConnections: { toArray: () => readonly unknown[] } } }
      ).pool;
      const alive = core._allConnections.toArray().length;
      assert.ok(alive <= 4, `esperava ≤ connectionLimit(4) — 1 pool, não 3×; veio ${alive}`);
    } finally {
      await registry.closeAll();
    }
  });
});
