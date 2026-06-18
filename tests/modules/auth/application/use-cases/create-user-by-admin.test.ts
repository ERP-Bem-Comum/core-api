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
import type { OutboxMessage } from '#src/modules/auth/application/ports/outbox.ts';
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
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import type { Role as RoleType } from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { MASS_APPROVER_ROLE_NAME } from '#src/modules/auth/application/use-cases/mass-approver-role.ts';
import { CONTRACT_PERMISSION } from '#src/modules/contracts/public-api/permissions.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');
const TTL = 604_800; // 7 dias
const BASE_URL = 'https://app.example.com/primeiro-acesso';
const ADMIN_ID = UserId.generate();

const unusableHash = (): PasswordHash.PasswordHash => {
  const h = PasswordHash.fromString('$argon2id$v=19$dummy-placeholder');
  if (!h.ok) throw new Error('setup');
  return h.value;
};

const emailOf = (raw: string): Email.Email => {
  const r = Email.parse(raw);
  if (!r.ok) throw new Error(`fixture email: ${r.error}`);
  return r.value;
};

const makeRole = (name: string, permissions: readonly string[]): RoleType => {
  const perms = permissions.map((p) => {
    const parsed = Permission.parse(p);
    if (!parsed.ok) throw new Error('permission fixture');
    return parsed.value;
  });
  const r = Role.create({ id: RoleId.generate(), name, permissions: perms });
  if (!r.ok) throw new Error('role fixture');
  return r.value;
};

// Contexto RBAC com stores InMemory reais (espelha assign-role.test.ts). O use case ganha a dep
// roleRepo e usa o motor RBAC (resolve role + User.assignRole) quando a flag e definida.
const makeRbacCtx = () => {
  const userStore = makeInMemoryUserStore();
  const roleStore = makeInMemoryRoleStore();
  const resetTokenRepo: PasswordResetTokenRepository = {
    save: () => Promise.resolve(ok(undefined)),
    saveWithEvents: () => Promise.resolve(ok(undefined)),
    findByTokenHash: () => Promise.resolve(ok(null)),
    findUnusedByUserId: () => Promise.resolve(ok([])),
  };
  const minter: PasswordResetTokenMinter = {
    mint: () => ({ token: 'plain-token-xyz', tokenHash: 'hash-xyz' }),
    hash: (raw) => `hash-of-${raw}`,
  };
  // NOTIF-EMAIL-EVENT-CONSUMER (fatia 02): o use case nao recebe mais inviteMailer; o envio
  // do convite e do consumidor (worker email-dispatch). O evento sai via saveWithEvents.
  const create = createUserByAdmin({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    roleRepo: roleStore.repository,
    resetTokenRepo,
    minter,
    clock: ClockFixed(AT),
    unusablePasswordHash: unusableHash(),
    inviteTtlSeconds: TTL,
    activationBaseUrl: BASE_URL,
  });
  return { userStore, roleStore, create };
};

interface Captured {
  savedUser: User | null;
  savedToken: PasswordResetToken | null;
  events: OutboxMessage[];
}

const makeDeps = (opts?: { existingEmail?: string; saveFails?: boolean }) => {
  const captured: Captured = { savedUser: null, savedToken: null, events: [] };

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
    // ADR-0047 (fatia 02): o use case persiste token + evento UserInvited via saveWithEvents.
    // O envio do convite NAO ocorre mais no use case (vem do consumidor); aqui capturamos o evento.
    saveWithEvents: (token, events) => {
      captured.savedToken = token;
      captured.events.push(...events);
      return Promise.resolve(ok(undefined));
    },
    findByTokenHash: () => Promise.resolve(ok(null)),
    findUnusedByUserId: () => Promise.resolve(ok([])),
  };
  const minter: PasswordResetTokenMinter = {
    mint: () => ({ token: 'plain-token-xyz', tokenHash: 'hash-xyz' }),
    hash: (raw) => `hash-of-${raw}`,
  };
  const clock = ClockFixed(AT);
  // roleRepo nunca e tocado nestes casos (flag ausente); fornecido so para satisfazer a dep.
  const roleRepo = makeInMemoryRoleStore().repository;

  const deps = {
    userReader,
    userRepo,
    roleRepo,
    resetTokenRepo,
    minter,
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

  it('CA2: evento UserInvited emitido 1x com email correto e URL nao-vazia (envio e do consumidor)', async () => {
    const { deps, captured } = makeDeps();
    await createUserByAdmin(deps)(validCmd());

    const invites = captured.events.filter((e) => e.eventType === 'UserInvited');
    assert.equal(invites.length, 1);
    const payload = JSON.parse(invites[0]?.payload ?? '{}') as Record<string, unknown>;
    assert.equal(payload['email'], 'amanda@x.com');
    assert.ok(((payload['activationUrl'] as string | undefined) ?? '').length > 0);
  });

  it('CA3: URL de ativacao usa a base de config (anti host-injection); sem fragmento do command', async () => {
    const { deps, captured } = makeDeps();
    await createUserByAdmin(deps)(validCmd());

    const invites = captured.events.filter((e) => e.eventType === 'UserInvited');
    const payload = JSON.parse(invites[0]?.payload ?? '{}') as Record<string, unknown>;
    const url = (payload['activationUrl'] as string | undefined) ?? '';
    assert.ok(url.startsWith(`${BASE_URL}?token=`), `url inesperada: ${url}`);
    assert.equal(url.includes('amanda'), false); // nao vaza email na URL
  });

  it('CA4: email duplicado -> err e userRepo.save NAO chamado', async () => {
    const { deps, captured } = makeDeps({ existingEmail: 'amanda@x.com' });
    const r = await createUserByAdmin(deps)(validCmd());

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'email-already-registered');
    assert.equal(captured.savedUser, null);
  });

  it('CA5: sem duplicacao — nenhum envio sincrono; so o evento UserInvited e emitido', async () => {
    const { deps, captured } = makeDeps();
    const r = await createUserByAdmin(deps)(validCmd());
    assert.equal(r.ok, true);
    // O use case nao tem mais mailer; o e-mail sai SO pelo consumidor. Aqui so o evento existe.
    assert.equal(captured.events.filter((e) => e.eventType === 'UserInvited').length, 1);
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

// ---------------------------------------------------------------------------
// AUTH-MASS-APPROVE-SETTABLE - flag massApprovalPermission setavel na criacao.
// Usa stores InMemory reais para exercitar o motor RBAC (resolve role + assign).
// ---------------------------------------------------------------------------

describe('createUserByAdmin - massApprovalPermission (AUTH-MASS-APPROVE-SETTABLE)', () => {
  // Ator admin com user:create + user:assign-role; persiste no userStore.
  const makeAuthorizedAdmin = async (
    ctx: ReturnType<typeof makeRbacCtx>,
  ): Promise<UserId.UserId> => {
    const base = UserAgg.register(
      {
        id: UserId.generate(),
        email: emailOf('admin.rbac@x.com'),
        passwordHash: unusableHash(),
        roles: [],
      },
      AT,
    ).user;
    const role = makeRole('admin', ['user:create', 'user:assign-role']);
    await ctx.roleStore.repository.save(role);
    const { user: withRole } = UserAgg.assignRole(base, role, AT);
    await ctx.userStore.repository.save(withRole);
    return withRole.id;
  };

  // Ator sem user:assign-role (so user:create); fail-closed para a flag.
  const makeUnprivilegedAdmin = async (
    ctx: ReturnType<typeof makeRbacCtx>,
  ): Promise<UserId.UserId> => {
    const base = UserAgg.register(
      {
        id: UserId.generate(),
        email: emailOf('weak.rbac@x.com'),
        passwordHash: unusableHash(),
        roles: [],
      },
      AT,
    ).user;
    const role = makeRole('weak-admin', ['user:create']);
    await ctx.roleStore.repository.save(role);
    const { user: withRole } = UserAgg.assignRole(base, role, AT);
    await ctx.userStore.repository.save(withRole);
    return withRole.id;
  };

  const massApproveOf = async (
    ctx: ReturnType<typeof makeRbacCtx>,
    userId: UserId.UserId,
  ): Promise<boolean> => {
    const found = await ctx.userStore.reader.findById(userId);
    if (!found.ok || found.value === null) return false;
    return found.value.roles
      .flatMap((role) => role.permissions)
      .some((permission) => String(permission) === CONTRACT_PERMISSION.massApprove);
  };

  it('CA1: massApprovalPermission=true cria o usuario E concede a role etl:mass-approver', async () => {
    const ctx = makeRbacCtx();
    const adminId = await makeAuthorizedAdmin(ctx);

    const r = await ctx.create({ ...validCmd(), adminId, massApprovalPermission: true });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const created = r.value.user;
    assert.equal(
      created.roles.some((role) => role.name === MASS_APPROVER_ROLE_NAME),
      true,
    );
    assert.equal(await massApproveOf(ctx, created.id), true);
  });

  it('CA2: massApprovalPermission=false cria sem a role (comportamento atual preservado)', async () => {
    const ctx = makeRbacCtx();
    const adminId = await makeAuthorizedAdmin(ctx);

    const r = await ctx.create({ ...validCmd(), adminId, massApprovalPermission: false });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(await massApproveOf(ctx, r.value.user.id), false);
  });

  it('CA6: ator sem user:assign-role que seta a flag -> forbidden e usuario NAO criado', async () => {
    const ctx = makeRbacCtx();
    const adminId = await makeUnprivilegedAdmin(ctx);

    const r = await ctx.create({ ...validCmd(), adminId, massApprovalPermission: true });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');

    // Fail-closed real: nada persistido para o email novo.
    const leaked = await ctx.userStore.reader.findByEmail(emailOf('amanda@x.com'));
    assert.equal(leaked.ok && leaked.value === null, true);
  });

  it('CA7: role etl:mass-approver inexistente e criada (busca-ou-cria) antes do assign', async () => {
    const ctx = makeRbacCtx();
    const adminId = await makeAuthorizedAdmin(ctx);

    const before = await ctx.roleStore.repository.list();
    assert.equal(before.ok, true);
    if (!before.ok) return;
    assert.equal(
      before.value.some((role) => role.name === MASS_APPROVER_ROLE_NAME),
      false,
    );

    const r = await ctx.create({ ...validCmd(), adminId, massApprovalPermission: true });
    assert.equal(r.ok, true);

    const after = await ctx.roleStore.repository.list();
    assert.equal(after.ok, true);
    if (!after.ok) return;
    assert.equal(after.value.filter((role) => role.name === MASS_APPROVER_ROLE_NAME).length, 1);
  });

  it('flag ausente nao toca roleRepo (zero regressao): cria sem mass-approve', async () => {
    const ctx = makeRbacCtx();
    const adminId = await makeAuthorizedAdmin(ctx);

    const r = await ctx.create({ ...validCmd(), adminId });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(await massApproveOf(ctx, r.value.user.id), false);
  });
});
