// Read store Drizzle da categorização do contrato (#178). SELECT lean por id — só as 4 colunas de
// categorização; NUNCA o agregado/row cru (devolve a View — ADR-0006/ADR-0014). ADR-0020: SELECT.
// Read-only (zero escrita); zero throw cruzando a borda (converte para err).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ContractCategorizationReadError,
  ContractCategorizationReadPort,
  ContractCategorizationView,
} from '../../../application/ports/contract-categorization-read.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[contract-categorization-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleContractCategorizationReadStore = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractCategorizationReadPort => ({
  getCategorization: async (
    contractId: string,
  ): Promise<Result<ContractCategorizationView | null, ContractCategorizationReadError>> => {
    try {
      const rows = await handle.db
        .select({
          programId: handle.schema.contracts.programId,
          budgetPlanId: handle.schema.contracts.budgetPlanId,
          categorizacao: handle.schema.contracts.categorizacao,
          centroDeCusto: handle.schema.contracts.centroDeCusto,
        })
        .from(handle.schema.contracts)
        .where(eq(handle.schema.contracts.id, contractId))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      return ok({
        contractId,
        programId: row.programId,
        budgetPlanId: row.budgetPlanId,
        categorizacao: row.categorizacao,
        centroDeCusto: row.centroDeCusto,
      });
    } catch (cause) {
      logRead('getCategorization', cause);
      return err('contract-categorization-read-unavailable');
    }
  },
});
