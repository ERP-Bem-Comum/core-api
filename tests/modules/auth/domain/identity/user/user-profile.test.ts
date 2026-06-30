/**
 * W0 (RED) - Tests para a extensao de perfil do agregado User (modulo auth).
 *
 * Ticket: AUTH-USER-PROFILE-AGG (spec 005-gestao-usuarios, Foundational).
 *
 * Cobre CA1..CA5 do 000-request (CA6 = nao-regressao, coberto por user.test.ts):
 *   - CA1: register cria ActiveUser com perfil vazio (campos null)
 *   - CA2: updateProfile aplica name/cpf/telephone/collaboratorId + UserProfileUpdated (sem PII)
 *   - CA3: updateProfile parcial preserva os demais campos
 *   - CA4: setPhoto define/remove photo + UserProfileUpdated
 *   - CA5: enable transforma DisabledUser em ActiveUser + UserEnabled
 *
 * DEVEM FALHAR em W0 - updateProfile/setPhoto/enable e os campos de perfil ainda nao existem.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import * as Telephone from '#src/modules/auth/domain/identity/telephone.ts';
import * as ProfilePhotoRef from '#src/modules/auth/domain/identity/profile-photo-ref.ts';

// --- helpers de setup (throw em teste e permitido) ---
const email = (raw: string): Email.Email => {
  const r = Email.parse(raw);
  if (!r.ok) throw new Error('setup email');
  return r.value;
};
const hash = (raw: string): PasswordHash.PasswordHash => {
  const r = PasswordHash.fromString(raw);
  if (!r.ok) throw new Error('setup hash');
  return r.value;
};
const cpf = (raw: string): Cpf.Cpf => {
  const r = Cpf.parse(raw);
  if (!r.ok) throw new Error('setup cpf');
  return r.value;
};
const telephone = (raw: string): Telephone.Telephone => {
  const r = Telephone.parse(raw);
  if (!r.ok) throw new Error('setup telephone');
  return r.value;
};
const photoRef = (raw: string): ProfilePhotoRef.ProfilePhotoRef => {
  const r = ProfilePhotoRef.parse(raw);
  if (!r.ok) throw new Error('setup photo');
  return r.value;
};

const AT = new Date('2026-06-07T12:00:00.000Z');

const buildActive = (): User.ActiveUser => {
  const { user } = User.register(
    {
      id: UserId.generate(),
      email: email('user@example.com'),
      passwordHash: hash('$argon2id$x'),
      roles: [],
    },
    AT,
  );
  return user;
};

describe('User.register (perfil vazio)', () => {
  it('CA1: register cria ActiveUser com campos de perfil null', () => {
    const u = buildActive();

    assert.equal(u.name, null);
    assert.equal(u.cpf, null);
    assert.equal(u.telephone, null);
    assert.equal(u.photo, null);
    assert.equal(u.collaboratorId, null);
  });
});

describe('User.updateProfile', () => {
  it('CA2: aplica name/cpf/telephone/collaboratorId + UserProfileUpdated', () => {
    const u = buildActive();
    const { user, event } = User.updateProfile(
      u,
      {
        name: 'Amanda Manoel',
        cpf: cpf('52998224725'),
        telephone: telephone('15997133502'),
        collaboratorId: 'collab-123',
      },
      AT,
    );

    assert.equal(user.name, 'Amanda Manoel');
    assert.equal(user.cpf, '52998224725');
    assert.equal(user.telephone, '15997133502');
    assert.equal(user.collaboratorId, 'collab-123');
    assert.equal(event.type, 'UserProfileUpdated');
    assert.equal(event.userId, u.id);
    assert.deepEqual(event.occurredAt, AT);
    // sem PII no payload do evento
    const values = Object.values(event as Record<string, unknown>);
    assert.equal(values.includes('Amanda Manoel'), false);
    assert.equal(values.includes('52998224725'), false);
  });

  it('CA3: patch parcial (so name) preserva os demais campos', () => {
    const base = User.updateProfile(
      buildActive(),
      { name: 'Antigo', telephone: telephone('15997133502') },
      AT,
    ).user;

    const { user } = User.updateProfile(base, { name: 'Novo Nome' }, AT);

    assert.equal(user.name, 'Novo Nome');
    assert.equal(user.telephone, '15997133502'); // preservado
  });
});

describe('User.setPhoto', () => {
  it('CA4: setPhoto define a foto + UserProfileUpdated', () => {
    const u = buildActive();
    const ref = photoRef('users/abc/photo.png');
    const { user, event } = User.setPhoto(u, ref, AT);

    assert.equal(user.photo, ref);
    assert.equal(event.type, 'UserProfileUpdated');
  });

  it('CA4: setPhoto(null) remove a foto', () => {
    const withPhoto = User.setPhoto(buildActive(), photoRef('users/abc/photo.png'), AT).user;
    const { user } = User.setPhoto(withPhoto, null, AT);

    assert.equal(user.photo, null);
  });
});

describe('User.enable', () => {
  it('CA5: enable transforma DisabledUser em ActiveUser + UserEnabled', () => {
    const { user: disabled } = User.disable(buildActive(), AT);

    const { user, event } = User.enable(disabled, AT);

    assert.equal(user.status, 'active');
    assert.equal(event.type, 'UserEnabled');
    assert.equal(event.userId, disabled.id);
    assert.deepEqual(event.occurredAt, AT);
  });
});
