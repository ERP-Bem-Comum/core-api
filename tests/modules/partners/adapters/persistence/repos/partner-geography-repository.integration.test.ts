/**
 * GEOGRAPHY-PERSISTENCE-INTEGRATION — DrizzlePartnerGeographyRepository vs MySQL real.
 *
 * Gateado: roda SOMENTE quando `MYSQL_INTEGRATION=1`. NÃO aparece em `pnpm test`.
 * Usar `pnpm run test:integration` (docker compose --wait).
 *
 * Cobre: saveState (insert/update), findStateByUf, listStates,
 *        saveMunicipality (insert/update), findMunicipalityByCode, listMunicipalities.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePartnerGeographyStore } from '#src/modules/partners/adapters/persistence/repos/partner-geography-repository.drizzle.ts';
import * as PartnerState from '#src/modules/partners/domain/geography/partner-state.ts';
import * as PartnerMunicipality from '#src/modules/partners/domain/geography/partner-municipality.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const SP_IBGE = '3550308'; // São Paulo/SP
const RJ_IBGE = '3304557'; // Rio de Janeiro/RJ

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`open failed: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) {
      await handle.db.delete(handle.schema.parMunicipalities);
      await handle.db.delete(handle.schema.parStates);
    }
  });

  const makeRepo = () => {
    if (handle === null) throw new Error('handle not open');
    return createDrizzlePartnerGeographyStore(handle, clock);
  };

  describe('DrizzlePartnerGeographyRepository — states', () => {
    it('findStateByUf de UF ausente → ok(null)', async () => {
      const repo = makeRepo();
      const r = await repo.findStateByUf('SP');
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value, null);
    });

    it('saveState insert + findStateByUf → Active', async () => {
      const repo = makeRepo();
      const parsed = PartnerState.activate('SP');
      assert.equal(parsed.ok, true);
      if (!parsed.ok) return;

      const saved = await repo.saveState(parsed.value);
      assert.equal(saved.ok, true);

      const found = await repo.findStateByUf('SP');
      assert.equal(found.ok, true);
      if (!found.ok) return;
      assert.ok(found.value !== null);
      assert.equal(found.value.uf as unknown as string, 'SP');
      assert.equal(found.value.status, 'Active');
    });

    it('saveState update (upsert) — deactivate sobrescreve registro', async () => {
      const repo = makeRepo();
      const active = PartnerState.activate('RJ');
      assert.equal(active.ok, true);
      if (!active.ok) return;

      await repo.saveState(active.value);

      const inactive = PartnerState.deactivate(active.value, clock.now());
      const saved = await repo.saveState(inactive);
      assert.equal(saved.ok, true);

      const found = await repo.findStateByUf('RJ');
      assert.equal(found.ok, true);
      if (!found.ok) return;
      assert.ok(found.value !== null);
      assert.equal(found.value.status, 'Inactive');
    });

    it('listStates retorna todos os estados persistidos', async () => {
      const repo = makeRepo();
      const sp = PartnerState.activate('SP');
      const mg = PartnerState.activate('MG');
      assert.equal(sp.ok, true);
      assert.equal(mg.ok, true);
      if (!sp.ok || !mg.ok) return;

      await repo.saveState(sp.value);
      await repo.saveState(mg.value);

      const all = await repo.listStates();
      assert.equal(all.ok, true);
      if (!all.ok) return;
      assert.equal(all.value.length, 2);
    });
  });

  describe('DrizzlePartnerGeographyRepository — municipalities', () => {
    it('findMunicipalityByCode de código ausente → ok(null)', async () => {
      const repo = makeRepo();
      const r = await repo.findMunicipalityByCode(SP_IBGE);
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value, null);
    });

    it('saveMunicipality insert + findMunicipalityByCode → Active', async () => {
      const repo = makeRepo();
      const parsed = PartnerMunicipality.activate(SP_IBGE);
      assert.equal(parsed.ok, true);
      if (!parsed.ok) return;

      const saved = await repo.saveMunicipality(parsed.value);
      assert.equal(saved.ok, true);

      const found = await repo.findMunicipalityByCode(SP_IBGE);
      assert.equal(found.ok, true);
      if (!found.ok) return;
      assert.ok(found.value !== null);
      assert.equal(found.value.ibgeCode as unknown as string, SP_IBGE);
      assert.equal(found.value.status, 'Active');
    });

    it('saveMunicipality update (upsert) — deactivate sobrescreve', async () => {
      const repo = makeRepo();
      const active = PartnerMunicipality.activate(RJ_IBGE);
      assert.equal(active.ok, true);
      if (!active.ok) return;

      await repo.saveMunicipality(active.value);

      const inactive = PartnerMunicipality.deactivate(active.value, clock.now());
      const saved = await repo.saveMunicipality(inactive);
      assert.equal(saved.ok, true);

      const found = await repo.findMunicipalityByCode(RJ_IBGE);
      assert.equal(found.ok, true);
      if (!found.ok) return;
      assert.ok(found.value !== null);
      assert.equal(found.value.status, 'Inactive');
    });

    it('listMunicipalities retorna todos os municípios persistidos', async () => {
      const repo = makeRepo();
      const sp = PartnerMunicipality.activate(SP_IBGE);
      const rj = PartnerMunicipality.activate(RJ_IBGE);
      assert.equal(sp.ok, true);
      assert.equal(rj.ok, true);
      if (!sp.ok || !rj.ok) return;

      await repo.saveMunicipality(sp.value);
      await repo.saveMunicipality(rj.value);

      const all = await repo.listMunicipalities();
      assert.equal(all.ok, true);
      if (!all.ok) return;
      assert.equal(all.value.length, 2);
    });
  });
}
