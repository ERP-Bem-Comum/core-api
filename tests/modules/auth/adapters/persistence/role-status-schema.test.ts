/**
 * W0 (RED) — AUTH-ROLE-SCHEMA-STATUS — guards estaticos do status de auth_role.
 *
 * Ticket: AUTH-ROLE-SCHEMA-STATUS (spec 006-gestao-acessos, Phase 2, T010 parte DDL).
 *
 * Meta-teste estatico (le schema.ts + migrations .sql; sem Docker), espelha
 * schema-hardening.test.ts. Valida a coluna `status` (active/archived) + CHECK em auth_role.
 * A integracao real (aplicar migration + INFORMATION_SCHEMA) e gate do W3 atras de opt-in.
 *
 * DEVE FALHAR em W0 — status ainda nao foi adicionado ao authRole nem gerada a migration.
 *
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..', '..', '..', '..');
const PERSISTENCE = resolve(PROJECT_ROOT, 'src', 'modules', 'auth', 'adapters', 'persistence');
const MIGRATIONS_DIR = resolve(PERSISTENCE, 'migrations', 'mysql');
const SCHEMA_MYSQL = resolve(PERSISTENCE, 'schemas', 'mysql.ts');

const read = (path: string): string => readFileSync(path, 'utf-8');

// Concatena todas as migrations .sql (a coluna status vive numa migration nova, nao na 0000).
const allMigrationsSql = (): string =>
  readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => read(resolve(MIGRATIONS_DIR, f)))
    .join('\n');

// Extrai o corpo do bloco `export const authRole = mysqlTable( ... );` do schema.ts.
const authRoleBlock = (): string => {
  const ts = read(SCHEMA_MYSQL);
  const start = ts.indexOf('export const authRole = mysqlTable');
  assert.notEqual(start, -1, 'bloco authRole ausente no schema.ts');
  // Ate o proximo `export const` (ou fim do arquivo).
  const rest = ts.slice(start + 1);
  const next = rest.indexOf('\nexport const ');
  return next === -1 ? rest : rest.slice(0, next);
};

describe('AUTH-ROLE-SCHEMA-STATUS — CA1: coluna status no schema', () => {
  it('CA1: authRole declara coluna status varchar(16) notNull', () => {
    const block = authRoleBlock();
    assert.match(block, /status:\s*varchar\(\s*['"]status['"]\s*,\s*\{\s*length:\s*16\s*\}\s*\)/);
    assert.match(block, /\.notNull\(\)/);
  });
});

describe('AUTH-ROLE-SCHEMA-STATUS — CA2: CHECK status no schema', () => {
  it('CA2: authRole declara CHECK auth_role_status_chk com IN (active, archived)', () => {
    const block = authRoleBlock();
    assert.match(block, /auth_role_status_chk/);
    assert.match(block, /status/);
    assert.match(block, /active/);
    assert.match(block, /archived/);
  });
});

describe('AUTH-ROLE-SCHEMA-STATUS — CA3: migration gerada', () => {
  it('CA3: alguma migration contem o CHECK auth_role_status_chk', () => {
    const sql = allMigrationsSql();
    assert.match(sql, /auth_role_status_chk/i);
  });

  it('CA3: a migration referencia o status restrito a active/archived', () => {
    const sql = allMigrationsSql();
    assert.match(sql, /'active'\s*,\s*'archived'/i);
  });
});
