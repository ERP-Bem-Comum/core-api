/**
 * Integração gated do reader de contratos (ETL-CONTRACTS-WRITER) — mesmo molde do
 * reader.integration.test.ts de parceiros: opt-in PARTNERS_ETL_INTEGRATION=1 +
 * skip-guard de daemon Docker. Usa o dump SINTÉTICO — JAMAIS o de produção.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { withLegacyMysql } from '#scripts/etl/legacy/restore.ts';
import { readLegacyContractsData } from '#scripts/etl/contracts/reader.ts';

const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1';
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

// Probe do daemon SÓ com o opt-in ligado (evita até 5s de latência no `pnpm test`
// puro com daemon fora — sugestão do W2).
const dockerDaemonUp = ((): boolean => {
  if (!RUN) return false;
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
})();

const skipReason = !RUN
  ? 'PARTNERS_ETL_INTEGRATION!=1'
  : !dockerDaemonUp
    ? 'Docker daemon offline'
    : null;

describe(
  'readLegacyContractsData (integração, MySQL efêmero)',
  { skip: skipReason ?? false },
  () => {
    it('lê e decodifica contracts + programs da fixture', async () => {
      const r = await withLegacyMysql(FIXTURE, async () => readLegacyContractsData());
      assert.ok(r.ok, `restore falhou: ${JSON.stringify(r.ok ? null : r.error)}`);
      const data = r.value;

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
  },
);
