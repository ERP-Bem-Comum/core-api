/**
 * W0 (RED) - use case assignRole (A9). Ticket: AUTH-USECASE-ASSIGN-ROLE.
 *
 * Atribui um Role a um usuario, AUTORIZANDO o ator (authorize/forbidden, DD-USER-07/DD-USER-02).
 * Ator ganha a permissao 'user:assign-role' no arrange (Role.create + User.assignRole). Popula via
 * registerUser. DEVE FALHAR em W0 (use case inexistente). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { assignRole } from '#src/modules/auth/application/use-cases/assign-role.ts';
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

const makeCtx = (rbacMode: 'enforced' | 'bypass' = 'enforced') => {
  const userStore = makeInMemoryUserStore();
  const roleStore = makeInMemoryRoleStore();
  const passwordHasher = makeFakePasswordHasher();
  const register = registerUser({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    passwordHasher,
    clock: ClockFixed(AT),
  });
  const assign = assignRole({
    userReader: userStore.reader,
    userRepo: userStore.repository,
    roleRepo: roleStore.repository,
    clock: ClockFixed(AT),
    rbacMode,
  });
  return { userStore, roleStore, register, assign };
};

type Ctx = ReturnType<typeof makeCtx>;

const registerActive = async (ctx: Ctx, email: string): Promise<ActiveUser> => {
  const r = await ctx.register({ email, password: PASSWORD });
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('register');
  return r.value.user;
};

// Ator com a permissao 'user:assign-role' (via admin role) persistido.
const makeAuthorizedActor = async (ctx: Ctx, email: string): Promise<UserId.UserId> => {
  const actor = await registerActive(ctx, email);
  const adminRole = makeRole('admin', ['user:assign-role']);
  await ctx.roleStore.repository.save(adminRole);
  const { user: withRole } = User.assignRole(actor, adminRole, AT);
  await ctx.userStore.repository.save(withRole);
  return actor.id;
};

const saveRole = async (ctx: Ctx, role: RoleType): Promise<void> => {
  await ctx.roleStore.repository.save(role);
};

const targetRolesOf = async (ctx: Ctx, userId: UserId.UserId): Promise<readonly RoleType[]> => {
  const u = await ctx.userStore.reader.findById(userId);
  if (!u.ok || u.value === null) return [];
  return u.value.roles;
};

describe('assignRole (A9)', () => {
  it('CA1: ator autorizado + target ativo + role existe -> ok e role atribuido', async () => {
    const ctx = makeCtx();
    const actorId = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({ actorId, targetUserId: targetId, roleId: editor.id });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.event.type, 'RoleAssigned');
    assert.equal(r.value.event.roleId, editor.id);
    const roles = await targetRolesOf(ctx, targetId);
    assert.equal(
      roles.some((role) => role.id === editor.id),
      true,
    );
  });

  it('CA2: ator sem permissao -> forbidden e target nao muda', async () => {
    const ctx = makeCtx();
    const actorId = (await registerActive(ctx, ADMIN_EMAIL)).id;
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({ actorId, targetUserId: targetId, roleId: editor.id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');
    assert.equal((await targetRolesOf(ctx, targetId)).length, 0);
  });

  // ADR-0052 (W2 M1) — em bypass, a auto-gestão de RBAC também abre: o mesmo ator SEM
  // 'user:assign-role' atribui a role. É o que permite se auto-recuperar do #462 (dar a si mesmo as
  // permissões e depois religar o enforced). Sem esta correção, o bypass deixava a gestão travada.
  it('bypass: ator SEM permissao atribui a role mesmo assim (auto-gestão liberada)', async () => {
    const ctx = makeCtx('bypass');
    const actorId = (await registerActive(ctx, ADMIN_EMAIL)).id;
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({ actorId, targetUserId: targetId, roleId: editor.id });
    assert.equal(r.ok, true, 'bypass deveria liberar a atribuição');
    assert.equal((await targetRolesOf(ctx, targetId)).length, 1, 'a role foi atribuída');
  });

  it('CA3: ator inexistente -> forbidden', async () => {
    const ctx = makeCtx();
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({
      actorId: UserId.generate(),
      targetUserId: targetId,
      roleId: editor.id,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');
  });

  it('CA4: ator disabled -> forbidden', async () => {
    const ctx = makeCtx();
    const actor = await registerActive(ctx, ADMIN_EMAIL);
    const adminRole = makeRole('admin', ['user:assign-role']);
    await saveRole(ctx, adminRole);
    const { user: withRole } = User.assignRole(actor, adminRole, AT);
    const { user: disabledActor } = User.disable(withRole, AT);
    await ctx.userStore.repository.save(disabledActor);
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({ actorId: actor.id, targetUserId: targetId, roleId: editor.id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');
  });

  it('CA5: target inexistente -> user-not-found', async () => {
    const ctx = makeCtx();
    const actorId = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({
      actorId,
      targetUserId: UserId.generate(),
      roleId: editor.id,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
  });

  it('CA6: target disabled -> user-disabled', async () => {
    const ctx = makeCtx();
    const actorId = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const target = await registerActive(ctx, TARGET_EMAIL);
    const { user: disabledTarget } = User.disable(target, AT);
    await ctx.userStore.repository.save(disabledTarget);
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    const r = await ctx.assign({ actorId, targetUserId: target.id, roleId: editor.id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-disabled');
  });

  it('CA7: role inexistente -> role-not-found', async () => {
    const ctx = makeCtx();
    const actorId = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;

    const r = await ctx.assign({ actorId, targetUserId: targetId, roleId: RoleId.generate() });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-not-found');
  });

  it('CA8: atribuir role ja possuido -> ok e nao duplica', async () => {
    const ctx = makeCtx();
    const actorId = await makeAuthorizedActor(ctx, ADMIN_EMAIL);
    const targetId = (await registerActive(ctx, TARGET_EMAIL)).id;
    const editor = makeRole('editor', []);
    await saveRole(ctx, editor);

    await ctx.assign({ actorId, targetUserId: targetId, roleId: editor.id });
    const r = await ctx.assign({ actorId, targetUserId: targetId, roleId: editor.id });
    assert.equal(r.ok, true);
    const count = (await targetRolesOf(ctx, targetId)).filter(
      (role) => role.id === editor.id,
    ).length;
    assert.equal(count, 1);
  });
});
