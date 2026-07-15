// Read store Drizzle dos contratantes com contrato ATIVO (#437). `SELECT DISTINCT contractor_id`
// sobre `ctr_contracts` WHERE `status = 'Active'` AND `contractor_type = 'supplier'` — aproveita o
// índice composto já existente `ctr_contracts_contractor_idx` (contractorId, status).
// Read-only; zero throw cruzando a borda.

import { and, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ActiveContractorReadError,
  ActiveContractorReadPort,
} from '../../../application/ports/active-contractor-read.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';

const ACTIVE_STATUS = 'Active';
const SUPPLIER_CONTRACTOR_TYPE = 'supplier';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[active-contractor-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleActiveContractorReadStore = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ActiveContractorReadPort => ({
  listContractorsWithActiveContract: async (): Promise<
    Result<readonly string[], ActiveContractorReadError>
  > => {
    try {
      // `.selectDistinct({ ... })` → `select distinct "contractor_id"` (select.mdx §"Distinct
      // select"): um contratante com N contratos Active rende 1 linha.
      const rows = await handle.db
        .selectDistinct({ contractorId: handle.schema.contracts.contractorId })
        .from(handle.schema.contracts)
        .where(
          and(
            eq(handle.schema.contracts.status, ACTIVE_STATUS),
            eq(handle.schema.contracts.contractorType, SUPPLIER_CONTRACTOR_TYPE),
          ),
        );
      return ok(rows.map((row) => row.contractorId));
    } catch (cause) {
      logRead('listContractorsWithActiveContract', cause);
      return err('active-contractor-read-unavailable');
    }
  },
});
