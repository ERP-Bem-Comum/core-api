import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D: `import * as ActId from './act-id.ts'`.

export type ActId = Brand<string, 'ActId'>;
export type ActIdError = 'act-id-invalid';

export const generate = (): ActId => newUuid() as ActId;

export const rehydrate = (raw: string): Result<ActId, ActIdError> =>
  isUuidV4(raw) ? ok(raw as ActId) : err('act-id-invalid');
