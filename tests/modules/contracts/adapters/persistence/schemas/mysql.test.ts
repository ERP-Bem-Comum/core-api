/**
 * CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — W0 (RED)
 *
 * Valida os 14 CAs do `000-request.md` inspecionando a config runtime do schema
 * MySQL via `drizzle-orm/mysql-core` `getTableConfig`. Não toca em DB real —
 * apenas o TypeScript schema declarado em `src/.../schemas/mysql.ts`.
 *
 * Sustentação:
 *   - ADR-0020 §"Convenção de nomenclatura" — prefixo `ctr_*`
 *   - DB Audit F-H2 (índice contract_id), F-M2 (índices status/signed_at)
 *   - DB Audit F-L1 (CHECK endedAt/status), F-L2 (CHECK homologation completeness)
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import {
  amendments,
  contractHomologatedAmendments,
  contracts,
} from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';

// ─── CA-1 — nomes de tabela com prefixo ctr_ ─────────────────────────────
describe('CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — CA-1: nomes de tabela', () => {
  it('CA-1a: contracts table name === "ctr_contracts"', () => {
    const cfg = getTableConfig(contracts);
    assert.equal(cfg.name, 'ctr_contracts');
  });

  it('CA-1b: amendments table name === "ctr_amendments"', () => {
    const cfg = getTableConfig(amendments);
    assert.equal(cfg.name, 'ctr_amendments');
  });

  it('CA-1c: contract_homologated_amendments table name === "ctr_contract_homologated_amendments"', () => {
    const cfg = getTableConfig(contractHomologatedAmendments);
    assert.equal(cfg.name, 'ctr_contract_homologated_amendments');
  });
});

// ─── CA-2 a CA-4 — índices que fecham F-H2 e F-M2 ─────────────────────────
describe('CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — CA-2..4: índices', () => {
  // Extrai o nome da coluna de uma entrada de `idx.config.columns`. No Drizzle
  // 0.45.x, são instâncias de coluna do schema (têm `.name: string`). String
  // literal pura é caso de borda raríssimo; tratamos via `typeof`.
  const columnName = (col: unknown): string => {
    if (typeof col === 'string') return col;
    if (typeof col === 'object' && col !== null && 'name' in col) {
      const n = (col as { name: unknown }).name;
      return typeof n === 'string' ? n : '';
    }
    return '';
  };

  const findIndex = (
    tableName: 'amendments' | 'contracts',
    indexName: string,
  ): { name: string; columns: readonly string[] } | undefined => {
    const cfg = tableName === 'amendments' ? getTableConfig(amendments) : getTableConfig(contracts);
    const idx = cfg.indexes.find((i) => i.config.name === indexName);
    if (!idx) return undefined;
    return {
      name: idx.config.name ?? '',
      columns: idx.config.columns.map(columnName),
    };
  };

  it('CA-2: ctr_amendments_contract_id_idx existe e cobre contract_id (F-H2)', () => {
    const idx = findIndex('amendments', 'ctr_amendments_contract_id_idx');
    assert.ok(idx, 'índice ctr_amendments_contract_id_idx não encontrado');
    assert.deepEqual(idx.columns, ['contract_id']);
  });

  it('CA-3: ctr_contracts_status_idx existe e cobre status (F-M2)', () => {
    const idx = findIndex('contracts', 'ctr_contracts_status_idx');
    assert.ok(idx, 'índice ctr_contracts_status_idx não encontrado');
    assert.deepEqual(idx.columns, ['status']);
  });

  it('CA-4: ctr_contracts_signed_at_idx existe e cobre signed_at (F-M2)', () => {
    const idx = findIndex('contracts', 'ctr_contracts_signed_at_idx');
    assert.ok(idx, 'índice ctr_contracts_signed_at_idx não encontrado');
    assert.deepEqual(idx.columns, ['signed_at']);
  });
});

// ─── CA-5 — CHECKs herdados com prefix ctr_ ───────────────────────────────
describe('CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — CA-5: CHECKs renomeados com prefix', () => {
  const checkExists = (tableName: 'contracts' | 'amendments', checkName: string): boolean => {
    const cfg = tableName === 'contracts' ? getTableConfig(contracts) : getTableConfig(amendments);
    return cfg.checks.some((c) => c.name === checkName);
  };

  it('CA-5a: ctr_contracts_original_period_kind_chk', () => {
    assert.ok(checkExists('contracts', 'ctr_contracts_original_period_kind_chk'));
  });

  it('CA-5b: ctr_contracts_current_period_kind_chk', () => {
    assert.ok(checkExists('contracts', 'ctr_contracts_current_period_kind_chk'));
  });

  it('CA-5c: ctr_contracts_status_chk', () => {
    assert.ok(checkExists('contracts', 'ctr_contracts_status_chk'));
  });

  it('CA-5d: ctr_amendments_kind_chk', () => {
    assert.ok(checkExists('amendments', 'ctr_amendments_kind_chk'));
  });

  it('CA-5e: ctr_amendments_status_chk', () => {
    assert.ok(checkExists('amendments', 'ctr_amendments_status_chk'));
  });
});

// ─── CA-6 — CHECK F-L1 ────────────────────────────────────────────────────
describe('CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — CA-6: CHECK F-L1 endedAt ⟺ status terminado', () => {
  it('CA-6: ctr_contracts_ended_at_consistency_chk existe', () => {
    const cfg = getTableConfig(contracts);
    const chk = cfg.checks.find((c) => c.name === 'ctr_contracts_ended_at_consistency_chk');
    assert.ok(chk, 'CHECK ctr_contracts_ended_at_consistency_chk não encontrado');
  });
});

// ─── CA-7 — CHECK F-L2 ────────────────────────────────────────────────────
describe('CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — CA-7: CHECK F-L2 homologation completeness', () => {
  it('CA-7: ctr_amendments_homologation_completeness_chk existe', () => {
    const cfg = getTableConfig(amendments);
    const chk = cfg.checks.find((c) => c.name === 'ctr_amendments_homologation_completeness_chk');
    assert.ok(chk, 'CHECK ctr_amendments_homologation_completeness_chk não encontrado');
  });
});

// ─── CA-8 a CA-10 — constraints estruturais (PK composta, FK, Unique) ─────
describe('CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — CA-8..10: constraints estruturais', () => {
  it('CA-8: PK composta de ctr_contract_homologated_amendments é (contract_id, amendment_id)', () => {
    const cfg = getTableConfig(contractHomologatedAmendments);
    assert.equal(cfg.primaryKeys.length, 1, 'esperado 1 PK composta');
    const pk = cfg.primaryKeys[0];
    assert.ok(pk, 'PK não encontrada');
    const cols = pk.columns.map((c) => c.name);
    assert.deepEqual(cols, ['contract_id', 'amendment_id']);
  });

  it('CA-9: FK ctr_amendments.contract_id → ctr_contracts.id existe', () => {
    const cfg = getTableConfig(amendments);
    const fkContractId = cfg.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.columns.some((c) => c.name === 'contract_id');
    });
    assert.ok(fkContractId, 'FK contract_id não encontrada');
    const ref = fkContractId.reference();
    assert.equal(getTableConfig(ref.foreignTable as typeof contracts).name, 'ctr_contracts');
    assert.deepEqual(
      ref.foreignColumns.map((c) => c.name),
      ['id'],
    );
  });

  it('CA-10: ctr_contracts.sequential_number é UNIQUE', () => {
    const cfg = getTableConfig(contracts);
    const sequentialCol = cfg.columns.find((c) => c.name === 'sequential_number');
    assert.ok(sequentialCol, 'coluna sequential_number não encontrada');
    assert.equal(
      sequentialCol.isUnique,
      true,
      'sequential_number deveria ser UNIQUE (sem alterações vs schema atual)',
    );
  });
});
