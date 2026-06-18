import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as ReconciliationId from './reconciliation-id.ts'`.

export type ReconciliationId = Brand<string, 'ReconciliationId'>;
export type ReconciliationIdError = 'reconciliation-id-invalid';

export const generate = (): ReconciliationId => newUuid() as ReconciliationId;

export const rehydrate = (raw: string): Result<ReconciliationId, ReconciliationIdError> =>
  isUuidV4(raw) ? ok(raw as ReconciliationId) : err('reconciliation-id-invalid');
