import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import { makeInMemoryUserProfileStore } from '#src/modules/partners/adapters/persistence/repos/user-profile-repository.in-memory.ts';
import type { UserProfileRepository } from '#src/modules/partners/domain/user-profile/repository.ts';
import { createUserProfile } from '#src/modules/partners/application/use-cases/create-user-profile.ts';
import { updateUserProfileContact } from '#src/modules/partners/application/use-cases/update-user-profile-contact.ts';
import { linkCollaboratorToProfile } from '#src/modules/partners/application/use-cases/link-collaborator-to-profile.ts';
import { getUserProfile } from '#src/modules/partners/application/use-cases/get-user-profile.ts';
import { findUserProfileByCpf } from '#src/modules/partners/application/use-cases/find-user-profile-by-cpf.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

const REF_A = '7f3a1234-5678-4abc-9def-fedcba987654';
const REF_B = '00000000-0000-4000-8000-000000000000';
const CPF_A = '111.444.777-35';
const CPF_B = '529.982.247-25';

const cmd = (over: Record<string, unknown> = {}) => ({
  userRef: REF_A,
  name: 'Maria Silva',
  cpf: CPF_A,
  telephone: '11999998888',
  avatarUrl: null,
  ...over,
});

let repo: UserProfileRepository;

beforeEach(() => {
  repo = makeInMemoryUserProfileStore().repository;
});

describe('createUserProfile', () => {
  it('cria e retorna profile + UserProfileCreated', async () => {
    const r = await createUserProfile({ userProfileRepo: repo, clock })(cmd());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.profile.name, 'Maria Silva');
      assert.equal(r.value.event.type, 'UserProfileCreated');
    }
  });

  it('userRef já com perfil → already-exists', async () => {
    await createUserProfile({ userProfileRepo: repo, clock })(cmd());
    const dup = await createUserProfile({ userProfileRepo: repo, clock })(cmd({ cpf: CPF_B }));
    assert.equal(isErr(dup), true);
    if (!dup.ok) assert.equal(dup.error, 'create-user-profile-already-exists');
  });

  it('cpf de outro userRef → cpf-duplicate', async () => {
    await createUserProfile({ userProfileRepo: repo, clock })(cmd());
    const dup = await createUserProfile({ userProfileRepo: repo, clock })(cmd({ userRef: REF_B }));
    assert.equal(isErr(dup), true);
    if (!dup.ok) assert.equal(dup.error, 'create-user-profile-cpf-duplicate');
  });

  it('userRef malformado → invalid-user-ref', async () => {
    const r = await createUserProfile({ userProfileRepo: repo, clock })(cmd({ userRef: 'nope' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-user-profile-invalid-user-ref');
  });
});

describe('updateUserProfileContact / linkCollaboratorToProfile', () => {
  beforeEach(async () => {
    await createUserProfile({ userProfileRepo: repo, clock })(cmd());
  });

  it('atualiza contato persistido', async () => {
    const r = await updateUserProfileContact({ userProfileRepo: repo, clock })({
      userRef: REF_A,
      name: 'Maria Souza',
      telephone: '11888887777',
      avatarUrl: null,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.profile.name, 'Maria Souza');
  });

  it('update em userRef inexistente → not-found', async () => {
    const r = await updateUserProfileContact({ userProfileRepo: repo, clock })({
      userRef: REF_B,
      name: 'X',
      telephone: '11',
      avatarUrl: null,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'update-user-profile-not-found');
  });

  it('vincula colaborador', async () => {
    const collab = CollaboratorId.generate() as unknown as string;
    const r = await linkCollaboratorToProfile({ userProfileRepo: repo, clock })({
      userRef: REF_A,
      collaboratorId: collab,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.notEqual(r.value.profile.collaboratorRef, null);
  });

  it('vincular colaborador com id inválido → invalid-collaborator-id', async () => {
    const r = await linkCollaboratorToProfile({ userProfileRepo: repo, clock })({
      userRef: REF_A,
      collaboratorId: 'nope',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'link-collaborator-invalid-collaborator-id');
  });
});

describe('queries', () => {
  beforeEach(async () => {
    await createUserProfile({ userProfileRepo: repo, clock })(cmd());
  });

  it('getUserProfile acha por userRef e null quando ausente', async () => {
    const found = await getUserProfile({ userProfileRepo: repo })({ userRef: REF_A });
    assert.equal(isOk(found), true);
    if (found.ok) assert.notEqual(found.value, null);

    const missing = await getUserProfile({ userProfileRepo: repo })({ userRef: REF_B });
    assert.equal(isOk(missing), true);
    if (missing.ok) assert.equal(missing.value, null);
  });

  it('findUserProfileByCpf acha por cpf', async () => {
    const found = await findUserProfileByCpf({ userProfileRepo: repo })({ cpf: CPF_A });
    assert.equal(isOk(found), true);
    if (found.ok) assert.notEqual(found.value, null);
  });
});
