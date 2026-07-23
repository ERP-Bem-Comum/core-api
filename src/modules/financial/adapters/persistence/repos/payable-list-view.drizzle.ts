// Adapter Drizzle do PayableListView (#221) — read path payable-centric. `SELECT … FROM fin_payables
// INNER JOIN fin_documents` (cada título é uma linha; filhos de retenção viram linhas próprias).
// Boundary: try/catch → Result (.claude/rules/adapters.md).

import { and, between, desc, eq, sql, type SQL } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  PayableListFilter,
  PayableListItem,
  Page,
} from '#src/modules/financial/domain/payable/query.ts';
import type {
  PayableListView,
  PayableListViewError,
} from '#src/modules/financial/application/ports/payable-list-view.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finDocuments, finPayables } from '../schemas/mysql.ts';
import { rowToPayableListItem } from '../mappers/payable-list.mapper.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-payable-list-view] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzlePayableListView = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PayableListView => {
  const { db } = handle;

  // Predicados do filtro (status do título em fin_payables; documentType/fornecedor em fin_documents).
  const wheres = (filter: PayableListFilter): SQL | undefined => {
    const conds: SQL[] = [];
    if (filter.status !== undefined) conds.push(eq(finPayables.status, filter.status));
    if (filter.documentType !== undefined) conds.push(eq(finDocuments.type, filter.documentType));
    if (filter.supplierRef !== undefined)
      conds.push(eq(finDocuments.supplierRef, filter.supplierRef));
    if (filter.dueFrom !== undefined && filter.dueTo !== undefined)
      conds.push(between(finPayables.dueDate, filter.dueFrom, filter.dueTo));
    return conds.length > 0 ? and(...conds) : undefined;
  };

  return {
    findPaged: async (
      filter: PayableListFilter,
      page: number,
      pageSize: number,
    ): Promise<Result<Page<PayableListItem>, PayableListViewError>> => {
      try {
        const where = wheres(filter);

        const totalRows = await db
          .select({ n: sql<number>`count(*)` })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .where(where);
        const total = totalRows[0]?.n ?? 0;

        const rows = await db
          .select({
            payableId: finPayables.id,
            documentId: finPayables.documentId,
            kind: finPayables.kind,
            retentionType: finPayables.retentionType,
            valueCents: finPayables.value,
            dueDate: finPayables.dueDate,
            status: finPayables.status,
            documentNumber: finDocuments.documentNumber,
            series: finDocuments.series,
            documentType: finDocuments.type,
            supplierRef: finDocuments.supplierRef,
            contractRef: finDocuments.contractRef,
            issueDate: finDocuments.issueDate,
            paymentMethod: finDocuments.paymentMethod,
            version: finDocuments.version,
            grossValueCents: finDocuments.grossValue,
            netValueCents: finDocuments.netValue,
            paidAt: finPayables.paidAt,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .where(where)
          // #263: lançamento mais recente no topo (default). Desempate por id desc (estável).
          .orderBy(desc(finPayables.createdAt), desc(finPayables.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

        const items: PayableListItem[] = [];
        for (const row of rows) {
          const mapped = rowToPayableListItem(row);
          if (!mapped.ok) {
            logStore('findPaged:map', mapped.error);
            return err('payable-list-view-failure');
          }
          items.push(mapped.value);
        }
        return ok({ items, page, pageSize, total });
      } catch (cause) {
        logStore('findPaged', cause);
        return err('payable-list-view-failure');
      }
    },
  };
};
