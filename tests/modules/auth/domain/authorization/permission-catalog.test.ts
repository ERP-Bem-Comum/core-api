/**
 * W0 (RED) - Tests para o catalogo fixo de permissoes do modulo auth.
 *
 * Ticket: AUTH-PERMISSION-CATALOG (spec 006-gestao-acessos, Phase 2 Foundational, T003).
 *
 * Catalogo deploy-time, imutavel em runtime (FR-011). Fonte unica de:
 *   - list-permissions (US2 - catalogo completo do sistema);
 *   - validacao Role.setPermissions ⊆ catalogo (US5/US6);
 *   - seed de auth_permission (T010).
 *
 * Destrava o T048 da 005: as permissions user:* exibidas/consumidas pela 005 saem daqui.
 *
 * Cobre CA1..CA5 do 000-request:
 *   - CA1: exporta Permission[] (branded), nao strings cruas
 *   - CA2: nao-vazio e sem duplicatas
 *   - CA3: todas no formato canonico resource:action
 *   - CA4: predicado isInCatalog para validacao de setPermissions
 *   - CA5: contem as permissions ancora conhecidas (role:*, user:*, contract:mass-approve)
 *
 * Estes tests DEVEM FALHAR em W0 - permission-catalog.ts ainda nao existe.
 *
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

const parseOrThrow = (raw: string): Permission.Permission => {
  const r = Permission.parse(raw);
  if (!r.ok) throw new Error(`fixture invalida: ${raw}`);
  return r.value;
};

describe('PermissionCatalog.all', () => {
  it('CA1: expoe Permission[] branded (cada item passa por Permission.parse)', () => {
    for (const p of PermissionCatalog.all) {
      const reparsed = Permission.parse(p);
      assert.equal(reparsed.ok, true, `catalogo contem permission invalida: ${p}`);
    }
  });

  it('CA2: catalogo nao e vazio', () => {
    assert.equal(PermissionCatalog.all.length > 0, true);
  });

  it('CA2: catalogo nao tem duplicatas', () => {
    const unique = new Set(PermissionCatalog.all);
    assert.equal(unique.size, PermissionCatalog.all.length);
  });

  it('CA3: todas no formato canonico resource:action', () => {
    for (const p of PermissionCatalog.all) {
      assert.match(p, /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('CA5: contem as permissions role:* desta spec (gestao de acessos)', () => {
    const required = ['role:read', 'role:create', 'role:update', 'role:assign', 'role:revoke'];
    for (const name of required) {
      assert.equal(
        PermissionCatalog.all.includes(parseOrThrow(name)),
        true,
        `catalogo deve conter ${name}`,
      );
    }
  });

  it('CA5: contem as permissions user:* consumidas pela 005 (T048)', () => {
    const required = ['user:list', 'user:read', 'user:create', 'user:update'];
    for (const name of required) {
      assert.equal(
        PermissionCatalog.all.includes(parseOrThrow(name)),
        true,
        `catalogo deve conter ${name}`,
      );
    }
  });

  it('CA5: contem contract:mass-approve (exibida read-only pela 005, FR-013)', () => {
    assert.equal(PermissionCatalog.all.includes(parseOrThrow('contract:mass-approve')), true);
  });

  it('#176: contem reconciliation:* (conciliacao bancaria — RBAC dos endpoints /reconciliation)', () => {
    const required = [
      'reconciliation:import',
      'reconciliation:read',
      'reconciliation:write',
      'reconciliation:close',
    ];
    for (const name of required) {
      assert.equal(
        PermissionCatalog.all.includes(parseOrThrow(name)),
        true,
        `catalogo deve conter ${name}`,
      );
    }
  });

  it('#138: contem bank-account:* (conta-cedente — RBAC dos endpoints /cedente-accounts)', () => {
    for (const name of ['bank-account:read', 'bank-account:write']) {
      assert.equal(
        PermissionCatalog.all.includes(parseOrThrow(name)),
        true,
        `catalogo deve conter ${name}`,
      );
    }
  });

  it('CA5: contem exatamente o conjunto conhecido do sistema (integridade - sem entrada perdida por typo)', () => {
    // build() filtra entradas invalidas em vez de lancar (rule domain.md: sem throw).
    // Esta verificacao garante que nenhuma permission auditada foi descartada silenciosamente.
    const expected = [
      'act:read',
      'act:write',
      'bank-account:read',
      'bank-account:write',
      'collaborator:read',
      'collaborator:write',
      'contract:delete',
      'contract:mass-approve',
      'contract:read',
      'contract:write',
      'etl:mass-approver',
      // fiscal-document:* e payable:* — modulo financial (FIN-DOCUMENTO-TITULOS)
      // payable:read e payable:undo-approval removidas (FR-010/ADR-0004 010 — permissoes inertes, sem rota).
      'fiscal-document:cancel',
      'fiscal-document:read',
      'fiscal-document:write',
      'payable:approve',
      'financier:read',
      'financier:write',
      'geography:read',
      'geography:write',
      'program:deactivate',
      'program:read',
      'program:write',
      'reconciliation:close',
      'reconciliation:import',
      'reconciliation:read',
      'reconciliation:write',
      'role:assign',
      'role:create',
      'role:read',
      'role:revoke',
      'role:update',
      'supplier:read',
      'supplier:write',
      'user:activate',
      'user:assign-role',
      'user:create',
      'user:deactivate',
      'user:list',
      'user:read',
      'user:register',
      'user:update',
    ];
    const actual = [...PermissionCatalog.all].map((p) => p as string).sort();
    assert.deepEqual(actual, [...expected].sort());
  });
});

describe('PermissionCatalog.isInCatalog', () => {
  it('CA4: true para permission presente no catalogo', () => {
    assert.equal(PermissionCatalog.isInCatalog(parseOrThrow('role:create')), true);
  });

  it('CA4: false para permission valida mas fora do catalogo', () => {
    assert.equal(PermissionCatalog.isInCatalog(parseOrThrow('unknown:permission')), false);
  });
});
