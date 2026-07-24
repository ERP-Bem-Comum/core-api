/**
 * CTR-TAXONOMY-REFS — W0 (RED) — 3 colunas de taxonomia em `ctr_contracts`
 * (`cost_center_ref`/`category_ref`/`subcategory_ref`, varchar(36), NULL, sem FK — ADR-0014),
 * ao lado de `program_id`/`budget_plan_id` (S3 do épico #502 = issue #343).
 *
 * Estrutura (molde `subcategory-ref-stamp.drizzle-mysql.test.ts` da S1):
 *   1) BLOCO ESTRUTURAL (sempre roda, SEM DB) — introspecta o schema Drizzle (`getTableColumns`).
 *      É o RED do `pnpm test` puro: hoje `contracts` não tem as 3 colunas no schema mysql.ts →
 *      coluna ausente → asserção falha. Prova o CA1 no nível do schema.
 *   2) BLOCO INTEGRAÇÃO (opt-in `MYSQL_INTEGRATION=1`) — prova o round-trip contra MySQL real:
 *      CA2 (grava/lê os 3 refs) + CA8 (refs antigos program/budget seguem presentes; migration
 *      aditiva não removeu nada). Registrado no grupo `contracts` de scripts/ci/test-integration.ts —
 *      NÃO executado nesta janela (#500 destrói o dev).
 *
 * O bloco de integração fica sob `if (integrationEnabled())` → registra ZERO testes no `pnpm test`
 * puro. Regressão zero (CA8): nenhuma suíte existente é tocada.
 *
 * Código EN, comentários PT-BR.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { getTableColumns } from 'drizzle-orm';

import { contracts } from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { updateContract } from '#src/modules/contracts/domain/contract/types.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// UUID v4 válidos (version=4, variant=8, todos hex).
const COST_CENTER_REF = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CATEGORY_REF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SUBCATEGORY_REF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL (sempre roda, sem DB) — CA1 no nível do schema Drizzle.
//    RED até as 3 colunas existirem em `contracts` no mysql.ts.
// ─────────────────────────────────────────────────────────────────────────────
type ColumnShape = Readonly<{ name: string; columnType: string; notNull: boolean }>;

// property key no schema Drizzle → nome físico da coluna MySQL.
const REF_COLUMNS: readonly (readonly [prop: string, physical: string])[] = [
  ['costCenterRef', 'cost_center_ref'],
  ['categoryRef', 'category_ref'],
  ['subcategoryRef', 'subcategory_ref'],
];

describe('CTR-TAXONOMY-REFS — colunas de taxonomia no schema Drizzle de ctr_contracts (CA1)', () => {
  for (const [prop, physical] of REF_COLUMNS) {
    it(`expõe ${prop} como varchar nullable (soft ref, sem FK — ADR-0014)`, () => {
      const cols = getTableColumns(contracts) as Record<string, ColumnShape | undefined>;
      const col = cols[prop];
      assert.ok(col !== undefined, `ctr_contracts: coluna ${prop} ausente no schema Drizzle`);
      assert.equal(col.name, physical, `ctr_contracts: nome físico deve ser ${physical}`);
      assert.equal(col.columnType, 'MySqlVarChar', `ctr_contracts: ${physical} deve ser varchar`);
      assert.equal(col.notNull, false, `ctr_contracts: ${physical} deve ser NULL (nullable)`);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — contra MySQL real. NÃO executado nesta
//    janela (#500 destrói o dev). Registrado no grupo `contracts` do runner.
// ─────────────────────────────────────────────────────────────────────────────
if (integrationEnabled()) {
  const VALID_CONN = mysqlTestConnectionString();
  let handle: MysqlHandle | null = null;

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle) await handle.close();
  });

  describe('ctr_contracts — round-trip dos 3 refs de taxonomia (MySQL)', () => {
    it('CA2/CA8: grava e lê costCenterRef/categoryRef/subcategoryRef; program/budget preservados', async () => {
      assert.ok(handle, 'handle MySQL não inicializado');
      if (!handle) return;
      await handle.db.delete(handle.schema.contracts);

      const repo = createDrizzleContractRepository(handle);
      const contractor = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
      const start = PlainDate.from('2026-01-01');
      const end = PlainDate.from('2026-12-31');
      const money = Money.fromCents(5_000_000);
      assert.equal(contractor.ok && start.ok && end.ok && money.ok, true);
      if (!contractor.ok || !start.ok || !end.ok || !money.ok) return;
      const period = Period.create(start.value, end.value);
      if (!period.ok) return;

      const created = Contract.create({
        id: ContractId.generate(),
        sequentialNumber: '778/2026',
        title: 'Integração taxonomia',
        objective: 'Persistir os 3 refs do plano',
        signedAt: new Date('2026-01-15'),
        originalValue: money.value,
        originalPeriod: period.value,
        contractor: contractor.value,
        programId: '77777777-7777-4777-8777-777777777777',
        budgetPlanId: '88888888-8888-4888-8888-888888888888',
        // W1: create passa a aceitar os 3 refs.
        costCenterRef: COST_CENTER_REF,
        categoryRef: CATEGORY_REF,
        subcategoryRef: SUBCATEGORY_REF,
      } as unknown as Parameters<typeof Contract.create>[0]);
      assert.equal(created.ok, true);
      if (!created.ok) return;

      // Passa por updateContract também (garante que o patch intra-variante propaga os refs).
      const withRefs = updateContract(created.value.contract, {});
      const saved = await repo.save(withRefs, []);
      assert.equal(saved.ok, true);

      const loaded = await repo.findById(withRefs.id);
      assert.equal(loaded.ok, true);
      if (!loaded.ok || loaded.value === null) {
        assert.fail('contrato não persistido');
        return;
      }
      const c = loaded.value as unknown as {
        costCenterRef: string | null;
        categoryRef: string | null;
        subcategoryRef: string | null;
        programId: string | null;
        budgetPlanId: string | null;
      };
      assert.equal(c.costCenterRef, COST_CENTER_REF);
      assert.equal(c.categoryRef, CATEGORY_REF);
      assert.equal(c.subcategoryRef, SUBCATEGORY_REF);
      // CA8: refs antigos seguem íntegros.
      assert.equal(c.programId, '77777777-7777-4777-8777-777777777777');
      assert.equal(c.budgetPlanId, '88888888-8888-4888-8888-888888888888');
    });
  });
} else {
  process.stdout.write(
    '[contracts:taxonomy-refs] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
}
