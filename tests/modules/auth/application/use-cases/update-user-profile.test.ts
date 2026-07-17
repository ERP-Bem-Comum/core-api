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
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import type { Role as RoleType } from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { MASS_APPROVER_ROLE_NAME } from '#src/modules/auth/application/use-cases/mass-approver-role.ts';
import { CONTRACT_PERMISSION } from '#src/modules/contracts/public-api/permissions.ts';
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
  // roleRepo nunca tocado nestes casos (flag ausente); fornecido so para satisfazer a dep.
  const roleRepo = makeInMemoryRoleStore().repository;
  return {
    deps: { userReader, userRepo, roleRepo, clock: ClockFixed(AT), rbacMode: 'enforced' as const },
    captured,
  };
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

// ---------------------------------------------------------------------------
// AUTH-MASS-APPROVE-SETTABLE - flag massApprovalPermission setavel na edicao.
// Usa stores InMemory reais para exercitar o motor RBAC (assign/revoke + resolve role).
// ---------------------------------------------------------------------------

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

describe('updateUserProfile - massApprovalPermission (AUTH-MASS-APPROVE-SETTABLE)', () => {
  const makeRbacCtx = () => {
    const userStore = makeInMemoryUserStore();
    const roleStore = makeInMemoryRoleStore();
    const update = updateUserProfile({
      userReader: userStore.reader,
      userRepo: userStore.repository,
      roleRepo: roleStore.repository,
      clock: ClockFixed(AT),
      rbacMode: 'enforced',
    });
    return { userStore, roleStore, update };
  };

  const saveUser = async (ctx: ReturnType<typeof makeRbacCtx>, user: User): Promise<void> => {
    const r = await ctx.userStore.repository.save(user);
    if (!r.ok) throw new Error('save user fixture');
  };

  // Ator com user:assign-role.
  const makeAuthorizedActor = async (
    ctx: ReturnType<typeof makeRbacCtx>,
    email: string,
  ): Promise<UserId.UserId> => {
    const e = Email.parse(email);
    const h = PasswordHash.fromString('$argon2id$x');
    if (!e.ok || !h.ok) throw new Error('actor fixture');
    const base = UserAgg.register(
      { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
      AT,
    ).user;
    const role = makeRole('admin', ['user:update', 'user:assign-role']);
    await ctx.roleStore.repository.save(role);
    const { user: withRole } = UserAgg.assignRole(base, role, AT);
    await saveUser(ctx, withRole);
    return withRole.id;
  };

  // Ator sem user:assign-role (so user:update).
  const makeUnprivilegedActor = async (
    ctx: ReturnType<typeof makeRbacCtx>,
    email: string,
  ): Promise<UserId.UserId> => {
    const e = Email.parse(email);
    const h = PasswordHash.fromString('$argon2id$x');
    if (!e.ok || !h.ok) throw new Error('actor fixture');
    const base = UserAgg.register(
      { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
      AT,
    ).user;
    const role = makeRole('weak-admin', ['user:update']);
    await ctx.roleStore.repository.save(role);
    const { user: withRole } = UserAgg.assignRole(base, role, AT);
    await saveUser(ctx, withRole);
    return withRole.id;
  };

  const makeTarget = async (
    ctx: ReturnType<typeof makeRbacCtx>,
    email: string,
    roles: readonly RoleType[] = [],
  ): Promise<UserId.UserId> => {
    const e = Email.parse(email);
    const h = PasswordHash.fromString('$argon2id$x');
    if (!e.ok || !h.ok) throw new Error('target fixture');
    const user = UserAgg.register(
      { id: UserId.generate(), email: e.value, passwordHash: h.value, roles },
      AT,
    ).user;
    await saveUser(ctx, user);
    return user.id;
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

  it('CA3: flag=true atribui a role etl:mass-approver (idempotente se ja tem)', async () => {
    const ctx = makeRbacCtx();
    const actorId = await makeAuthorizedActor(ctx, 'admin.ma@x.com');
    const targetId = await makeTarget(ctx, 'target.ma3@x.com');

    const r1 = await ctx.update({ id: String(targetId), actorId, massApprovalPermission: true });
    assert.equal(r1.ok, true);
    assert.equal(await massApproveOf(ctx, targetId), true);

    // Idempotente: setar de novo segue ok e nao duplica.
    const r2 = await ctx.update({ id: String(targetId), actorId, massApprovalPermission: true });
    assert.equal(r2.ok, true);
    const found = await ctx.userStore.reader.findById(targetId);
    assert.equal(found.ok, true);
    if (!found.ok || found.value === null) return;
    assert.equal(
      found.value.roles.filter((role) => role.name === MASS_APPROVER_ROLE_NAME).length,
      1,
    );
  });

  it('CA4: flag=false revoga a role (idempotente se nao tem)', async () => {
    const ctx = makeRbacCtx();
    const actorId = await makeAuthorizedActor(ctx, 'admin.ma4@x.com');
    const massRole = makeRole(MASS_APPROVER_ROLE_NAME, [CONTRACT_PERMISSION.massApprove]);
    await ctx.roleStore.repository.save(massRole);
    const targetId = await makeTarget(ctx, 'target.ma4@x.com', [massRole]);

    assert.equal(await massApproveOf(ctx, targetId), true);

    const r1 = await ctx.update({ id: String(targetId), actorId, massApprovalPermission: false });
    assert.equal(r1.ok, true);
    assert.equal(await massApproveOf(ctx, targetId), false);

    // Idempotente: revogar de novo segue ok.
    const r2 = await ctx.update({ id: String(targetId), actorId, massApprovalPermission: false });
    assert.equal(r2.ok, true);
    assert.equal(await massApproveOf(ctx, targetId), false);
  });

  it('CA5: flag ausente no patch parcial nao altera o estado da permissao', async () => {
    const ctx = makeRbacCtx();
    const actorId = await makeAuthorizedActor(ctx, 'admin.ma5@x.com');
    const massRole = makeRole(MASS_APPROVER_ROLE_NAME, [CONTRACT_PERMISSION.massApprove]);
    await ctx.roleStore.repository.save(massRole);
    const targetId = await makeTarget(ctx, 'target.ma5@x.com', [massRole]);

    const r = await ctx.update({ id: String(targetId), actorId, name: 'Novo Nome' });
    assert.equal(r.ok, true);
    // permissao preservada (continua true) mesmo sem a flag.
    assert.equal(await massApproveOf(ctx, targetId), true);
  });

  it('CA6: ator sem user:assign-role que seta a flag -> forbidden e estado inalterado', async () => {
    const ctx = makeRbacCtx();
    const actorId = await makeUnprivilegedActor(ctx, 'weak.ma6@x.com');
    const targetId = await makeTarget(ctx, 'target.ma6@x.com');

    const r = await ctx.update({ id: String(targetId), actorId, massApprovalPermission: true });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'forbidden');
    assert.equal(await massApproveOf(ctx, targetId), false);
  });
});
