import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { CostCenter } from '../../../domain/cost-center/cost-center.ts';
import type {
  CostCenterReadError,
  CostCenterReadPort,
} from '../../../application/ports/cost-center-read.ts';

// Read store in-memory (testes/seed): omite inativos, ordena por code. Read-only.
const byCode = (a: CostCenter, b: CostCenter): number => a.code.localeCompare(b.code);

export const createInMemoryCostCenterReadStore = (
  costCenters: readonly CostCenter[] = [],
): CostCenterReadPort => ({
  list: async (): Promise<Result<readonly CostCenter[], CostCenterReadError>> =>
    ok(costCenters.filter((c) => c.active).sort(byCode)),
});
