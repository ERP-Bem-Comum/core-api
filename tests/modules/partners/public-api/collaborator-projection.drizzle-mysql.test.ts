// Integração: listCollaboratorsForProjection (partners public-api → reports REP-1 · #238).
// Semeia um collaborator real e valida a projeção das 9 colunas LGPD-safe contra par_collaborators.
// GATE: só roda com MYSQL_INTEGRATION=1 (registrado em test:integration:partners).

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import type { PartnersMysqlHandle } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.ts';
import { openCollaboratorProjectionReader } from '#src/modules/partners/public-api/collaborator-projection.ts';

const CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const NINE_KEYS = [
  'active',
  'education',
  'employmentRelationship',
  'experienceInPublicSector',
  'id',
  'name',
  'program',
  'registrationStatus',
  'role',
  'startOfContract',
];

if (process.env['MYSQL_INTEGRATION'] !== '1') {
  process.stdout.write(
    '[partners:collaborator-projection] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('listCollaboratorsForProjection — Drizzle + MySQL (REP-1 · #238)', () => {
    let handle: PartnersMysqlHandle;

    before(async () => {
      const r = await openPartnersMysql({ connectionString: CONN, applyMigrations: true });
      if (!r.ok) throw new Error(`open: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      await handle.db.delete(handle.schema.parCollaborators);
    });

    it('CA4: projeta as 9 colunas LGPD-safe de par_collaborators (program: null)', async () => {
      const reg = Collaborator.register({
        id: CollaboratorId.generate(),
        name: 'Maria Silva',
        email: 'maria.silva@bemcomum.org',
        cpf: '111.444.777-35',
        occupationArea: 'PARC',
        role: 'Educadora',
        startOfContract: new Date('2025-02-01T00:00:00.000Z'),
        employmentRelationship: 'CLT',
        registeredAt: clock.now(),
      });
      if (!reg.ok) throw new Error(`fixture: ${reg.error}`);
      const repo = createDrizzleCollaboratorStore(handle, clock);
      assert.equal((await repo.save(reg.value.collaborator)).ok, true);

      // Reader boot-scoped: abre pool uma vez, reusa, fecha no fim (não por operação).
      const readerR = await openCollaboratorProjectionReader({ connectionString: CONN });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.value.length, 1);
      const m = r.value[0]!;
      assert.equal(m.name, 'Maria Silva');
      assert.equal(m.role, 'Educadora');
      assert.equal(m.employmentRelationship, 'CLT');
      assert.equal(m.startOfContract, '2025-02-01', 'date-only YYYY-MM-DD');
      assert.equal(m.registrationStatus, 'PreRegistration');
      assert.equal(m.active, true);
      assert.equal(m.program, null, 'programa não existe no core-api → null');

      // LGPD (CA3): o objeto projetado tem EXATAMENTE as 9 chaves — nada sensível vaza.
      assert.deepEqual([...Object.keys(m)].sort(), [...NINE_KEYS].sort());
    });
  });
}
