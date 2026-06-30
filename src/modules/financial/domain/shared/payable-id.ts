import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): consumir com `import * as PayableId from './payable-id.ts'`.

export type PayableId = Brand<string, 'PayableId'>;
export type PayableIdError = 'payable-id-invalid';

export const generate = (): PayableId => newUuid() as PayableId;

export const rehydrate = (raw: string): Result<PayableId, PayableIdError> =>
  isUuidV4(raw) ? ok(raw as PayableId) : err('payable-id-invalid');
