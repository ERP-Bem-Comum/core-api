/**
 * W0 (RED) - Tests para o agregado Role do modulo auth.
 *
 * Ticket: AUTH-AGG-ROLE.
 *
 * Role agrega readonly Permission[]. Nao-brandado (agregado, SKILL 3.A.1).
 *
 * Cobre CA4..CA9:
 *   - CA4: create valido retorna ok, name trimado, permissions preservadas
 *   - CA5: name vazio/espacos retorna err('role-name-empty')
 *   - CA6: create deduplica permissions
 *   - CA7: hasPermission true/false
 *   - CA8: grant adiciona e e idempotente
 *   - CA9: revoke remove (ausencia e no-op)
 *
 * DEVEM FALHAR em W0 - role.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Role from '#src/modules/auth/domain/authorization/role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

// Helper de setup: parse de Permission com assercao (throw em teste e permitido).
const perm = (raw: string): Permission.Permission => {
  const r = Permission.parse(raw);
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('test setup: permissao invalida');
  return r.value;
};

describe('Role.create', () => {
  it('CA4: create valido retorna ok com name trimado e permissions', () => {
    // Arrange
    const id = RoleId.generate();
    const permissions = [perm('contract:delete'), perm('contract:mass-approve')];

    // Act
    const r = Role.create({ id, name: '  Gestor de Contratos  ', permissions });

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.name, 'Gestor de Contratos');
      assert.equal(r.value.permissions.length, 2);
    }
  });

  it('CA5: name vazio retorna err role-name-invalid', () => {
    // Act — desde AUTH-ROLE-LIFECYCLE-AGG o nome e validado via RoleName (role-name-invalid).
    const r = Role.create({ id: RoleId.generate(), name: '   ', permissions: [] });

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'role-name-invalid');
    }
  });

  it('CA6: create deduplica permissions', () => {
    // Arrange
    const dup = perm('contract:delete');

    // Act
    const r = Role.create({ id: RoleId.generate(), name: 'Admin', permissions: [dup, dup] });

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.permissions.length, 1);
    }
  });
});

describe('Role.hasPermission / grant / revoke', () => {
  const build = (): Role.Role => {
    const r = Role.create({
      id: RoleId.generate(),
      name: 'Admin',
      permissions: [perm('contract:delete')],
    });
    assert.equal(r.ok, true);
    if (!r.ok) throw new Error('test setup: role invalido');
    return r.value;
  };

  it('CA7: hasPermission retorna true para contida e false para ausente', () => {
    const role = build();
    assert.equal(Role.hasPermission(role, perm('contract:delete')), true);
    assert.equal(Role.hasPermission(role, perm('user:register')), false);
  });

  it('CA8: grant adiciona permissao', () => {
    const role = build();
    const next = Role.grant(role, perm('user:register'));
    assert.equal(Role.hasPermission(next, perm('user:register')), true);
  });

  it('CA8: grant e idempotente (nao duplica)', () => {
    const role = build();
    const next = Role.grant(role, perm('contract:delete'));
    assert.equal(next.permissions.length, 1);
  });

  it('CA9: revoke remove permissao', () => {
    const role = build();
    const next = Role.revoke(role, perm('contract:delete'));
    assert.equal(Role.hasPermission(next, perm('contract:delete')), false);
    assert.equal(next.permissions.length, 0);
  });

  it('CA9: revoke de permissao ausente e no-op', () => {
    const role = build();
    const next = Role.revoke(role, perm('user:register'));
    assert.equal(next.permissions.length, 1);
  });
});

// W0 (RED) — FIN-APPROVER-LIMIT-AUTH (#289): alcada de aprovacao no papel.
// DEVEM FALHAR ate W1 — approvalLimit/setApprovalLimit/role-approval-limit-invalid inexistentes.
describe('Role.approvalLimit (alcada do papel — FIN-APPROVER-LIMIT-AUTH)', () => {
  it('CA1: create com approvalLimitCents define a alcada em Money (cents)', () => {
    const r = Role.create({
      id: RoleId.generate(),
      name: 'Gerente',
      permissions: [],
      approvalLimitCents: 100000,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.approvalLimit?.cents, 100000);
  });

  it('CA2: create sem approvalLimitCents -> approvalLimit null (papel sem alcada)', () => {
    const r = Role.create({ id: RoleId.generate(), name: 'Gerente', permissions: [] });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.approvalLimit, null);
  });

  it('CA2: create com approvalLimitCents null -> approvalLimit null', () => {
    const r = Role.create({
      id: RoleId.generate(),
      name: 'Gerente',
      permissions: [],
      approvalLimitCents: null,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.approvalLimit, null);
  });

  it('CA3: create com approvalLimitCents negativo -> err role-approval-limit-invalid', () => {
    const r = Role.create({
      id: RoleId.generate(),
      name: 'Gerente',
      permissions: [],
      approvalLimitCents: -1,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-approval-limit-invalid');
  });

  it('CA4: setApprovalLimit define e depois zera a alcada', () => {
    const base = Role.create({ id: RoleId.generate(), name: 'Gerente', permissions: [] });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    const set = Role.setApprovalLimit(base.value, 50000);
    assert.equal(set.ok, true);
    if (set.ok) assert.equal(set.value.approvalLimit?.cents, 50000);
    const cleared = Role.setApprovalLimit(base.value, null);
    assert.equal(cleared.ok, true);
    if (cleared.ok) assert.equal(cleared.value.approvalLimit, null);
  });

  it('CA4: setApprovalLimit negativo -> err role-approval-limit-invalid', () => {
    const base = Role.create({ id: RoleId.generate(), name: 'Gerente', permissions: [] });
    assert.equal(base.ok, true);
    if (!base.ok) return;
    const r = Role.setApprovalLimit(base.value, -5);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'role-approval-limit-invalid');
  });

  it('CA5: rehydrate preserva a alcada persistida', () => {
    const r = Role.rehydrate({
      id: RoleId.generate(),
      name: 'Gerente',
      permissions: [],
      status: 'active',
      approvalLimitCents: 250000,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.approvalLimit?.cents, 250000);
  });
});
