/**
 * PARTNERS-COLLABORATOR-PERSISTENCE — repo Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * DEVE FALHAR em W0 (createDrizzleCollaboratorStore inexistente). Roda contra MySQL
 * real (docker compose). Truncate no beforeEach. Sem este env, suite é skipped.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const buildActive = (over: { cpf?: string; email?: string; programId?: string | null } = {}) => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: over.email ?? 'maria.silva@bemcomum.org',
    cpf: over.cpf ?? '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: clock.now(),
    ...(over.programId !== undefined ? { programId: over.programId } : {}),
  });
  if (!r.ok) throw new Error(`fixture collaborator: ${r.error}`);
  return r.value.collaborator;
};

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
    if (handle !== null) await handle.db.delete(handle.schema.parCollaborators);
  });

  describe('DrizzleCollaboratorStore', () => {
    it('save → findById round-trip', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      const c = buildActive();
      assert.equal(isOk(await repo.save(c)), true);

      const found = await repo.findById(c.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.cpf, c.cpf);
        assert.equal(found.value.status, 'Active');
        assert.equal(found.value.registrationStatus, 'PreRegistration');
      }
    });

    it('findByCpf acha o persistido', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      await repo.save(buildActive());
      const cpf = Cpf.parse('111.444.777-35');
      if (cpf.ok) {
        const found = await repo.findByCpf(cpf.value);
        assert.equal(isOk(found), true);
        if (found.ok) assert.notEqual(found.value, null);
      }
    });

    it('findByEmail acha o persistido', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      await repo.save(buildActive());
      const found = await repo.findByEmail('maria.silva@bemcomum.org');
      assert.equal(isOk(found), true);
      if (found.ok) assert.notEqual(found.value, null);
    });

    it('list retorna os persistidos', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      await repo.save(buildActive());
      const listed = await repo.list();
      assert.equal(isOk(listed), true);
      if (listed.ok) assert.equal(listed.value.length, 1);
    });

    it('CPF duplicado (id distinto) → collaborator-cpf-duplicate', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      await repo.save(buildActive());
      const dup = await repo.save(buildActive({ email: 'outra@bemcomum.org' }));
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'collaborator-cpf-duplicate');
    });

    it('email duplicado (id distinto) → collaborator-email-duplicate', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      await repo.save(buildActive());
      const dup = await repo.save(buildActive({ cpf: '529.982.247-25' }));
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'collaborator-email-duplicate');
    });

    // ── programId round-trip (0009_outstanding_stingray.sql) ──────────────────
    // Prova que a migration 0009 aplicou a coluna program_id e que o mapper faz
    // o round-trip com UUID preenchido e com null.

    it('programId preenchido — round-trip salva e relê o UUID corretamente', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      const programUuid = 'f1234567-89ab-4cde-8000-000000000001';
      const c = buildActive({ programId: programUuid });
      assert.equal(isOk(await repo.save(c)), true);

      const found = await repo.findById(c.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.programId, programUuid, 'programId deve ser o UUID semeado');
      }
    });

    it('programId null — round-trip persiste e relê null corretamente', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorStore(handle, clock);
      const c = buildActive({ programId: null });
      assert.equal(isOk(await repo.save(c)), true);

      const found = await repo.findById(c.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.programId, null, 'programId deve ser null quando não vinculado');
      }
    });
  });
}
