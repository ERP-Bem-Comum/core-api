import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { getTableColumns } from 'drizzle-orm';

import {
  parFinanciers,
  parSuppliers,
  parCollaborators,
  parUserProfiles,
} from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

// P2 (PARTNERS-LEGACY-ID-COLUMNS): coluna de correlação `legacy_id` nas 4 tabelas
// `par_*`, base da idempotência da ETL (SELECT-by-legacy_id antes de inserir).
// Decisão consolidada: `int` nullable + uniqueIndex por tabela.

describe('par_* — coluna legacy_id (correlação ETL)', () => {
  const cases = [
    ['par_financiers', parFinanciers],
    ['par_suppliers', parSuppliers],
    ['par_collaborators', parCollaborators],
    ['par_user_profiles', parUserProfiles],
  ] as const;

  for (const [name, table] of cases) {
    it(`${name} expõe a coluna legacyId`, () => {
      const columns = getTableColumns(table);
      assert.ok('legacyId' in columns, `${name} deve ter a coluna legacyId`);
    });

    it(`${name}.legacyId mapeia para a coluna SQL legacy_id`, () => {
      const columns = getTableColumns(table) as Record<string, { name: string }>;
      const col = columns['legacyId'];
      assert.ok(col, `${name}.legacyId deve existir`);
      assert.equal(col.name, 'legacy_id');
    });

    it(`${name}.legacyId é nullable (NULL = registro nativo do core-api)`, () => {
      const columns = getTableColumns(table) as Record<string, { notNull: boolean }>;
      const col = columns['legacyId'];
      assert.ok(col, `${name}.legacyId deve existir`);
      assert.equal(col.notNull, false);
    });
  }
});
