/**
 * USR-SEED-PERMISSIONS — W0 (RED) — preset canônico de permissões de admin de dev.
 *
 * DEVE FALHAR: `adminDevPermissions` / `buildAdminDevSeedUser` ainda não existem em
 * `auth/adapters/http/dev-seed.ts`. GREEN quando o W1 entregar o preset derivado do catálogo
 * (`permission-catalog.ts`) + o helper de seed.
 *
 * Camada unit (entra no `pnpm test`): preset é puro, sem I/O.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';
import {
  adminDevPermissions,
  buildAdminDevSeedUser,
} from '#src/modules/auth/adapters/http/dev-seed.ts';
import { parseE2eAuthSeed } from '#src/modules/auth/public-api/http.ts';

describe('adminDevPermissions — preset canônico (CA1/CA2)', () => {
  it('CA1: inclui as âncoras program:* e o conjunto user:*', () => {
    const anchors = [
      'program:read',
      'program:write',
      'program:deactivate',
      'user:list',
      'user:read',
      'user:create',
      'user:register',
      'user:update',
      'user:activate',
      'user:deactivate',
      'user:assign-role',
    ];
    for (const anchor of anchors) {
      assert.ok(adminDevPermissions.includes(anchor), `preset deve conter ${anchor}`);
    }
  });

  it('CA2: cobre todo o catálogo, sem drift (conjunto === PermissionCatalog.all)', () => {
    const catalog = new Set(PermissionCatalog.all.map((p) => String(p)));
    const preset = new Set(adminDevPermissions);
    assert.deepEqual(preset, catalog);
  });

  it('CA2: sem duplicatas no preset', () => {
    assert.equal(adminDevPermissions.length, new Set(adminDevPermissions).size);
  });
});

describe('buildAdminDevSeedUser — seed parseável (CA3)', () => {
  it('CA3: produz AuthSeedUser aceito por parseE2eAuthSeed sob CORE_API_E2E=1', () => {
    const user = buildAdminDevSeedUser({
      email: 'admin@bemcomum.dev',
      password: 'Str0ng-Passphrase-2026!',
    });
    const seed = parseE2eAuthSeed({
      CORE_API_E2E: '1',
      AUTH_SEED_JSON: JSON.stringify({ users: [user] }),
    });
    assert.ok(seed !== undefined);
    assert.equal(seed.users.length, 1);
    assert.equal(seed.users[0]!.email, 'admin@bemcomum.dev');
    assert.deepEqual([...seed.users[0]!.permissions].sort(), [...adminDevPermissions].sort());
  });
});
