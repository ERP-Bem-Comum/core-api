import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { withLegacyMysql } from '#scripts/etl/legacy/restore.ts';
import { readLegacyData } from '#scripts/etl/legacy/reader.ts';
import { archiveCollaboratorHistory } from '#scripts/etl/legacy/history-archive.ts';

// Integração gated (opt-in PARTNERS_ETL_INTEGRATION=1) — sobe o MySQL efêmero via Docker.
// Sem o opt-in, `pnpm test` pula (nunca falha). Roda via `pnpm run test:integration:etl`.
// Usa o dump SINTÉTICO (dados fake) — JAMAIS o dump de produção.
const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1';
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';
const ARCHIVE = 'scripts/etl/archive/collaborator_history.test.jsonl';

// Skip-guard de daemon (FIN-TEST-INFRA-SKIP-GUARD): mesmo com o opt-in, sem o daemon
// Docker vivo a suite é pulada — nunca RED por ambiente offline.
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
  'READER integration — restore (dump sintético) → read → decode',
  { skip: skipReason },
  () => {
    it('restaura, lê e decodifica as 4 entidades + arquiva o history', async () => {
      const result = await withLegacyMysql(FIXTURE, async () => {
        const data = await readLegacyData();
        const archived = await archiveCollaboratorHistory(ARCHIVE);
        return { data, archived };
      });

      assert.ok(result.ok, `restore+read deve suceder: ${JSON.stringify(result)}`);
      if (!result.ok) return;
      const { data, archived } = result.value;

      assert.equal(data.financiers.rows.length, 1);
      assert.equal(data.suppliers.rows.length, 2);
      assert.equal(data.collaborators.rows.length, 2);
      assert.equal(data.users.rows.length, 1);

      // `password` jamais decodificado (D6 + segurança).
      const user = data.users.rows[0];
      assert.ok(user);
      assert.ok(!('password' in user));
      assert.equal(user.massApprovalPermission, 1);

      // Colaborador inativo (active=0) decodificado; datas viraram Date.
      const inactive = data.collaborators.rows.find((c) => c.id === 2);
      assert.ok(inactive);
      assert.equal(inactive.active, 0);
      assert.ok(inactive.createdAt instanceof Date);

      // ETL-SUPPLIER-RATING-MAPPING: avaliação decodificada de verdade (backstop contra
      // typo de coluna — nNum/nStr toleram ausência devolvendo null em silêncio).
      const ratedSupplier = data.suppliers.rows.find((s) => s.id === 1);
      assert.ok(ratedSupplier);
      assert.equal(ratedSupplier.serviceEvaluation, 5);
      assert.equal(ratedSupplier.commentEvaluation, 'Otimo fornecedor');
      const unratedSupplier = data.suppliers.rows.find((s) => s.id === 2);
      assert.ok(unratedSupplier);
      assert.equal(unratedSupplier.serviceEvaluation, null);
      assert.equal(unratedSupplier.commentEvaluation, null);

      // D11: collaborator_history exportado para cold storage.
      assert.equal(archived, 2);
    });
  },
);
