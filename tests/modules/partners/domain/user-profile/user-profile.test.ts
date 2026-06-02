import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');
const USER_REF = '7f3a1234-5678-4abc-9def-fedcba987654';

const userRef = () => {
  const r = UserRef.rehydrate(USER_REF);
  assert.ok(r.ok);
  return r.value;
};

const createInput = (over: Record<string, unknown> = {}) => ({
  userRef: userRef(),
  name: 'Maria Silva',
  cpf: '111.444.777-35',
  telephone: '11999998888',
  avatarUrl: null,
  createdAt: NOW,
  ...over,
});

const make = (over: Record<string, unknown> = {}) => {
  const r = UserProfile.create(createInput(over));
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.profile;
};

describe('UserProfile.create', () => {
  it('cria com cpf válido, collaboratorRef null e emite UserProfileCreated', () => {
    const r = UserProfile.create(createInput());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.profile.name, 'Maria Silva');
      assert.equal(String(r.value.profile.cpf), '11144477735');
      assert.equal(r.value.profile.collaboratorRef, null);
      assert.equal(r.value.event.type, 'UserProfileCreated');
    }
  });

  it('rejeita name vazio', () => {
    const r = UserProfile.create(createInput({ name: '   ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-profile-name-required');
  });

  it('rejeita telephone vazio', () => {
    const r = UserProfile.create(createInput({ telephone: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-profile-telephone-required');
  });

  it('rejeita cpf inválido', () => {
    const r = UserProfile.create(createInput({ cpf: '11144477700' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cpf');
  });
});

describe('UserProfile.updateContact', () => {
  it('altera name/telephone/avatarUrl e preserva cpf/userRef', () => {
    const profile = make();
    const r = UserProfile.updateContact(
      profile,
      { name: 'Maria S. Souza', telephone: '11888887777', avatarUrl: 'https://x/a.png' },
      LATER,
    );
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.profile.name, 'Maria S. Souza');
      assert.equal(r.value.profile.telephone, '11888887777');
      assert.equal(r.value.profile.avatarUrl, 'https://x/a.png');
      assert.equal(String(r.value.profile.cpf), '11144477735');
      assert.equal(r.value.profile.userRef, profile.userRef);
      assert.equal(r.value.event.type, 'UserProfileContactUpdated');
    }
  });

  it('rejeita name vazio no update', () => {
    const r = UserProfile.updateContact(
      make(),
      { name: ' ', telephone: '11', avatarUrl: null },
      LATER,
    );
    assert.equal(isErr(r), true);
  });
});

describe('UserProfile.linkCollaborator', () => {
  it('seta collaboratorRef e emite UserProfileCollaboratorLinked', () => {
    const collab = CollaboratorId.generate();
    const r = UserProfile.linkCollaborator(make(), collab, LATER);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.profile.collaboratorRef, collab);
      assert.equal(r.value.event.type, 'UserProfileCollaboratorLinked');
    }
  });
});

describe('UserProfile.rehydrate', () => {
  it('reconstrói com collaboratorRef e sem, sem evento', () => {
    const cpf = Cpf.parse('111.444.777-35');
    assert.ok(cpf.ok);
    const collab = CollaboratorId.generate();
    const withLink = UserProfile.rehydrate({
      userRef: userRef(),
      name: 'Maria',
      cpf: cpf.value,
      telephone: '11999998888',
      avatarUrl: null,
      collaboratorRef: collab,
    });
    assert.equal(isOk(withLink), true);
    if (withLink.ok) assert.equal(withLink.value.collaboratorRef, collab);

    const without = UserProfile.rehydrate({
      userRef: userRef(),
      name: 'Maria',
      cpf: cpf.value,
      telephone: '11999998888',
      avatarUrl: null,
      collaboratorRef: null,
    });
    assert.equal(isOk(without), true);
    if (without.ok) assert.equal(without.value.collaboratorRef, null);
  });
});
