// W0 RED (FIN-DOC-SUBCATEGORY-STAMP · S1 do épico Taxonomia Planejável Unificada, #502) —
// coluna `subcategory_ref` (varchar(36), NULL, aditiva, sem FK — ADR-0014) em `fin_documents` e
// `fin_payable_view` + índice em `fin_payable_view.subcategory_ref` (molde dos refs irmãos).
//
// Estrutura (molde `legacy-id.drizzle-mysql.test.ts` + `fin-outbox-schema.drizzle-mysql.test.ts`):
//   1) BLOCO ESTRUTURAL (sempre roda, SEM DB) — introspecta o schema Drizzle (`getTableColumns`).
//      É o RED que aparece no `pnpm test` puro: hoje nenhuma das duas tabelas tem `subcategory_ref`
//      no schema mysql.ts → coluna ausente → asserção falha. Prova o CA1 no nível do schema.
//   2) BLOCO INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — prova os CAs contra MySQL real:
//      CA1 (information_schema: coluna nullable nas duas tabelas), CA8 (regressão: refs irmãos
//      seguem presentes; migration aditiva não removeu nada). Registrado no runner (grupo
//      `financial` de scripts/ci/test-integration.ts) — NÃO executado nesta janela (#500).
//
// IMPORTANTE (gate limpo): este arquivo NÃO importa `SubcategoryRef` (símbolo inexistente em W0) —
// ele introspecta o objeto de schema Drizzle (que existe) e usa SQL cru na integração. Assim o
// bloco de integração não contamina o `pnpm test` puro (registra zero testes sem a env var), e o
// RED visível vem só do bloco estrutural. Regressão zero (CA8): nenhuma suíte existente é tocada.
//
// ASCII puro nos identificadores. Código EN, comentários PT-BR.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import type { AnyMySqlTable } from 'drizzle-orm/mysql-core';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  finDocuments,
  finPayableView,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL (sempre roda, sem DB) — CA1 no nível do schema Drizzle.
//    RED até `subcategoryRef` existir em mysql.ts nas duas tabelas.
// ─────────────────────────────────────────────────────────────────────────────
type ColumnShape = Readonly<{ name: string; columnType: string; notNull: boolean }>;

type Target = Readonly<{ dbName: string; table: AnyMySqlTable }>;

const TARGET_TABLES: readonly Target[] = [
  { dbName: 'fin_documents', table: finDocuments },
  { dbName: 'fin_payable_view', table: finPayableView },
];

describe('FIN-DOC-SUBCATEGORY-STAMP — subcategory_ref no schema Drizzle (CA1)', () => {
  for (const { dbName, table } of TARGET_TABLES) {
    describe(dbName, () => {
      it('expõe a coluna subcategory_ref como varchar nullable (soft ref, sem FK — ADR-0014)', () => {
        const cols = getTableColumns(table) as Record<string, ColumnShape | undefined>;
        const col = cols['subcategoryRef'];
        assert.ok(col !== undefined, `${dbName}: coluna subcategoryRef ausente no schema Drizzle`);
        assert.equal(
          col.name,
          'subcategory_ref',
          `${dbName}: nome físico deve ser subcategory_ref`,
        );
        assert.equal(col.columnType, 'MySqlVarChar', `${dbName}: subcategory_ref deve ser varchar`);
        assert.equal(col.notNull, false, `${dbName}: subcategory_ref deve ser NULL (nullable)`);
      });
    });
  }

  it('fin_payable_view declara índice sobre subcategory_ref (molde dos refs irmãos)', () => {
    const cfg = getTableConfig(finPayableView);
    const idx = cfg.indexes.find((ix) => {
      if (ix.config.columns.length !== 1) return false;
      const first = ix.config.columns[0] as { name?: string } | undefined;
      return first?.name === 'subcategory_ref';
    });
    assert.ok(idx !== undefined, 'fin_payable_view: índice em subcategory_ref ausente no schema');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — contra MySQL real. NÃO executado nesta
//    janela (#500 destrói o dev). Registrado no grupo `financial` do runner.
// ─────────────────────────────────────────────────────────────────────────────
if (!integrationEnabled()) {
  process.stdout.write(
    '[financial:subcategory-ref-stamp] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('FIN-DOC-SUBCATEGORY-STAMP — subcategory_ref contra MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial] falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    const columnMeta = async (
      table: string,
      column: string,
    ): Promise<{ nullable: string; dataType: string } | null> => {
      const rows = (await handle.db.execute(sql`
        SELECT IS_NULLABLE AS nullable, DATA_TYPE AS dataType
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ${table} AND column_name = ${column}
      `)) as unknown as [{ nullable: string; dataType: string }[]];
      const first = rows[0]?.[0];
      return first ?? null;
    };

    for (const table of ['fin_documents', 'fin_payable_view'] as const) {
      it(`CA1: ${table}.subcategory_ref existe, nullable, varchar (information_schema)`, async () => {
        const meta = await columnMeta(table, 'subcategory_ref');
        assert.ok(meta !== null, `${table}: coluna subcategory_ref ausente no MySQL`);
        assert.equal(meta.nullable, 'YES', `${table}: subcategory_ref deve ser nullable`);
        assert.equal(meta.dataType, 'varchar', `${table}: subcategory_ref deve ser varchar`);
      });

      it(`CA8: ${table} mantém os refs irmãos (migration aditiva, regressão zero)`, async () => {
        const budgetPlan = await columnMeta(table, 'budget_plan_ref');
        const category = await columnMeta(table, 'category_ref');
        assert.ok(category !== null, `${table}: category_ref não pode sumir (regressão)`);
        // budget_plan_ref existe em fin_documents; em fin_payable_view não é obrigatório.
        if (table === 'fin_documents') {
          assert.ok(
            budgetPlan !== null,
            'fin_documents: budget_plan_ref não pode sumir (regressão)',
          );
        }
      });
    }
  });
}
