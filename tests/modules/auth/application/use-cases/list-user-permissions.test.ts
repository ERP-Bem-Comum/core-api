/**
 * W0 (RED) — AUTH-BYPASS-ME-PERMISSIONS. Use case `listUserPermissions` (GET /me -> `can()` do front).
 *
 * Bug: o bypass do ADR-0052 foi aplicado ao ENFORCEMENT (authorize/hasPermission) mas NAO a esta
 * lista. Resultado em producao (bypass ligado 17/07, sintoma ate 20/07): o backend libera, mas o
 * /me devolve as permissoes REAIS do usuario, o front pergunta `can('fiscal-document:read')`,
 * recebe nao, e ESCONDE o modulo financeiro.
 *
 * Decisao P.O. (opcao A): em `bypass`, o /me devolve o CATALOGO COMPLETO — coerente com "todo
 * usuario autenticado e super-usuario".
 *
 * DEVE FALHAR em W0: o use case ainda nao aceita `rbacMode`. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { listUserPermissions } from '#src/modules/auth/application/use-cases/list-user-permissions.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

const AT = new Date('2026-07-20T12:00:00.000Z');

const roleWith = (names: readonly string[]): Role.Role => {
  const perms = names.map((n) => {
    const p = Permission.parse(n);
    if (!p.ok) throw new Error(`setup perm ${n}`);
    return p.value;
  });
  const r = Role.create({ id: RoleId.generate(), name: 'Papel', permissions: perms });
  if (!r.ok) throw new Error('setup role');
  return r.value;
};

const mkUser = (opts: { roles?: readonly Role.Role[]; disabled?: boolean } = {}): User => {
  const e = Email.parse('user@x.com');
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  let user: User = UserAgg.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: opts.roles ?? [] },
    AT,
  ).user;
  if (opts.disabled === true) user = UserAgg.disable(user as UserAgg.ActiveUser, AT).user;
  return user;
};

const reader = (users: readonly User[]): UserReader => ({
  findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
  findByEmail: () => Promise.resolve(ok(null)),
});

describe('listUserPermissions — bypass devolve o catalogo (AUTH-BYPASS-ME-PERMISSIONS)', () => {
  it('CA1: bypass + usuario SEM papeis -> catalogo completo (nao lista vazia)', async () => {
    const u = mkUser();
    const r = await listUserPermissions({ userReader: reader([u]), rbacMode: 'bypass' })(
      String(u.id),
    );

    assert.equal(r.ok, true);
    if (!r.ok) return;
    // Todo autenticado e super-usuario no bypass: o front tem de enxergar todos os modulos.
    assert.equal(r.value.length, PermissionCatalog.all.length);
    assert.ok(
      r.value.includes('fiscal-document:read'),
      'o modulo financeiro estava oculto — o /me tem de anunciar a permissao no bypass',
    );
  });

  it('CA2: enforced -> exatamente as permissoes dos papeis (inalterado)', async () => {
    const u = mkUser({ roles: [roleWith(['contract:read'])] });
    const r = await listUserPermissions({ userReader: reader([u]), rbacMode: 'enforced' })(
      String(u.id),
    );

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual([...r.value], ['contract:read']);
  });

  it('CA3: degradacao graciosa nos DOIS modos — inexistente/inativo/id invalido -> []', async () => {
    const inactive = mkUser({ disabled: true });
    for (const mode of ['bypass', 'enforced'] as const) {
      const deps = { userReader: reader([inactive]), rbacMode: mode };

      const invalid = await listUserPermissions(deps)('nao-e-uuid');
      assert.equal(invalid.ok && invalid.value.length, 0, `id invalido (${mode}) deve dar []`);

      const missing = await listUserPermissions(deps)(String(UserId.generate()));
      assert.equal(missing.ok && missing.value.length, 0, `inexistente (${mode}) deve dar []`);

      // Inativo NAO e super-usuario, nem no bypass.
      const disabled = await listUserPermissions(deps)(String(inactive.id));
      assert.equal(disabled.ok && disabled.value.length, 0, `inativo (${mode}) deve dar []`);
    }
  });
});
