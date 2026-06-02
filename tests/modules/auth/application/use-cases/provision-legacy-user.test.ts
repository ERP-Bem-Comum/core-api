import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { provisionLegacyUser } from '#src/modules/auth/application/use-cases/provision-legacy-user.ts';
import { makeInMemoryProvisionedUserStore } from '#src/modules/auth/adapters/persistence/repos/provisioned-user-store.in-memory.ts';
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { authorize } from '#src/modules/auth/domain/authorization/authorize.ts';
import { CONTRACT_PERMISSION } from '#src/modules/contracts/public-api/permissions.ts';

const AT = new Date('2026-06-02T12:00:00.000Z');
const MASS_APPROVER_ROLE_NAME = 'etl:mass-approver';

const emailOf = (raw: string): Email.Email => {
  const r = Email.parse(raw);
  if (!r.ok) throw new Error(`fixture email inválido: ${r.error}`);
  return r.value;
};

const makeDeps = () => {
  const provisioned = makeInMemoryProvisionedUserStore();
  const roles = makeInMemoryRoleStore();
  const passwordHasher = makeFakePasswordHasher();
  return {
    provisioned,
    roles,
    passwordHasher,
    deps: {
      store: provisioned.store,
      roleRepo: roles.repository,
      passwordHasher,
      clock: ClockFixed(AT),
      secret: () => 'r4nd0m-etl-secret-9f3a2b7c1d',
    },
  };
};

describe('provisionLegacyUser', () => {
  it('cria um user novo (outcome=created) com hash não-vazio e sem role quando massApprove=false', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 7,
      email: emailOf('joao@example.com'),
      massApprove: false,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.outcome, 'created');

    const saved = provisioned.saved();
    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.legacyId, 7);
    assert.equal(saved[0]?.user.id, r.value.userRef);
    assert.equal(saved[0]?.user.roles.length, 0);
    assert.notEqual(String(saved[0]?.user.passwordHash ?? ''), '');
  });

  it('não vaza o segredo da senha no resultado', async () => {
    const { deps } = makeDeps();
    const secret = 'r4nd0m-etl-secret-9f3a2b7c1d';

    const r = await provisionLegacyUser(deps)({
      legacyId: 8,
      email: emailOf('maria@example.com'),
      massApprove: false,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(JSON.stringify(r.value).includes(secret), false);
  });

  it('é idempotente por legacyId: re-provisionar retorna already-exists e NÃO sobrescreve o registro', async () => {
    const { provisioned, deps } = makeDeps();

    const first = await provisionLegacyUser(deps)({
      legacyId: 42,
      email: emailOf('carlos@example.com'),
      massApprove: false,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const before = provisioned.saved();
    const hashBefore = String(before[0]?.user.passwordHash ?? '');

    const second = await provisionLegacyUser(deps)({
      legacyId: 42,
      email: emailOf('carlos@example.com'),
      massApprove: false,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    assert.equal(second.value.outcome, 'already-exists');
    assert.equal(second.value.userRef, first.value.userRef);

    const after = provisioned.saved();
    assert.equal(after.length, 1);
    assert.equal(String(after[0]?.user.passwordHash ?? ''), hashBefore);
  });

  it('massApprove=true concede o Role compartilhado etl:mass-approver com a única permission contract:mass-approve', async () => {
    const { provisioned, roles, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 10,
      email: emailOf('ana@example.com'),
      massApprove: true,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const saved = provisioned.saved();
    assert.equal(saved[0]?.user.roles.length, 1);
    const role = saved[0]?.user.roles[0];
    assert.equal(role?.name, MASS_APPROVER_ROLE_NAME);
    assert.equal(role?.permissions.length, 1);
    assert.equal(String(role?.permissions[0]), CONTRACT_PERMISSION.massApprove);

    const listed = await roles.repository.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);
  });

  it('reusa o MESMO Role compartilhado entre dois users com massApprove (sem role explosion)', async () => {
    const { provisioned, roles, deps } = makeDeps();

    const a = await provisionLegacyUser(deps)({
      legacyId: 1,
      email: emailOf('a@example.com'),
      massApprove: true,
    });
    const b = await provisionLegacyUser(deps)({
      legacyId: 2,
      email: emailOf('b@example.com'),
      massApprove: true,
    });
    assert.equal(a.ok && b.ok, true);

    const listed = await roles.repository.list();
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);

    const saved = provisioned.saved();
    const roleIdA = saved.find((s) => s.legacyId === 1)?.user.roles[0]?.id;
    const roleIdB = saved.find((s) => s.legacyId === 2)?.user.roles[0]?.id;
    assert.equal(roleIdA, roleIdB);
  });

  it('massApprove=false nasce sem role e authorize(contract:mass-approve) é negado (fail-closed)', async () => {
    const { provisioned, deps } = makeDeps();

    const r = await provisionLegacyUser(deps)({
      legacyId: 99,
      email: emailOf('sem-poder@example.com'),
      massApprove: false,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const user = provisioned.saved()[0]?.user;
    assert.notEqual(user, undefined);
    if (user === undefined) return;

    const perm = Permission.parse(CONTRACT_PERMISSION.massApprove);
    assert.equal(perm.ok, true);
    if (!perm.ok) return;

    const authz = authorize(user, perm.value);
    assert.equal(authz.ok, false);
  });
});
