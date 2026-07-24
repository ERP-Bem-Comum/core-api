/**
 * AUTH-SYNC-PERMISSIONS-JOB (#462) — CA4 — `readSyncPermissionsConfig`, função pura.
 *
 * Ausente, vazia ou só-espaços → err (o `run.ts` traduz para exit 78 / EX_CONFIG).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readSyncPermissionsConfig } from '#src/jobs/auth/sync-permissions/config.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID = mysqlTestConnectionString({ user: 'user', password: 'pw' });

describe('readSyncPermissionsConfig — AUTH-SYNC-PERMISSIONS-JOB W0 (CA4)', () => {
  it('CA4a: env sem AUTH_DATABASE_URL → err', () => {
    const r = readSyncPermissionsConfig({});
    assert.ok(!r.ok, 'esperado err quando a env está ausente');
    if (!r.ok) assert.equal(r.error, 'auth-database-url-missing');
  });

  it('CA4b: AUTH_DATABASE_URL vazia → err', () => {
    const r = readSyncPermissionsConfig({ AUTH_DATABASE_URL: '' });
    assert.ok(!r.ok, 'esperado err quando a env é string vazia');
  });

  it('CA4c: AUTH_DATABASE_URL só com espaços → err', () => {
    const r = readSyncPermissionsConfig({ AUTH_DATABASE_URL: '   ' });
    assert.ok(!r.ok, 'esperado err quando a env é só espaços');
  });

  it('CA4d: AUTH_DATABASE_URL válida → ok com a connection string', () => {
    const r = readSyncPermissionsConfig({ AUTH_DATABASE_URL: VALID });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.value.connectionString, VALID);
  });

  // O job sincroniza catálogo, não cria usuário: as envs do seed:admin são irrelevantes aqui.
  // Se um dia alguém as exigir, este teste reprova — e o job deixaria de rodar no deploy.
  it('CA4e: não exige as envs de usuário do seed:admin (ADMIN_EMAIL etc.)', () => {
    const r = readSyncPermissionsConfig({ AUTH_DATABASE_URL: VALID });
    assert.ok(r.ok, 'só AUTH_DATABASE_URL basta — ADMIN_* não são requisito');
  });
});
