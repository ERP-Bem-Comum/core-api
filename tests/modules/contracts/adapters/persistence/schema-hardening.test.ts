/**
 * CTR-DB-SCHEMA-HARDENING — W0 (RED) — guards estruturais
 *
 * Cobre:
 *   CA-15 — 0000_*.sql declara ENGINE + DEFAULT CHARSET utf8mb4 + COLLATE utf8mb4_unicode_ci por tabela.
 *   CA-16 — 0000_*.sql declara COLLATE utf8mb4_bin em colunas UUID (id, contract_id, amendment_id, signed_document_ref, homologated_by).
 *   CA-17 — 0000_*.sql não contém o nome longo `ctr_amendments_contract_id_ctr_contracts_id_fk` (L2).
 *   CA-18 — 0000_*.sql contém `ctr_amend_contract_fk` (L2).
 *   CA-19 — 0000_snapshot.json espelha o nome curto da FK em `amendments`.
 *   CA-20 — contract-repository.drizzle.ts contém `.for('update')` no SELECT do persistContract (M3).
 *   CA-21 — amendment-repository.drizzle.ts contém `.for('update')` no SELECT do save (M3).
 *   CA-22 — money.mapper.ts não cita SQLite (M6).
 *   CA-23 — schemas/mysql.ts em `amendments` declara `foreignKey({ name: 'ctr_amend_contract_fk' ... })`.
 *
 * Sustentação: audit `handbook/reviews/0002-audit-adapters-persistence-mysql.md` §M1, §M3, §M6, §L2.
 * Padrão de meta-teste consistente com `contract-repository.shape.test.ts` (CTR-DB-REPO-LIST-N1).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..', '..', '..', '..');
const PERSISTENCE = resolve(PROJECT_ROOT, 'src', 'modules', 'contracts', 'adapters', 'persistence');

const MIGRATION_0000 = resolve(PERSISTENCE, 'migrations', 'mysql', '0000_superb_inhumans.sql');
const SNAPSHOT_0000 = resolve(PERSISTENCE, 'migrations', 'mysql', 'meta', '0000_snapshot.json');
const SCHEMA_MYSQL = resolve(PERSISTENCE, 'schemas', 'mysql.ts');
const MONEY_MAPPER = resolve(PERSISTENCE, 'mappers', 'money.mapper.ts');
const CONTRACT_REPO = resolve(PERSISTENCE, 'repos', 'contract-repository.drizzle.ts');
const AMENDMENT_REPO = resolve(PERSISTENCE, 'repos', 'amendment-repository.drizzle.ts');

const read = (path: string): string => readFileSync(path, 'utf-8');

// ─── CA-15 — ENGINE + charset/collate por tabela ──────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-15: charset/collate por tabela', () => {
  it('CA-15: 3 CREATE TABLE com ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci', () => {
    const sql = read(MIGRATION_0000);
    const tables = ['ctr_amendments', 'ctr_contract_homologated_amendments', 'ctr_contracts'];
    for (const tableName of tables) {
      // Procura o bloco CREATE TABLE até o `;` ou próximo statement-breakpoint.
      const re = new RegExp(
        `CREATE TABLE \`${tableName}\`[\\s\\S]*?\\)[\\s]*ENGINE\\s*=\\s*InnoDB\\s+DEFAULT\\s+CHARSET\\s*=\\s*utf8mb4\\s+COLLATE\\s*=\\s*utf8mb4_unicode_ci`,
        'i',
      );
      assert.match(
        sql,
        re,
        `tabela ${tableName} deve ter ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ` +
          '(audit §M1, ADR-0014 server-default).',
      );
    }
  });
});

// ─── CA-16 — UUID columns em utf8mb4_bin ─────────────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-16: UUID columns em utf8mb4_bin', () => {
  it('CA-16: pelo menos 7 colunas varchar(36) com COLLATE utf8mb4_bin', () => {
    const sql = read(MIGRATION_0000);
    // Match `varchar(36) ... COLLATE utf8mb4_bin` em qualquer ordem usual.
    const matches = sql.match(/varchar\(36\)[^,\n]*?COLLATE\s+utf8mb4_bin/gi);
    const count = matches?.length ?? 0;
    assert.ok(
      count >= 7,
      `esperado ≥ 7 colunas UUID com COLLATE utf8mb4_bin; encontrado ${count}. ` +
        'Audit §M1 — UUIDs em binary collation evita drift de comparação Unicode.',
    );
  });
});

// ─── CA-17 — sem nome longo de FK (L2) ────────────────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-17: rename FK longo (L2)', () => {
  it('CA-17: 0000_*.sql NÃO contém ctr_amendments_contract_id_ctr_contracts_id_fk', () => {
    const sql = read(MIGRATION_0000);
    assert.ok(
      !sql.includes('ctr_amendments_contract_id_ctr_contracts_id_fk'),
      'audit §L2 — nome longo deveria ter sido substituído por `ctr_amend_contract_fk`.',
    );
  });
});

// ─── CA-18 — nome curto presente no SQL ──────────────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-18: nome curto presente', () => {
  it('CA-18: 0000_*.sql contém ctr_amend_contract_fk', () => {
    const sql = read(MIGRATION_0000);
    assert.ok(
      sql.includes('ctr_amend_contract_fk'),
      '0000_*.sql deve ter a FK ctr_amend_contract_fk (renomeada de longo — L2).',
    );
  });
});

// ─── CA-19 — snapshot espelha rename ─────────────────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-19: snapshot espelha rename', () => {
  it('CA-19: 0000_snapshot.json NÃO contém ctr_amendments_contract_id_ctr_contracts_id_fk', () => {
    const json = read(SNAPSHOT_0000);
    assert.ok(
      !json.includes('ctr_amendments_contract_id_ctr_contracts_id_fk'),
      'snapshot deve refletir o nome curto (L2).',
    );
  });

  it('CA-19.2: 0000_snapshot.json contém ctr_amend_contract_fk', () => {
    const json = read(SNAPSHOT_0000);
    assert.ok(json.includes('ctr_amend_contract_fk'), 'snapshot deve listar a FK renomeada.');
  });
});

// ─── CA-20 — contract-repository com .for('update') ──────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-20: contract-repository SELECT FOR UPDATE', () => {
  it("CA-20: contract-repository.drizzle.ts contém .for('update') no persistContract", () => {
    const src = read(CONTRACT_REPO);
    assert.match(
      src,
      /persistContract[\s\S]*?\.for\(\s*['"]update['"]\s*\)/,
      "audit §M3 — SELECT pré-INSERT/UPDATE deve usar `.for('update')` para gap lock.",
    );
  });
});

// ─── CA-21 — amendment-repository com .for('update') ─────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-21: amendment-repository SELECT FOR UPDATE', () => {
  it("CA-21: amendment-repository.drizzle.ts contém .for('update') no save", () => {
    const src = read(AMENDMENT_REPO);
    assert.match(
      src,
      /\.for\(\s*['"]update['"]\s*\)/,
      "audit §M3 — SELECT pré-INSERT/UPDATE deve usar `.for('update')`.",
    );
  });
});

// ─── CA-22 — money.mapper.ts sem SQLite ───────────────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-22: comentário SQLite removido', () => {
  it('CA-22: money.mapper.ts NÃO cita SQLite (audit §M6, ADR-0020)', () => {
    const src = read(MONEY_MAPPER);
    assert.ok(
      !/SQLite/i.test(src),
      'audit §M6 — comentário cita SQLite (banido por ADR-0020). Limpar.',
    );
  });
});

// ─── CA-23 — schema TS declara foreignKey custom ─────────────────────────
describe('CTR-DB-SCHEMA-HARDENING — CA-23: schema TS declara foreignKey custom', () => {
  it("CA-23: schemas/mysql.ts declara foreignKey({ name: 'ctr_amend_contract_fk' })", () => {
    const src = read(SCHEMA_MYSQL);
    assert.match(
      src,
      /foreignKey\(\s*\{[^}]*name:\s*['"]ctr_amend_contract_fk['"]/,
      'schema TS deve declarar FK custom (L2) para que drizzle-kit não regenere o nome longo.',
    );
  });
});
