import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as CostCenterId from './cost-center-id.ts'`.

export type CostCenterId = Brand<string, 'CostCenterId'>;
export type CostCenterIdError = 'cost-center-id-invalid';

export const generate = (): CostCenterId => newUuid() as CostCenterId;

export const rehydrate = (raw: string): Result<CostCenterId, CostCenterIdError> =>
  isUuidV4(raw) ? ok(raw as CostCenterId) : err('cost-center-id-invalid');
