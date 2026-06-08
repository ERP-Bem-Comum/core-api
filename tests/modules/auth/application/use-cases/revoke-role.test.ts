/**
 * W0 (RED) - use case revokeRole (spec 006 US4). Ticket: AUTH-USECASE-REVOKE-ROLE.
 *
 * Par do assignRole: revoga um Role de um usuario, AUTORIZANDO o ator pela MESMA permission
 * 'user:assign-role' (simetria; DD-USER-07/DD-USER-02). Idempotente (alvo sem o role -> no-op).
 * Proteção FR-010: o ator NAO pode revogar de si o role que sustenta a gestao de acessos
 * (cannot-self-lockout) -> sem save. DEVE FALHAR em W0 (use case inexistente). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { revokeRole } from '#src/modules/auth/application/use-cases/revoke-role.ts';
import { registerUser } from '#src/modules/auth/application/use-cases/register-user.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import type { ActiveUser } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import type { Role as RoleType } from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const ADMIN_EMAIL = 'admin@example.com';
const TARGET_EMAIL = 'target@example.com';
const PASSWORD = 'super-secret-123';

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

const makeCtx = () => {
  const userStore = makeInMemoryUserStore();
  const roleStore = makeInMemoryRoleStore();
  const passwordHasher = makeFakePasswordHasher();
  let saveCount = 0;
  const saveSpy = userStore.repository.save;
  const repository = {
    ...userStore.repository,
    save: async (user: Parameters<typeof saveSpy>[0]) => {
      saveCount += 1;
      return saveSpy(user);
    },
  };
  const register = registerUser({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    passwordHasher,
    clock: ClockFixed(AT),
  });
  const revoke = revokeRole({
    userReader: userStore.reader,
    userRepo: repository,
    roleRepo: roleStore.repository,
    clock: ClockFixed(AT),
  });
  return { userStore, roleStore, register, revoke, saves: () => saveCount };
};

type Ctx = ReturnType<typeof makeCtx>;

const registerActive = async (ctx: Ctx, email: string): Promise<ActiveUser> => {
  const r = await ctx.register({ email, password: PASSWORD });
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('register');
  return r.value.user;
};

const saveRole = async (ctx: Ctx, role: RoleType): Promise<void> => {
  await ctx.roleStore.repository.save(role);
};

// Ator com 'user:assign-role' (via management role); devolve { actorId, managementRole }.
const makeAuthorizedActor = async (
  ctx: Ctx,
  email: string,
): Promise<{ actorId: UserId.UserId; managementRole: RoleType }> => {
  const actor = await registerActive(ctx, email);
  const managementRole = makeRole('admin', ['user:assign-role']);
  await saveRole(ctx, managementRole);
  const { user: withRole } = User.assignRole(actor, managementRole, AT);
  await ctx.userStore.repository.save(withRole);
  return { actorId: actor.id, managementRole };
};

const rolesOf = async (ctx: Ctx, userId: UserId.UserId): Promise<readonly RoleType[]> => {
  const u = await ctx.userStore.reader.findById(userId);
  if (!u.ok || u.value === null) return [];
  return u.value.roles;
};

describe('revokeRole (spec 006 US4)', () => {
  it('CA1: ator autorizado revoga role existente do target -> ok, RoleRevoked, save', async () => {
    const ctx = makeCtx();
    const { actorId } = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const target = await registerActive(ctx, TARGET_EMAIL);
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);
    const { user: withRole } = User.assignRole(target, editor, AT);
    await ctx.userStore.repository.save(withRole);
    const before = ctx.saves();

    const r = await ctx.revoke({ actorId, targetUserId: target.id, roleId: editor.id });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.notEqual(r.value.event, null);
    assert.equal(r.value.event?.type, 'RoleRevoked');
    assert.equal(r.value.event?.roleId, editor.id);
    assert.equal(ctx.saves(), before + 1);
    const roles = await rolesOf(ctx, target.id);
    assert.equal(
      roles.some((role) => role.id === editor.id),
      false,
    );
  });

  it('CA2: target NAO tem o role -> ok, event null, sem save (idempotente)', async () => {
    const ctx = makeCtx();
    const { actorId } = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const target = await registerActive(ctx, TARGET_EMAIL);
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);
    const before = ctx.saves();

    const r = await ctx.revoke({ actorId, targetUserId: target.id, roleId: editor.id });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.event, null);
    assert.equal(ctx.saves(), before);
  });

  it('CA3: ator sem user:assign-role -> forbidden, sem save', async () => {
    const ctx = makeCtx();
    const actor = await registerActive(ctx, ADMIN_EMAIL);
    const target = await registerActive(ctx, TARGET_EMAIL);
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);
    const { user: withRole } = User.assignRole(target, editor, AT);
    await ctx.userStore.repository.save(withRole);
    const before = ctx.saves();

    const r = await ctx.revoke({ actorId: actor.id, targetUserId: target.id, roleId: editor.id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');
    assert.equal(ctx.saves(), before);
  });

  it('CA4: ator inexistente -> forbidden', async () => {
    const ctx = makeCtx();
    const target = await registerActive(ctx, TARGET_EMAIL);
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.revoke({
      actorId: UserId.generate(),
      targetUserId: target.id,
      roleId: editor.id,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');
  });

  it('CA5: target disabled -> user-disabled', async () => {
    const ctx = makeCtx();
    const { actorId } = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const target = await registerActive(ctx, TARGET_EMAIL);
    const { user: disabledTarget } = User.disable(target, AT);
    await ctx.userStore.repository.save(disabledTarget);

    const r = await ctx.revoke({ actorId, targetUserId: target.id, roleId: RoleId.generate() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-disabled');
  });

  it('CA6 (FR-010): ator revoga de SI o role que sustenta a gestao -> cannot-self-lockout, sem save', async () => {
    const ctx = makeCtx();
    const { actorId, managementRole } = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const before = ctx.saves();

    const r = await ctx.revoke({
      actorId,
      targetUserId: actorId,
      roleId: managementRole.id,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cannot-self-lockout');
    assert.equal(ctx.saves(), before);
    // O ator preserva o role de gestao (nada foi removido).
    const roles = await rolesOf(ctx, actorId);
    assert.equal(
      roles.some((role) => role.id === managementRole.id),
      true,
    );
  });

  it('CA7: ator revoga de SI um role que NAO afeta a gestao -> ok (mantem user:assign-role)', async () => {
    const ctx = makeCtx();
    const { actorId } = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    // Concede ao ator um segundo role inofensivo, alem do de gestao.
    const extra = makeRole('reporter', ['contract:read']);
    await saveRole(ctx, extra);
    const actor = await ctx.userStore.reader.findById(actorId);
    assert.equal(actor.ok && actor.value !== null, true);
    if (!actor.ok || actor.value === null) return;
    const active = User.parseActive(actor.value);
    assert.equal(active.ok, true);
    if (!active.ok) return;
    const { user: withExtra } = User.assignRole(active.value, extra, AT);
    await ctx.userStore.repository.save(withExtra);

    const r = await ctx.revoke({ actorId, targetUserId: actorId, roleId: extra.id });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.event?.type, 'RoleRevoked');
    const roles = await rolesOf(ctx, actorId);
    assert.equal(
      roles.some((role) => role.id === extra.id),
      false,
    );
  });
});
