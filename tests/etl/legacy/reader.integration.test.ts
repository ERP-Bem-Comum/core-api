import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import { readLegacyData } from '#scripts/etl/legacy/reader.ts';
import { archiveCollaboratorHistory } from '#scripts/etl/legacy/history-archive.ts';
import { loadLegacyFixture } from '../helpers/load-fixture.ts';

// Integração gated (ETL-LEGACY-DIRECT-CONNECTION) — SEM Docker. Requer um MySQL apontado por
// ETL_LEGACY_CONNECTION_STRING (service do CI); a fixture SINTÉTICA (dados fake) é carregada
// via mysql2. Sem o opt-in + a env, `pnpm test` PULA (nunca RED). JAMAIS o dump de produção.
const LEGACY_CONN = process.env['ETL_LEGACY_CONNECTION_STRING'];
const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1' && LEGACY_CONN !== undefined;
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';
const ARCHIVE = 'scripts/etl/archive/collaborator_history.test.jsonl';

const skipReason = RUN
  ? false
  : 'PARTNERS_ETL_INTEGRATION!=1 ou ETL_LEGACY_CONNECTION_STRING ausente';

describe('READER integration — fixture (mysql2) → read → decode', { skip: skipReason }, () => {
  before(async () => {
    await loadLegacyFixture(LEGACY_CONN!, FIXTURE);
  });

  it('lê e decodifica as 4 entidades + arquiva o history', async () => {
    const data = await readLegacyData();
    const archived = await archiveCollaboratorHistory(ARCHIVE);

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
});
