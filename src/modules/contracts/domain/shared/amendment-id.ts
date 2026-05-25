import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as AmendmentId from './amendment-id.ts'`.

export type AmendmentId = Brand<string, 'AmendmentId'>;
export type AmendmentIdError = 'amendment-id-invalid';

export const generate = (): AmendmentId => newUuid() as AmendmentId;

export const rehydrate = (raw: string): Result<AmendmentId, AmendmentIdError> =>
  isUuidV4(raw) ? ok(raw as AmendmentId) : err('amendment-id-invalid');
