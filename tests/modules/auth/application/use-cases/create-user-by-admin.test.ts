/**
 * W0 (RED) - createUserByAdmin (modulo auth, US3 da spec 005). Design: security-backend-expert.
 *
 * Foco em SEGURANCA: placeholder nao autentica, convite 1x, URL de config (anti host-injection),
 * email dup sem side-effect, fail-closed no envio, validacao, evento sem PII, token TTL.
 *
 * DEVE FALHAR em W0 - create-user-by-admin.ts / User.create / InviteMailer ainda nao existem.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { createUserByAdmin } from '#src/modules/auth/application/use-cases/create-user-by-admin.ts';
import type { InviteMailer } from '#src/modules/auth/application/ports/invite-mailer.ts';
import type {
  UserReader,
  UserRepository,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type { PasswordResetTokenRepository } from '#src/modules/auth/domain/session/password-reset-token-repository.ts';
import type { PasswordResetTokenMinter } from '#src/modules/auth/application/ports/password-reset-token-minter.ts';
import type { PasswordResetToken } from '#src/modules/auth/domain/session/password-reset-token.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');
const TTL = 604_800; // 7 dias
const BASE_URL = 'https://app.example.com/primeiro-acesso';
const ADMIN_ID = UserId.generate();

const unusableHash = (): PasswordHash.PasswordHash => {
  const h = PasswordHash.fromString('$argon2id$v=19$dummy-placeholder');
  if (!h.ok) throw new Error('setup');
  return h.value;
};

interface Captured {
  savedUser: User | null;
  savedToken: PasswordResetToken | null;
  invites: { email: string; activationUrl: string }[];
}

const makeDeps = (opts?: {
  existingEmail?: string;
  saveFails?: boolean;
  inviteFails?: boolean;
}) => {
  const captured: Captured = { savedUser: null, savedToken: null, invites: [] };

  const userReader: UserReader = {
    findById: () => Promise.resolve(ok(null)),
    findByEmail: (email) =>
      Promise.resolve(ok(opts?.existingEmail === String(email) ? ({} as User) : null)),
  };
  const userRepo: UserRepository = {
    save: (user) => {
      if (opts?.saveFails) return Promise.resolve(err('user-repo-unavailable' as const));
      captured.savedUser = user;
      return Promise.resolve(ok(undefined));
    },
  };
  const resetTokenRepo: PasswordResetTokenRepository = {
    save: (token) => {
      captured.savedToken = token;
      return Promise.resolve(ok(undefined));
    },
    findByTokenHash: () => Promise.resolve(ok(null)),
    findUnusedByUserId: () => Promise.resolve(ok([])),
  };
  const minter: PasswordResetTokenMinter = {
    mint: () => ({ token: 'plain-token-xyz', tokenHash: 'hash-xyz' }),
    hash: (raw) => `hash-of-${raw}`,
  };
  const inviteMailer: InviteMailer = {
    sendInvite: (input) => {
      if (opts?.inviteFails) return Promise.resolve(err('invite-mail-failed' as const));
      captured.invites.push({ email: input.email, activationUrl: input.activationUrl });
      return Promise.resolve(ok(undefined));
    },
  };
  const clock = ClockFixed(AT);

  const deps = {
    userReader,
    userRepo,
    resetTokenRepo,
    minter,
    inviteMailer,
    clock,
    unusablePasswordHash: unusableHash(),
    inviteTtlSeconds: TTL,
    activationBaseUrl: BASE_URL,
  };
  return { deps, captured };
};

const validCmd = () => ({
  adminId: ADMIN_ID,
  name: 'Amanda Manoel',
  cpf: '52998224725',
  email: 'amanda@x.com',
  telephone: '15997133502',
});

describe('createUserByAdmin', () => {
  it('CA1: usuario criado com o placeholder hash (nunca uma senha)', async () => {
    const { deps, captured } = makeDeps();
    const r = await createUserByAdmin(deps)(validCmd());

    assert.equal(r.ok, true);
    assert.ok(captured.savedUser !== null);
    assert.equal(captured.savedUser?.passwordHash, deps.unusablePasswordHash);
  });

  it('CA2: convite enviado exatamente 1x com email correto e URL nao-vazia', async () => {
    const { deps, captured } = makeDeps();
    await createUserByAdmin(deps)(validCmd());

    assert.equal(captured.invites.length, 1);
    assert.equal(captured.invites[0]?.email, 'amanda@x.com');
    assert.ok((captured.invites[0]?.activationUrl ?? '').length > 0);
  });

  it('CA3: URL de ativacao usa a base de config (anti host-injection); sem fragmento do command', async () => {
    const { deps, captured } = makeDeps();
    await createUserByAdmin(deps)(validCmd());

    const url = captured.invites[0]?.activationUrl ?? '';
    assert.ok(url.startsWith(`${BASE_URL}?token=`), `url inesperada: ${url}`);
    assert.equal(url.includes('amanda'), false); // nao vaza email/nome na URL
  });

  it('CA4: email duplicado -> err e userRepo.save NAO chamado', async () => {
    const { deps, captured } = makeDeps({ existingEmail: 'amanda@x.com' });
    const r = await createUserByAdmin(deps)(validCmd());

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'email-already-registered');
    assert.equal(captured.savedUser, null);
  });

  it('CA5: falha no envio do convite -> err invite-mail-failed', async () => {
    const { deps } = makeDeps({ inviteFails: true });
    const r = await createUserByAdmin(deps)(validCmd());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invite-mail-failed');
  });

  it('CA6: name em branco -> err name-required; cpf invalido -> err cpf', async () => {
    const { deps } = makeDeps();
    const r1 = await createUserByAdmin(deps)({ ...validCmd(), name: '   ' });
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.error, 'name-required');

    const r2 = await createUserByAdmin(deps)({ ...validCmd(), cpf: '111' });
    assert.equal(r2.ok, false);
  });

  it('CA7: UserCreated emitido com userId/adminId/email; sem passwordHash no payload', async () => {
    const { deps } = makeDeps();
    const r = await createUserByAdmin(deps)(validCmd());

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.event.type, 'UserCreated');
      assert.equal(r.value.event.createdByAdminId, ADMIN_ID);
      assert.equal(String(r.value.event.email), 'amanda@x.com');
      const values = Object.values(r.value.event as Record<string, unknown>);
      assert.equal(values.includes(deps.unusablePasswordHash), false);
    }
  });

  it('CA8: token de ativacao persistido com expiresAt = now + ttl', async () => {
    const { deps, captured } = makeDeps();
    await createUserByAdmin(deps)(validCmd());

    assert.ok(captured.savedToken !== null);
    assert.deepEqual(captured.savedToken?.expiresAt, new Date(AT.getTime() + TTL * 1000));
  });
});
