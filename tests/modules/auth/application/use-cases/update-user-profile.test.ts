/**
 * W0 (RED) - updateUserProfile (modulo auth, US4 da spec 005).
 *
 * Ticket: AUTH-USECASE-UPDATE-PROFILE. Cobre CA1..CA7:
 *   CA1: altera nome/telefone -> save recebe os novos valores; demais preservados
 *   CA2: id inexistente -> err('user-not-found'); save nao chamado
 *   CA3: email de OUTRO usuario -> err('email-already-registered'); save nao chamado
 *   CA4: email do PROPRIO usuario -> sucesso, sem conflito
 *   CA5: campo invalido (cpf) -> erro do VO; save nao chamado (atomicidade)
 *   CA6: patch parcial (so nome) -> cpf/telephone/email preservados
 *   CA7: UserProfileUpdated emitido com userId; sem valores de perfil no payload
 *
 * DEVE FALHAR em W0 - update-user-profile.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { updateUserProfile } from '#src/modules/auth/application/use-cases/update-user-profile.ts';
import type {
  UserReader,
  UserRepository,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import * as Telephone from '#src/modules/auth/domain/identity/telephone.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');

const mkUser = (opts: { email: string; name: string; cpf: string; telephone: string }): User => {
  const e = Email.parse(opts.email);
  const h = PasswordHash.fromString('$argon2id$x');
  const cpf = Cpf.parse(opts.cpf);
  const tel = Telephone.parse(opts.telephone);
  if (!e.ok || !h.ok || !cpf.ok || !tel.ok) throw new Error('setup');
  const base = UserAgg.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
  return UserAgg.updateProfile(base, { name: opts.name, cpf: cpf.value, telephone: tel.value }, AT)
    .user;
};

interface Captured {
  saved: User | null;
}

const makeDeps = (users: readonly User[]) => {
  const captured: Captured = { saved: null };
  const userReader: UserReader = {
    findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
    findByEmail: (email) =>
      Promise.resolve(ok(users.find((u) => String(u.email) === String(email)) ?? null)),
  };
  const userRepo: UserRepository = {
    save: (user) => {
      captured.saved = user;
      return Promise.resolve(ok(undefined));
    },
  };
  return { deps: { userReader, userRepo, clock: ClockFixed(AT) }, captured };
};

describe('updateUserProfile', () => {
  it('CA1: altera nome e telefone; demais campos preservados', async () => {
    const u = mkUser({
      email: 'amanda@x.com',
      name: 'Amanda Manoel',
      cpf: '52998224725',
      telephone: '15997133502',
    });
    const { deps, captured } = makeDeps([u]);

    const r = await updateUserProfile(deps)({
      id: String(u.id),
      name: 'Amanda Souza',
      telephone: '15991111111',
    });

    assert.equal(r.ok, true);
    assert.ok(captured.saved !== null);
    assert.equal(captured.saved?.name, 'Amanda Souza');
    assert.equal(String(captured.saved?.telephone), '15991111111');
    // preservados
    assert.equal(String(captured.saved?.email), 'amanda@x.com');
    assert.equal(String(captured.saved?.cpf), '52998224725');
  });

  it('CA2: id inexistente -> user-not-found; save nao chamado', async () => {
    const { deps, captured } = makeDeps([]);
    const r = await updateUserProfile(deps)({ id: String(UserId.generate()), name: 'X' });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
    assert.equal(captured.saved, null);
  });

  it('CA3: email de OUTRO usuario -> email-already-registered; save nao chamado', async () => {
    const alvo = mkUser({
      email: 'alvo@x.com',
      name: 'Alvo',
      cpf: '52998224725',
      telephone: '15997133502',
    });
    const outro = mkUser({
      email: 'ocupado@x.com',
      name: 'Outro',
      cpf: '11144477735',
      telephone: '15997133503',
    });
    const { deps, captured } = makeDeps([alvo, outro]);

    const r = await updateUserProfile(deps)({ id: String(alvo.id), email: 'ocupado@x.com' });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'email-already-registered');
    assert.equal(captured.saved, null);
  });

  it('CA4: email do PROPRIO usuario -> sucesso, sem conflito', async () => {
    const u = mkUser({
      email: 'amanda@x.com',
      name: 'Amanda',
      cpf: '52998224725',
      telephone: '15997133502',
    });
    const { deps } = makeDeps([u]);

    const r = await updateUserProfile(deps)({
      id: String(u.id),
      email: 'amanda@x.com',
      name: 'Nova',
    });

    assert.equal(r.ok, true);
  });

  it('CA5: cpf invalido -> erro do VO; save nao chamado (atomicidade)', async () => {
    const u = mkUser({
      email: 'amanda@x.com',
      name: 'Amanda',
      cpf: '52998224725',
      telephone: '15997133502',
    });
    const { deps, captured } = makeDeps([u]);

    const r = await updateUserProfile(deps)({ id: String(u.id), cpf: '11111111111' });

    assert.equal(r.ok, false);
    assert.equal(captured.saved, null);
  });

  it('CA6: patch parcial (so nome) preserva cpf/telephone/email', async () => {
    const u = mkUser({
      email: 'amanda@x.com',
      name: 'Amanda',
      cpf: '52998224725',
      telephone: '15997133502',
    });
    const { deps, captured } = makeDeps([u]);

    const r = await updateUserProfile(deps)({ id: String(u.id), name: 'So Nome' });

    assert.equal(r.ok, true);
    assert.equal(captured.saved?.name, 'So Nome');
    assert.equal(String(captured.saved?.cpf), '52998224725');
    assert.equal(String(captured.saved?.telephone), '15997133502');
    assert.equal(String(captured.saved?.email), 'amanda@x.com');
  });

  it('CA7: UserProfileUpdated emitido com userId; sem valores de perfil no payload', async () => {
    const u = mkUser({
      email: 'amanda@x.com',
      name: 'Amanda',
      cpf: '52998224725',
      telephone: '15997133502',
    });
    const { deps } = makeDeps([u]);

    const r = await updateUserProfile(deps)({ id: String(u.id), name: 'Nova' });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.event.type, 'UserProfileUpdated');
      assert.equal(String(r.value.event.userId), String(u.id));
      const values = Object.values(r.value.event as Record<string, unknown>);
      assert.equal(values.includes('Nova'), false);
    }
  });
});
