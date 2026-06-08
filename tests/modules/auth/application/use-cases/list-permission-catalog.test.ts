/**
 * W0 (RED) - AUTH-LIST-PERMISSION-CATALOG: use case listPermissionCatalog (US2 da spec 006).
 *
 * DEVE FALHAR em W0 - o use case list-permission-catalog.ts ainda nao existe.
 * Catalogo fixo, read-only (FR-011). Sempre ok(...). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { listPermissionCatalog } from '#src/modules/auth/application/use-cases/list-permission-catalog.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

describe('AUTH-LIST-PERMISSION-CATALOG — listPermissionCatalog', () => {
  it('retorna todos os itens do catalogo', async () => {
    const result = await listPermissionCatalog()();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, PermissionCatalog.all.length);
  });

  it('nao tem duplicatas (Set de ids === length)', async () => {
    const result = await listPermissionCatalog()();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const ids = result.value.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('cada item tem formato resource:action (resource e action nao vazios)', async () => {
    const result = await listPermissionCatalog()();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    for (const item of result.value) {
      assert.ok(item.resource.length > 0, `resource vazio em ${item.id}`);
      assert.ok(item.action.length > 0, `action vazio em ${item.id}`);
      assert.equal(item.id, `${item.resource}:${item.action}`);
    }
  });

  it('inclui ancoras conhecidas (role:read, user:list)', async () => {
    const result = await listPermissionCatalog()();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const ids = result.value.map((item) => item.id);
    assert.ok(ids.includes('role:read'), 'falta role:read');
    assert.ok(ids.includes('user:list'), 'falta user:list');
  });
});
