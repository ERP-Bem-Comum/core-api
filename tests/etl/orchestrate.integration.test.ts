/**
 * W0 RED (gated) — orquestrador ETL ponta-a-ponta, 2 DBs (PARTNERS-ETL-ORCHESTRATOR 3b-ii).
 *
 * Espelha tests/etl/legacy/reader.integration.test.ts: opt-in PARTNERS_ETL_INTEGRATION=1 +
 * skip-guard de daemon Docker (offline → skip, NUNCA RED). Sobe o MySQL efêmero legado
 * (compose.etl.yaml, leitura) E um core-api efêmero (escrita) contra o dump SINTÉTICO.
 * Verifica idempotência (rodar 2× não duplica) + reconciliação balanceada.
 *
 * Sem o opt-in, `pnpm test` PULA (nunca falha). Roda via `pnpm run test:integration:etl:orchestrate`.
 * Usa o dump SINTÉTICO (dados fake) — JAMAIS o dump de produção.
 *
 * RED esperado: `#scripts/etl/main.ts` (runEtl) ainda NÃO existe — import falha por API inexistente.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

// API SOB TESTE — entrypoint orquestrador real (wiring dos ports + withLegacyMysql). NÃO existe (RED).
import { runEtl } from '#scripts/etl/main.ts';

const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1';
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

// Connection-string do core-api de destino. O script `test:integration:etl:orchestrate`
// sobe o serviço `mysql` (compose.yaml) e injeta os secrets; aqui só consumimos a env
// (default = MySQL local em ${MYSQL_PORT:-3306}, alinhado a auth/partners port tests).
const CORE_CONN =
  process.env['ETL_CORE_CONNECTION_STRING'] ??
  `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;

const dockerDaemonUp = ((): boolean => {
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
  'ORCHESTRATOR integration — legado efêmero → core-api efêmero (2 DBs)',
  { skip: skipReason },
  () => {
    it('migra o dump sintético inteiro e reconcilia balanceado por entidade', async () => {
      const r = await runEtl({ dumpPath: FIXTURE, connectionString: CORE_CONN, dryRun: false });

      assert.ok(r.ok, `ETL deve suceder: ${JSON.stringify(r)}`);
      if (!r.ok) return;
      const report = r.value;

      // Volumes do dump sintético (mesmos do reader.integration.test.ts).
      assert.equal(report.suppliers.read, 2);
      assert.equal(report.financiers.read, 1);
      assert.equal(report.collaborators.read, 2);
      assert.equal(report.users.read, 1);

      // Invariante de reconciliação + contrato da fixture: ela é 100% migrável.
      // `quarantined === 0` torna explícito que NENHUMA linha pode cair em quarentena
      // (ex.: CNPJ/CPF duplicado violando UNIQUE no destino). Sem este guard, uma
      // fixture suja passaria aqui (reconciliação balanceada) e só explodiria no teste
      // de idempotência com o obscuro `alreadyExists !== read`.
      for (const tally of [
        report.suppliers,
        report.financiers,
        report.collaborators,
        report.users,
      ]) {
        assert.equal(tally.quarantined, 0, 'fixture sintética deve ser 100% migrável');
        assert.ok(tally.read === tally.migrated + tally.quarantined + tally.alreadyExists);
      }
    });

    it('idempotência: rodar 2× não duplica (2ª rodada tudo already-exists)', async () => {
      const first = await runEtl({ dumpPath: FIXTURE, connectionString: CORE_CONN, dryRun: false });
      assert.ok(first.ok);

      const second = await runEtl({
        dumpPath: FIXTURE,
        connectionString: CORE_CONN,
        dryRun: false,
      });
      assert.ok(second.ok);
      if (!second.ok) return;

      // 2ª rodada: nada migrado de novo, tudo já existe.
      assert.equal(second.value.suppliers.migrated, 0);
      assert.equal(second.value.suppliers.alreadyExists, second.value.suppliers.read);
    });
  },
);
