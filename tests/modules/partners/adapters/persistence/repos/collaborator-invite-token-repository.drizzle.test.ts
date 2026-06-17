/**
 * PAR-COLLABORATOR-SELF-REGISTRATION (US5) — repo Drizzle/MySQL do invite-token —
 * gated MYSQL_INTEGRATION=1. Roda contra MySQL real (docker compose); `applyMigrations`
 * exercita a migration 0014 (`par_invite_tokens`). Sem o env, a suite é skipped.
 *
 * Foco: round-trip save/findByTokenHash + **atomicidade do `markUsed`** (2ª chamada → false:
 * anti-replay do uso-único, a garantia que o `auth` find→save NÃO tem).
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCollaboratorInviteTokenStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const ISSUED = new Date('2026-01-10T08:00:00.000Z');
const EXPIRES = new Date('2026-01-17T08:00:00.000Z'); // +7 dias

const buildToken = (over: { tokenHash?: string } = {}) => {
  const r = InviteToken.issue({
    id: InviteTokenId.generate(),
    collaboratorId: CollaboratorId.generate(),
    tokenHash: over.tokenHash ?? 'a'.repeat(64),
    issuedAt: ISSUED,
    expiresAt: EXPIRES,
  });
  if (!r.ok) throw new Error(`fixture invite-token: ${r.error}`);
  return r.value;
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
    if (handle !== null) await handle.db.delete(handle.schema.parInviteTokens);
  });

  describe('DrizzleCollaboratorInviteTokenStore', () => {
    it('save → findByTokenHash round-trip (pending)', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorInviteTokenStore(handle).repository;
      const token = buildToken();
      assert.equal((await repo.save(token)).ok, true);

      const found = await repo.findByTokenHash(token.tokenHash);
      assert.equal(found.ok, true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.id, token.id);
        assert.equal(found.value.collaboratorId, token.collaboratorId);
        assert.equal(found.value.usedAt, null);
      }
    });

    it('findByTokenHash desconhecido → ok(null)', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorInviteTokenStore(handle).repository;
      const found = await repo.findByTokenHash('f'.repeat(64));
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
    });

    it('markUsed atômico: 1ª → true; 2ª (replay) → false', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorInviteTokenStore(handle).repository;
      const token = buildToken();
      await repo.save(token);

      const first = await repo.markUsed(token.id, ISSUED);
      assert.equal(first.ok, true);
      if (first.ok) assert.equal(first.value, true);

      const second = await repo.markUsed(token.id, ISSUED);
      assert.equal(second.ok, true);
      if (second.ok) assert.equal(second.value, false);

      const found = await repo.findByTokenHash(token.tokenHash);
      assert.equal(found.ok, true);
      if (found.ok && found.value !== null) assert.notEqual(found.value.usedAt, null);
    });

    it('markUsed em id inexistente → ok(false)', async () => {
      if (handle === null) return;
      const repo = createDrizzleCollaboratorInviteTokenStore(handle).repository;
      const ghost = await repo.markUsed(InviteTokenId.generate(), ISSUED);
      assert.equal(ghost.ok, true);
      if (ghost.ok) assert.equal(ghost.value, false);
    });
  });
}
