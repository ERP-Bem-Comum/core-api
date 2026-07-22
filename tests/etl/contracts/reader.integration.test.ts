/**
 * Integração gated do reader de contratos (ETL-CONTRACTS-WRITER) — mesmo molde do
 * reader.integration.test.ts de parceiros: opt-in PARTNERS_ETL_INTEGRATION=1 +
 * ETL_LEGACY_CONNECTION_STRING (ETL-LEGACY-DIRECT-CONNECTION, sem Docker). A fixture
 * SINTÉTICA é carregada via mysql2 — JAMAIS o dump de produção.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import { readLegacyContractsData } from '#scripts/etl/contracts/reader.ts';
import { loadLegacyFixture } from '../helpers/load-fixture.ts';

const LEGACY_CONN = process.env['ETL_LEGACY_CONNECTION_STRING'];
const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1' && LEGACY_CONN !== undefined;
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

const skipReason = RUN
  ? false
  : 'PARTNERS_ETL_INTEGRATION!=1 ou ETL_LEGACY_CONNECTION_STRING ausente';

describe('readLegacyContractsData (integração, fixture via mysql2)', { skip: skipReason }, () => {
  before(async () => {
    await loadLegacyFixture(LEGACY_CONN!, FIXTURE);
  });

  it('lê e decodifica contracts + programs da fixture', async () => {
    const data = await readLegacyContractsData();

    assert.equal(data.programs.rows.length, 1);
    assert.equal(data.programs.failures.length, 0);
    const program = data.programs.rows[0];
    assert.ok(program);
    assert.equal(program.abbreviation, 'PFAKE');
    assert.equal(program.logo, 'https://legado/logo.png');

    assert.equal(data.contracts.rows.length, 3);
    assert.equal(data.contracts.failures.length, 0);
    const first = data.contracts.rows.find((c) => c.id === 1);
    assert.ok(first);
    assert.equal(first.contractCode, '000000001/2025');
    assert.equal(first.contractStatus, 'Em andamento');
    assert.equal(first.supplierId, 1);
    assert.equal(first.programId, 1);
    assert.equal(first.budgetPlanId, 7);
    assert.ok(first.contractPeriodStart instanceof Date);
    assert.equal(first.signedContractUrl, 'https://legado/contrato1.pdf');
  });
});
