import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrao D (module-as-namespace): consumir com `import * as ProgramId from './program-id.ts'`.

export type ProgramId = Brand<string, 'ProgramId'>;
export type ProgramIdError = 'program-id-invalid';

export const generate = (): ProgramId => newUuid() as ProgramId;

export const rehydrate = (raw: string): Result<ProgramId, ProgramIdError> =>
  isUuidV4(raw) ? ok(raw as ProgramId) : err('program-id-invalid');
