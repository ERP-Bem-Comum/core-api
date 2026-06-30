import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as CedenteAccountId from './cedente-account-id.ts'`.

export type CedenteAccountId = Brand<string, 'CedenteAccountId'>;
export type CedenteAccountIdError = 'cedente-account-id-invalid';

export const generate = (): CedenteAccountId => newUuid() as CedenteAccountId;

export const rehydrate = (raw: string): Result<CedenteAccountId, CedenteAccountIdError> =>
  isUuidV4(raw) ? ok(raw as CedenteAccountId) : err('cedente-account-id-invalid');
