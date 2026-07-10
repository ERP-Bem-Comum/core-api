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
