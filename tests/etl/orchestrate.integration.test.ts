/**
 * Integração (gated) — orquestrador ETL ponta-a-ponta, 2 DBs (PARTNERS-ETL-ORCHESTRATOR 3b-ii).
 *
 * SEM Docker (ETL-LEGACY-DIRECT-CONNECTION): o legado vem de ETL_LEGACY_CONNECTION_STRING
 * (fixture SINTÉTICA carregada via mysql2) e o core-api destino de ETL_CORE_CONNECTION_STRING.
 * Opt-in PARTNERS_ETL_INTEGRATION=1 + as duas URLs; sem elas `pnpm test` PULA (nunca RED).
 * Verifica idempotência (rodar 2× não duplica) + reconciliação balanceada. JAMAIS o dump de produção.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import { runEtl } from '#scripts/etl/main.ts';
import { loadLegacyFixture } from './helpers/load-fixture.ts';

const LEGACY_CONN = process.env['ETL_LEGACY_CONNECTION_STRING'];
const CORE_CONN = process.env['ETL_CORE_CONNECTION_STRING'];
const RUN =
  process.env['PARTNERS_ETL_INTEGRATION'] === '1' &&
  LEGACY_CONN !== undefined &&
  CORE_CONN !== undefined;
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

const skipReason = RUN
  ? false
  : 'PARTNERS_ETL_INTEGRATION!=1 ou ETL_LEGACY_CONNECTION_STRING/ETL_CORE_CONNECTION_STRING ausentes';

describe('ORCHESTRATOR integration — legado → core-api (2 DBs)', { skip: skipReason }, () => {
  before(async () => {
    await loadLegacyFixture(LEGACY_CONN!, FIXTURE);
  });

  it('migra o dump sintético inteiro e reconcilia balanceado por entidade', async () => {
    const r = await runEtl({ connectionString: CORE_CONN!, dryRun: false });

    assert.ok(r.ok, `ETL deve suceder: ${JSON.stringify(r)}`);
    if (!r.ok) return;
    const report = r.value;

    // Volumes do dump sintético (mesmos do reader.integration.test.ts).
    assert.equal(report.suppliers.read, 2);
    assert.equal(report.financiers.read, 1);
    assert.equal(report.collaborators.read, 3);
    assert.equal(report.users.read, 1);

    // Invariante de reconciliação + contrato da fixture: ela é 100% migrável.
    // `quarantined === 0` torna explícito que NENHUMA linha pode cair em quarentena
    // (ex.: CNPJ/CPF duplicado violando UNIQUE no destino). Sem este guard, uma
    // fixture suja passaria aqui (reconciliação balanceada) e só explodiria no teste
    // de idempotência com o obscuro `alreadyExists !== read`.
    for (const tally of [report.suppliers, report.financiers, report.collaborators, report.users]) {
      assert.equal(tally.quarantined, 0, 'fixture sintética deve ser 100% migrável');
      assert.ok(tally.read === tally.migrated + tally.quarantined + tally.alreadyExists);
    }
  });

  it('idempotência: rodar 2× não duplica (2ª rodada tudo already-exists)', async () => {
    const first = await runEtl({ connectionString: CORE_CONN!, dryRun: false });
    assert.ok(first.ok);

    const second = await runEtl({ connectionString: CORE_CONN!, dryRun: false });
    assert.ok(second.ok);
    if (!second.ok) return;

    // 2ª rodada: nada migrado de novo, tudo já existe.
    assert.equal(second.value.suppliers.migrated, 0);
    assert.equal(second.value.suppliers.alreadyExists, second.value.suppliers.read);
  });
});
