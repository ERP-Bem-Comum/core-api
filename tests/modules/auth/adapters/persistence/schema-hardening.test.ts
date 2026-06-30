/**
 * AUTH-DB-SCHEMA (P0) — W0 (RED) — guards estruturais do schema/migration auth_*.
 *
 * Meta-teste estático (lê SQL da migration + schema.ts; sem Docker) — espelha
 * tests/modules/contracts/adapters/persistence/schema-hardening.test.ts. Valida o blueprint do DBA
 * (001-schema-blueprint.md). DEVE FALHAR em W0 (schema.ts e migration auth ainda não existem).
 *
 * O teste de integração (aplicar migration + INFORMATION_SCHEMA contra MySQL real) é gate do W3.
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

// Localiza a primeira migration 0000_*.sql (nome é gerado pelo drizzle-kit).
const migration0000 = (): string => {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^0000_.*\.sql$/.test(f));
  if (files[0] === undefined) throw new Error('migration 0000_*.sql ausente');
  return read(resolve(MIGRATIONS_DIR, files[0]));
};

const TABLES = [
  'auth_user',
  'auth_role',
  'auth_permission',
  'auth_role_permission',
  'auth_user_role',
  'auth_refresh_token',
] as const;

describe('AUTH-DB-SCHEMA — CA1: 6 tabelas com ENGINE+charset/collate', () => {
  it('CA1: cada CREATE TABLE declara ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci', () => {
    const sql = migration0000();
    for (const table of TABLES) {
      const re = new RegExp(
        `CREATE TABLE \`${table}\`[\\s\\S]*?\\)[\\s]*ENGINE\\s*=\\s*InnoDB\\s+DEFAULT\\s+CHARSET\\s*=\\s*utf8mb4\\s+COLLATE\\s*=\\s*utf8mb4_unicode_ci`,
        'i',
      );
      assert.match(sql, re, `${table} sem ENGINE/charset/collate (blueprint §DDL).`);
    }
  });
});

describe('AUTH-DB-SCHEMA — CA2: UUIDs em utf8mb4_bin', () => {
  it('CA2: >= 10 colunas varchar(36) COLLATE utf8mb4_bin', () => {
    const sql = migration0000();
    const count = (sql.match(/varchar\(36\)[^,\n]*?COLLATE\s+utf8mb4_bin/gi) ?? []).length;
    assert.ok(count >= 10, `esperado >= 10 UUID varchar(36) utf8mb4_bin; achou ${String(count)}.`);
  });
});

describe('AUTH-DB-SCHEMA — CA3/CA4: unicidade crítica', () => {
  it('CA3: auth_user.email UNIQUE (rede de unicidade -> email-already-registered)', () => {
    const sql = migration0000();
    assert.match(sql, /CREATE\s+TABLE\s+`auth_user`/i);
    assert.match(sql, /auth_user_email_idx/i);
    assert.match(sql, /unique/i);
  });

  it('CA4: auth_refresh_token.token_hash CHAR(64) UNIQUE', () => {
    const sql = migration0000();
    assert.match(sql, /token_hash`?\s+char\(64\)/i);
    assert.match(sql, /auth_rt_token_hash_idx/i);
  });
});

describe('AUTH-DB-SCHEMA — CA5: índice composto findRevocableByUserId', () => {
  it('CA5: índice (user_id, revoked_at) em auth_refresh_token', () => {
    const sql = migration0000();
    assert.match(sql, /auth_rt_user_revoked_idx/i);
  });
});

describe('AUTH-DB-SCHEMA — CA6: CHECKs de invariante', () => {
  it('CA6: status IN + bicondicional disabled + expiry + hash não-vazio', () => {
    const sql = migration0000();
    assert.match(sql, /auth_user_status_chk/i);
    assert.match(sql, /auth_user_disabled_consistency_chk/i);
    assert.match(sql, /auth_rt_expiry_chk/i);
  });
});

describe('AUTH-DB-SCHEMA — CA7: FKs ON DELETE RESTRICT', () => {
  it('CA7: nenhuma FK com ON DELETE CASCADE; FKs nomeadas presentes', () => {
    const sql = migration0000();
    assert.doesNotMatch(sql, /ON\s+DELETE\s+CASCADE/i, 'CASCADE proibido (best-practice 06).');
    for (const fk of ['auth_rt_user_fk', 'auth_urt_user_fk', 'auth_rp_role_fk']) {
      assert.match(sql, new RegExp(fk, 'i'), `FK ${fk} ausente.`);
    }
  });
});

describe('AUTH-DB-SCHEMA — CA8: schema.ts declara as 6 tabelas', () => {
  it('CA8: schemas/mysql.ts exporta os 6 mysqlTable auth_*', () => {
    const ts = read(SCHEMA_MYSQL);
    for (const table of TABLES) {
      assert.match(ts, new RegExp(`['\`]${table}['\`]`), `mysqlTable ${table} ausente no schema.`);
    }
  });
});
