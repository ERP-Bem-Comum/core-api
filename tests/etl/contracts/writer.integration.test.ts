/**
 * Integração full-cycle do writer de contratos (ETL-CONTRACTS-WRITER — W2 issue 3).
 *
 * Espelha tests/etl/orchestrate.integration.test.ts: opt-in PARTNERS_ETL_INTEGRATION=1 +
 * skip-guard de daemon Docker (offline → skip, NUNCA RED). Sobe o MySQL efêmero legado
 * e escreve num core-api de destino (env ETL_CORE_CONNECTION_STRING). Fixture sintética —
 * JAMAIS o dump de produção.
 *
 * Pré-requisito de negócio: o remap de fornecedores exige os suppliers da fixture já
 * migrados no destino — por isso o teste roda `runEtl` (parceiros) ANTES do writer.
 * Verifica: balanço, exclusão por allowlist (contrato 3), estados Active/Terminated,
 * reconcile do contador e idempotência (2ª rodada tudo already-exists, de-para regenerado).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { runEtl } from '#scripts/etl/main.ts';
import { runContractsEtl } from '#scripts/etl/contracts/main.ts';

const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1';
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

const CORE_CONN =
  process.env['ETL_CORE_CONNECTION_STRING'] ??
  `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;

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
    : false;

describe(
  'CONTRACTS WRITER integration — legado efêmero → core-api destino',
  { skip: skipReason },
  () => {
    it('migra fixture (pós-parceiros): balanço, allowlist, estados e contador', async () => {
      // Pré-condição: suppliers da fixture no destino (remap por legacy_id).
      const partners = await runEtl({
        dumpPath: FIXTURE,
        connectionString: CORE_CONN,
        dryRun: false,
      });
      assert.ok(partners.ok, `ETL de parceiros deve suceder: ${JSON.stringify(partners)}`);

      const r = await runContractsEtl({
        dumpPath: FIXTURE,
        connectionString: CORE_CONN,
        dryRun: false,
      });
      assert.ok(r.ok, `writer deve suceder: ${JSON.stringify(r)}`);
      if (!r.ok) return;
      const report = r.value;

      // Fixture: 1 programa (100% migrável) + 3 contratos (2 migráveis + 1 allowlist).
      assert.equal(report.programs.read, 1);
      assert.equal(report.programs.quarantined, 0);
      assert.equal(report.contracts.read, 3);
      assert.equal(report.contracts.quarantined, 1, 'só o contrato 3 (ExcludedByDecision)');
      for (const tally of [report.programs, report.contracts]) {
        assert.ok(tally.read === tally.migrated + tally.quarantined + tally.alreadyExists);
      }

      // Reconcile do contador: fixture tem seqs 1 e 2 em 2025 → last_seq 2.
      assert.deepEqual(report.seqReconciled, [{ year: 2025, lastSeq: 2 }]);

      // De-para: 1 programa + 2 contratos (Active + Terminated); exclusão NÃO entra.
      const depara = (await readFile('.tmp/etl-contracts/de-para.jsonl', 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
      const contracts = depara.filter((d) => d['entity'] === 'contract');
      assert.equal(contracts.length, 2);
      assert.deepEqual(
        contracts.map((c) => String(c['status'])).sort((a, b) => a.localeCompare(b)),
        ['Active', 'Terminated'],
      );

      // Quarentena: a exclusão carrega a tag e a referência da decisão.
      const summary = await readFile('.tmp/etl-contracts/quarantine.summary.jsonl', 'utf8');
      assert.ok(summary.includes('"ExcludedByDecision"'));
    });

    it('idempotência: 2ª rodada tudo already-exists e de-para REGENERADO', async () => {
      const second = await runContractsEtl({
        dumpPath: FIXTURE,
        connectionString: CORE_CONN,
        dryRun: false,
      });
      assert.ok(second.ok);
      if (!second.ok) return;

      assert.equal(second.value.contracts.migrated, 0);
      assert.equal(second.value.contracts.alreadyExists, 2);
      assert.equal(second.value.contracts.quarantined, 1);
      assert.equal(second.value.programs.migrated, 0);
      assert.equal(second.value.programs.alreadyExists, 1);

      // Artefato reprodutível (W2 issue 2): truncado por run e regenerado no already-exists.
      const depara = (await readFile('.tmp/etl-contracts/de-para.jsonl', 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
      const contracts = depara.filter((d) => d['entity'] === 'contract');
      assert.equal(contracts.length, 2, 'de-para regenerado, sem acúmulo entre runs');
      assert.ok(contracts.every((c) => c['alreadyExisted'] === true));
    });
  },
);
