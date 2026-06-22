/**
 * CORE-MIGRATE-JOB — Slice A — Wave W0 (RED) — CA1
 *
 * Cada módulo com persistência expõe `applyMigrations(connStr)` no seu public-api
 * (`public-api/migrate.ts`) — único ponto público de migração (ADR-0006, não vaza
 * adapters). Aqui validamos só o CONTRATO (é função); o comportamento real (migra
 * de fato) é integração gated nos testes `*.integration.test.ts` de cada driver.
 *
 * RED esperado: nenhum `public-api/migrate.ts` existe ainda → o import falha.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { applyMigrations as authApply } from '#src/modules/auth/public-api/migrate.ts';
import { applyMigrations as contractsApply } from '#src/modules/contracts/public-api/migrate.ts';
import { applyMigrations as financialApply } from '#src/modules/financial/public-api/migrate.ts';
import { applyMigrations as notificationsApply } from '#src/modules/notifications/public-api/migrate.ts';
import { applyMigrations as partnersApply } from '#src/modules/partners/public-api/migrate.ts';
import { applyMigrations as programsApply } from '#src/modules/programs/public-api/migrate.ts';

describe('public-api migrate — contrato dos 6 módulos — CORE-MIGRATE-JOB W0 (CA1)', () => {
  it('CA1: cada módulo expõe applyMigrations como função', () => {
    const fns = [
      ['auth', authApply],
      ['contracts', contractsApply],
      ['financial', financialApply],
      ['notifications', notificationsApply],
      ['partners', partnersApply],
      ['programs', programsApply],
    ] as const;
    for (const [module, fn] of fns) {
      assert.equal(typeof fn, 'function', `${module}.applyMigrations deveria ser função`);
    }
  });
});
