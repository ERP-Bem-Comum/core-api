// Read store Drizzle da contagem de contratos vivos por contraparte (#110 —
// PAR-CONTRACT-COUNT-BACKFILL). `GROUP BY contractorId` sobre `ctr_contracts`, filtrado aos status
// vivos ('Pending','Active') — mesma semântica do worker incremental `applyContractCountEvent`
// (ContractCreated → +1, ContractEnded/ContractCancelled → −1). Aproveita o índice composto
// `ctr_contracts_contractor_idx` (contractorId, status). Read-only; zero throw cruzando a borda.

import { count, inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ContractCountByContractor,
  ContractCountReadError,
  ContractCountReadPort,
} from '../../../application/ports/contract-count-read.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';

const LIVE_STATUSES = ['Pending', 'Active'] as const;

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[contract-count-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleContractCountReadStore = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractCountReadPort => ({
  listActiveContractCountsByContractor: async (): Promise<
    Result<readonly ContractCountByContractor[], ContractCountReadError>
  > => {
    try {
      const rows = await handle.db
        .select({
          contractorId: handle.schema.contracts.contractorId,
          // count() do drizzle-orm mapeia COUNT(*) direto para number (select.mdx §"count").
          activeCount: count(),
        })
        .from(handle.schema.contracts)
        .where(inArray(handle.schema.contracts.status, LIVE_STATUSES))
        .groupBy(handle.schema.contracts.contractorId);
      return ok(
        rows.map((row) => ({
          contractorRef: row.contractorId,
          activeCount: row.activeCount,
        })),
      );
    } catch (cause) {
      logRead('listActiveContractCountsByContractor', cause);
      return err('contract-count-read-unavailable');
    }
  },
});
