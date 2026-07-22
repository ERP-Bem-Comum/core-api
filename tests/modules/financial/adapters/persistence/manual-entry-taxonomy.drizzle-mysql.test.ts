// W0 RED (FIN-MANUAL-ENTRY-TAXONOMY · S2 do épico Taxonomia Planejável Unificada, #502) —
// colunas `budget_plan_ref` + `subcategory_ref` (varchar(36), NULL, aditivas, sem FK — ADR-0014) em
// `fin_manual_entries` (molde dos refs irmãos supplier/category/cost_center/program).
//
// Estrutura (molde `subcategory-ref-stamp.drizzle-mysql.test.ts` da S1):
//   1) BLOCO ESTRUTURAL (sempre roda, SEM DB) — introspecta o schema Drizzle (`getTableColumns`).
//      É o RED do `pnpm test` puro: hoje `fin_manual_entries` não tem os dois refs no schema mysql.ts
//      → colunas ausentes → asserção falha. Prova o CA1 no nível do schema.
//   2) BLOCO INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — prova os CAs contra MySQL real:
//      CA1 (information_schema: colunas nullable varchar), CA8 (regressão: refs irmãos seguem
//      presentes; migration aditiva não removeu nada). Registrado no grupo `financial` do runner —
//      NÃO executado nesta janela (#500). ⚠️ CHARSET/COLLATE manual na migration (refs = utf8mb4_bin).
//
// IMPORTANTE (gate limpo): NÃO importa VO nenhum — introspecta o objeto de schema Drizzle (que existe)
// e usa SQL cru na integração. O bloco de integração não registra teste sem a env var; o RED visível
// vem só do bloco estrutural. Regressão zero (CA8): nenhuma suíte existente é tocada.
//
// ASCII puro nos identificadores. Código EN, comentários PT-BR.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finManualEntries } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL (sempre roda, sem DB) — CA1 no nível do schema Drizzle.
//    RED até `budgetPlanRef`/`subcategoryRef` existirem em `finManualEntries`.
// ─────────────────────────────────────────────────────────────────────────────
type ColumnShape = Readonly<{ name: string; columnType: string; notNull: boolean }>;

const NEW_REFS: readonly Readonly<{ prop: string; physical: string }>[] = [
  { prop: 'budgetPlanRef', physical: 'budget_plan_ref' },
  { prop: 'subcategoryRef', physical: 'subcategory_ref' },
];

describe('FIN-MANUAL-ENTRY-TAXONOMY — refs no schema Drizzle de fin_manual_entries (CA1)', () => {
  for (const { prop, physical } of NEW_REFS) {
    it(`expõe ${physical} como varchar nullable (soft ref, sem FK — ADR-0014)`, () => {
      const cols = getTableColumns(finManualEntries) as Record<string, ColumnShape | undefined>;
      const col = cols[prop];
      assert.ok(col !== undefined, `fin_manual_entries: coluna ${prop} ausente no schema Drizzle`);
      assert.equal(col.name, physical, `fin_manual_entries: nome físico deve ser ${physical}`);
      assert.equal(
        col.columnType,
        'MySqlVarChar',
        `fin_manual_entries: ${physical} deve ser varchar`,
      );
      assert.equal(col.notNull, false, `fin_manual_entries: ${physical} deve ser NULL (nullable)`);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — contra MySQL real. NÃO executado nesta
//    janela (#500 destrói o dev). Registrado no grupo `financial` do runner.
// ─────────────────────────────────────────────────────────────────────────────
if (!integrationEnabled()) {
  process.stdout.write(
    '[financial:manual-entry-taxonomy] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('FIN-MANUAL-ENTRY-TAXONOMY — refs em fin_manual_entries contra MySQL (integração)', () => {
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
      column: string,
    ): Promise<{ nullable: string; dataType: string } | null> => {
      const rows = (await handle.db.execute(sql`
        SELECT IS_NULLABLE AS nullable, DATA_TYPE AS dataType
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'fin_manual_entries' AND column_name = ${column}
      `)) as unknown as [{ nullable: string; dataType: string }[]];
      const first = rows[0]?.[0];
      return first ?? null;
    };

    for (const column of ['budget_plan_ref', 'subcategory_ref'] as const) {
      it(`CA1: fin_manual_entries.${column} existe, nullable, varchar (information_schema)`, async () => {
        const meta = await columnMeta(column);
        assert.ok(meta !== null, `fin_manual_entries: coluna ${column} ausente no MySQL`);
        assert.equal(meta.nullable, 'YES', `fin_manual_entries: ${column} deve ser nullable`);
        assert.equal(meta.dataType, 'varchar', `fin_manual_entries: ${column} deve ser varchar`);
      });
    }

    it('CA8: fin_manual_entries mantém os refs irmãos (migration aditiva, regressão zero)', async () => {
      for (const sibling of ['category_ref', 'cost_center_ref', 'program_ref'] as const) {
        const meta = await columnMeta(sibling);
        assert.ok(meta !== null, `fin_manual_entries: ${sibling} não pode sumir (regressão)`);
      }
    });
  });
}
