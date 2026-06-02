import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import {
  userProfileToInsert,
  userProfileFromRow,
} from '#src/modules/partners/adapters/persistence/mappers/user-profile.mapper.ts';
import type { UserProfileRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const USER_REF = '7f3a1234-5678-4abc-9def-fedcba987654';

const make = (over: Record<string, unknown> = {}) => {
  const ref = UserRef.rehydrate(USER_REF);
  assert.ok(ref.ok);
  const r = UserProfile.create({
    userRef: ref.value,
    name: 'Maria Silva',
    cpf: '111.444.777-35',
    telephone: '11999998888',
    avatarUrl: null,
    createdAt: NOW,
    ...over,
  });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.profile;
};

describe('user-profile.mapper — userProfileToInsert', () => {
  it('achata o agregado (collaboratorRef null)', () => {
    const row = userProfileToInsert(make(), NOW);
    assert.equal(row.userRef, USER_REF);
    assert.equal(row.cpf, '11144477735');
    assert.equal(row.collaboratorRef, null);
    assert.equal(row.avatarUrl, null);
  });

  it('preserva collaboratorRef quando presente', () => {
    const collab = CollaboratorId.generate();
    const linked = UserProfile.linkCollaborator(make(), collab, NOW);
    assert.ok(linked.ok);
    const row = userProfileToInsert(linked.value.profile, NOW);
    assert.equal(row.collaboratorRef, collab as unknown as string);
  });
});

describe('user-profile.mapper — userProfileFromRow', () => {
  const baseRow: UserProfileRow = {
    userRef: USER_REF,
    name: 'Maria Silva',
    cpf: '11144477735',
    telephone: '11999998888',
    avatarUrl: null,
    collaboratorRef: null,
    createdAt: NOW,
    updatedAt: NOW,
    legacyId: null,
  };

  it('reconstrói sem collaboratorRef', () => {
    const r = userProfileFromRow(baseRow);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.collaboratorRef, null);
  });

  it('reconstrói com collaboratorRef', () => {
    const collab = CollaboratorId.generate() as unknown as string;
    const r = userProfileFromRow({ ...baseRow, collaboratorRef: collab });
    assert.equal(isOk(r), true);
    if (r.ok) assert.notEqual(r.value.collaboratorRef, null);
  });

  it('round-trip: fromRow(toInsert(p)) preserva userRef/cpf', () => {
    const p = make();
    const back = userProfileFromRow({
      ...userProfileToInsert(p, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as UserProfileRow);
    assert.equal(isOk(back), true);
    if (back.ok) {
      assert.equal(back.value.userRef, p.userRef);
      assert.equal(String(back.value.cpf), '11144477735');
    }
  });

  it('rejeita user_ref inválido', () => {
    assert.equal(isErr(userProfileFromRow({ ...baseRow, userRef: 'not-a-uuid' })), true);
  });

  it('rejeita cpf inválido na row', () => {
    assert.equal(isErr(userProfileFromRow({ ...baseRow, cpf: '11144477700' })), true);
  });

  it('rejeita collaborator_ref inválido', () => {
    assert.equal(isErr(userProfileFromRow({ ...baseRow, collaboratorRef: 'nope' })), true);
  });
});
