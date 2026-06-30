import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as ReconciliationPeriodId from './reconciliation-period-id.ts'`.

export type ReconciliationPeriodId = Brand<string, 'ReconciliationPeriodId'>;
export type ReconciliationPeriodIdError = 'reconciliation-period-id-invalid';

export const generate = (): ReconciliationPeriodId => newUuid() as ReconciliationPeriodId;

export const rehydrate = (
  raw: string,
): Result<ReconciliationPeriodId, ReconciliationPeriodIdError> =>
  isUuidV4(raw) ? ok(raw as ReconciliationPeriodId) : err('reconciliation-period-id-invalid');
