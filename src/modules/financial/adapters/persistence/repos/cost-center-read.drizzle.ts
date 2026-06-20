import { asc, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as CostCenter from '#src/modules/financial/domain/cost-center/cost-center.ts';
import * as CostCenterId from '#src/modules/financial/domain/cost-center/cost-center-id.ts';
import type {
  CostCenterReadError,
  CostCenterReadPort,
} from '#src/modules/financial/application/ports/cost-center-read.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finCostCenters } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-cost-center-read] ${op} failed: ${String(cause)}\n`);
};

// SELECT lean `active=true` ordenado por code. Mapper row→domínio via smart constructor
// (adapters.md — domínio rejeita estado inválido vindo do banco).
export const createDrizzleCostCenterReadStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CostCenterReadPort => {
  const { db } = handle;

  return {
    list: async (): Promise<Result<readonly CostCenter.CostCenter[], CostCenterReadError>> => {
      try {
        const rows = await db
          .select({
            id: finCostCenters.id,
            code: finCostCenters.code,
            name: finCostCenters.name,
            active: finCostCenters.active,
          })
          .from(finCostCenters)
          .where(eq(finCostCenters.active, true))
          .orderBy(asc(finCostCenters.code));

        const out: CostCenter.CostCenter[] = [];
        for (const row of rows) {
          const idR = CostCenterId.rehydrate(row.id);
          if (!idR.ok) return err('cost-center-read-unavailable');
          const ccR = CostCenter.create({
            id: idR.value,
            code: row.code,
            name: row.name,
            active: row.active,
          });
          if (!ccR.ok) return err('cost-center-read-unavailable');
          out.push(ccR.value);
        }
        return ok(out);
      } catch (cause) {
        logStore('list', cause);
        return err('cost-center-read-unavailable');
      }
    },
  };
};
