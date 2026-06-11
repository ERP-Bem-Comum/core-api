// 010-partner-contract-counts — adapter Drizzle do ContractCountReadPort. Contagem em LOTE (2 GROUP BY:
// contratos por contratado + aditivos via JOIN). Conta todos os estados. `selectDistinct` para os filtros
// R2. Boundary: try/catch → Result (zero throw). ADR-0014 (só `ctr_*`). ADR-0020 (COUNT/GROUP BY/JOIN ok).

import { and, eq, inArray, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ContractCountReadPort,
  ContractCountReadError,
  ContractorCount,
} from '../../../application/ports/contract-count-read.ts';
import type { ContractorType } from '../../../domain/shared/contractor.ts';
import type { ContractStatus } from '../../../domain/contract/types.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[contract-count-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleContractCountReadStore = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractCountReadPort => {
  const { db, schema } = handle;
  const c = schema.contracts;
  const a = schema.amendments;

  const distinctIds = async (
    scope: string,
    where: ReturnType<typeof and>,
  ): Promise<Result<ReadonlySet<string>, ContractCountReadError>> => {
    try {
      const rows = await db.selectDistinct({ id: c.contractorId }).from(c).where(where);
      return ok(new Set(rows.map((r) => r.id)));
    } catch (cause) {
      logRead(scope, cause);
      return err('contract-count-read-unavailable');
    }
  };

  return {
    countByContractor: async (type: ContractorType, ids) => {
      if (ids.length === 0) return ok(new Map<string, ContractorCount>());
      const list = [...ids];
      try {
        const contractRows = await db
          .select({ id: c.contractorId, n: sql<number>`count(*)` })
          .from(c)
          .where(and(eq(c.contractorType, type), inArray(c.contractorId, list)))
          .groupBy(c.contractorId);
        const amendmentRows = await db
          .select({ id: c.contractorId, n: sql<number>`count(*)` })
          .from(a)
          .innerJoin(c, eq(a.contractId, c.id))
          .where(and(eq(c.contractorType, type), inArray(c.contractorId, list)))
          .groupBy(c.contractorId);

        const map = new Map<string, { contracts: number; amendments: number }>();
        for (const id of ids) map.set(id, { contracts: 0, amendments: 0 });
        for (const row of contractRows) {
          const e = map.get(row.id);
          if (e) e.contracts = Number(row.n);
        }
        for (const row of amendmentRows) {
          const e = map.get(row.id);
          if (e) e.amendments = Number(row.n);
        }
        return ok(map);
      } catch (cause) {
        logRead('countByContractor', cause);
        return err('contract-count-read-unavailable');
      }
    },

    contractorIdsWithContractStatus: async (type: ContractorType, status: ContractStatus) =>
      distinctIds('withStatus', and(eq(c.contractorType, type), eq(c.status, status))),

    contractorIdsWithAnyContract: async (type: ContractorType) =>
      distinctIds('anyContract', and(eq(c.contractorType, type))),
  };
};
