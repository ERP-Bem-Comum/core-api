import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as RemittanceId from './remittance-id.ts'`.

export type RemittanceId = Brand<string, 'RemittanceId'>;
export type RemittanceIdError = 'remittance-id-invalid';

export const generate = (): RemittanceId => newUuid() as RemittanceId;

export const rehydrate = (raw: string): Result<RemittanceId, RemittanceIdError> =>
  isUuidV4(raw) ? ok(raw as RemittanceId) : err('remittance-id-invalid');
