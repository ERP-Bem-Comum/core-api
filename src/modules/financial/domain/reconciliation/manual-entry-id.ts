import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as ManualEntryId from './manual-entry-id.ts'`.

export type ManualEntryId = Brand<string, 'ManualEntryId'>;
export type ManualEntryIdError = 'manual-entry-id-invalid';

export const generate = (): ManualEntryId => newUuid() as ManualEntryId;

export const rehydrate = (raw: string): Result<ManualEntryId, ManualEntryIdError> =>
  isUuidV4(raw) ? ok(raw as ManualEntryId) : err('manual-entry-id-invalid');
