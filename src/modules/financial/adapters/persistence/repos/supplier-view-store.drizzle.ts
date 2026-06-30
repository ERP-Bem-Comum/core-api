// Adapter Drizzle do SupplierViewStore (read-model de fornecedor — US2 #47 / ADR-0043).
//
// `upsert`: INSERT ... ON DUPLICATE KEY UPDATE com GUARD de recência por `occurred_at`
//   (ADR-0020 §"ON DUPLICATE KEY UPDATE permitido"). Cada coluna só é sobrescrita se o
//   evento entrante for >= o gravado — absorve at-least-once e eventos fora de ordem (FR-003),
//   atomicamente (sem SELECT-then-UPDATE, sem race entre consumers concorrentes).
// `get`: SELECT por supplier_ref (lookup do JOIN/listagem).
//
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
//   (.claude/rules/adapters.md §"converter para Result na borda").

import { eq, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type {
  SupplierViewStore,
  SupplierViewStoreError,
} from '#src/modules/financial/application/ports/supplier-view-store.ts';
import type { SupplierView } from '#src/modules/financial/domain/supplier-view/types.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finSupplierView } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-supplier-view-store] ${op} failed: ${String(cause)}\n`);
};

// `values(col)` referencia o valor que SERIA inserido (lado do INSERT) no ON DUPLICATE KEY UPDATE.
const incoming = (column: string): ReturnType<typeof sql.raw> => sql.raw(`values(\`${column}\`)`);

export const createDrizzleSupplierViewStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): SupplierViewStore => {
  const { db } = handle;

  return {
    upsert: async (view): Promise<Result<void, SupplierViewStoreError>> => {
      try {
        const now = clock.now();
        // Guard: só sobrescreve quando o evento entrante é >= o gravado (não regride).
        const fresher = sql`${incoming('occurred_at')} >= ${finSupplierView.occurredAt}`;
        await db
          .insert(finSupplierView)
          .values({
            supplierRef: view.supplierRef,
            name: view.name,
            document: view.document,
            occurredAt: view.occurredAt,
            updatedAt: now,
          })
          .onDuplicateKeyUpdate({
            set: {
              name: sql`if(${fresher}, ${incoming('name')}, ${finSupplierView.name})`,
              document: sql`if(${fresher}, ${incoming('document')}, ${finSupplierView.document})`,
              occurredAt: sql`if(${fresher}, ${incoming('occurred_at')}, ${finSupplierView.occurredAt})`,
              updatedAt: sql`if(${fresher}, ${incoming('updated_at')}, ${finSupplierView.updatedAt})`,
            },
          });
        return ok(undefined);
      } catch (cause) {
        logStore('upsert', cause);
        return err('supplier-view-store-unavailable');
      }
    },

    get: async (supplierRef): Promise<Result<SupplierView | null, SupplierViewStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finSupplierView)
          .where(eq(finSupplierView.supplierRef, supplierRef))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);
        return ok({
          supplierRef: row.supplierRef,
          name: row.name,
          document: row.document,
          occurredAt: row.occurredAt,
        });
      } catch (cause) {
        logStore('get', cause);
        return err('supplier-view-store-unavailable');
      }
    },
  };
};
