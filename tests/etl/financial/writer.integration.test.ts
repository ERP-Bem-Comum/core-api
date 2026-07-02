/**
 * Integração full-cycle do writer financeiro (ETL-FINANCIAL-WRITER).
 *
 * SEM Docker (ETL-LEGACY-DIRECT-CONNECTION): legado via ETL_LEGACY_CONNECTION_STRING (fixture
 * SINTÉTICA carregada por mysql2) e core-api destino via ETL_CORE_CONNECTION_STRING. Opt-in
 * PARTNERS_ETL_INTEGRATION=1 + as URLs; sem elas `pnpm test` PULA (nunca RED). Sequência de
 * negócio real: parceiros → contratos → financeiro (o remap exige as ondas anteriores no
 * destino). JAMAIS o dump de produção.
 *
 * Verifica: balanço, F4→Draft, F5→ExcludedByDecision, aprovador via join D11
 * (approvals.userId NULL), soma líquida migrada, e idempotência (2ª rodada tudo
 * already-exists com de-para regenerado).
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

import { runEtl } from '#scripts/etl/main.ts';
import { runContractsEtl } from '#scripts/etl/contracts/main.ts';
import { runFinancialEtl } from '#scripts/etl/financial/main.ts';
import { loadLegacyFixture } from '../helpers/load-fixture.ts';

const LEGACY_CONN = process.env['ETL_LEGACY_CONNECTION_STRING'];
const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1' && LEGACY_CONN !== undefined;
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

const CORE_CONN =
  process.env['ETL_CORE_CONNECTION_STRING'] ??
  `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;

const skipReason = RUN
  ? false
  : 'PARTNERS_ETL_INTEGRATION!=1 ou ETL_LEGACY_CONNECTION_STRING ausente';

const financialOpts = {
  connectionString: CORE_CONN,
  contractsDeparaPath: '.tmp/etl-contracts/de-para.jsonl',
  cedenteDocument: 'PENDENTE-D6',
  dryRun: false,
} as const;

describe('FINANCIAL WRITER integration — legado → core-api destino', { skip: skipReason }, () => {
  before(async () => {
    await loadLegacyFixture(LEGACY_CONN!, FIXTURE);
  });

  it('migra fixture (pós-parceiros+contratos): balanço, F4/F5, aprovador D11, soma', async () => {
    const partners = await runEtl({ connectionString: CORE_CONN, dryRun: false });
    assert.ok(partners.ok, `parceiros deve suceder: ${JSON.stringify(partners)}`);

    const contracts = await runContractsEtl({ connectionString: CORE_CONN, dryRun: false });
    assert.ok(contracts.ok, `contratos deve suceder: ${JSON.stringify(contracts)}`);

    const r = await runFinancialEtl(financialOpts);
    assert.ok(r.ok, `financeiro deve suceder: ${JSON.stringify(r)}`);
    if (!r.ok) return;
    const report = r.value;

    // Fixture: 1 account; 4 payables = 1 approved + 1 open + 1 draft (F4) + 1 excluído (F5).
    assert.equal(report.accounts.read, 1);
    assert.equal(report.accounts.quarantined, 0);
    assert.equal(report.payables.read, 4);
    assert.equal(report.payables.migrated, 3);
    assert.equal(report.payables.quarantined, 1, 'só o payable 45 (ExcludedByDecision)');
    assert.deepEqual(report.byKind, { open: 1, approved: 1, draft: 1 });
    for (const tally of [report.accounts, report.payables]) {
      assert.ok(tally.read === tally.migrated + tally.quarantined + tally.alreadyExists);
    }

    // Soma líquida migrada (Open+Approved; Draft fora): 500.00 + 250.25.
    assert.equal(report.migratedNetCents, 75025);

    // De-para: 3 documentos + 1 cedente; quarentena com a decisão F5.
    const depara = (await readFile('.tmp/etl-financial/de-para.jsonl', 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
    assert.equal(depara.filter((d) => d['entity'] === 'document').length, 3);
    assert.equal(depara.filter((d) => d['entity'] === 'cedente-account').length, 1);

    // Extras (W2 R1 issue 2): categorização/installments legados preservados no de-para.
    const doc1 = depara.find((d) => d['entity'] === 'document' && d['legacyId'] === 1);
    assert.ok(doc1);
    const cat = doc1['legacyCategorization'] as Readonly<Record<string, unknown>> | null;
    assert.ok(cat !== null && cat['legacyCostCenterId'] === 10);
    const inst = doc1['legacyInstallments'] as Readonly<Record<string, unknown>> | null;
    assert.ok(inst !== null && inst['count'] === 1 && inst['sumCents'] === 50000);

    // Aprovação ÓRFÃ (F2): payable 2 é LANÇADO mas tem registro de aprovação.
    const orphans = depara.filter((d) => d['entity'] === 'orphan-approval');
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0]?.['payableLegacyId'], 2);

    const summary = await readFile('.tmp/etl-financial/quarantine.summary.jsonl', 'utf8');
    assert.ok(summary.includes('"ExcludedByDecision"'));
  });

  it('idempotência: 2ª rodada tudo already-exists e de-para regenerado', async () => {
    const second = await runFinancialEtl(financialOpts);
    assert.ok(second.ok);
    if (!second.ok) return;

    assert.equal(second.value.payables.migrated, 0);
    assert.equal(second.value.payables.alreadyExists, 3);
    assert.equal(second.value.payables.quarantined, 1);
    assert.equal(second.value.accounts.migrated, 0);
    assert.equal(second.value.accounts.alreadyExists, 1);

    const depara = (await readFile('.tmp/etl-financial/de-para.jsonl', 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
    const docs = depara.filter((d) => d['entity'] === 'document');
    assert.equal(docs.length, 3, 'de-para regenerado, sem acúmulo entre runs');
    assert.ok(docs.every((d) => d['alreadyExisted'] === true));
  });
});
