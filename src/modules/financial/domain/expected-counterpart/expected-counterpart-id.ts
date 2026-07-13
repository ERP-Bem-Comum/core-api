import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as ExpectedCounterpartId from './expected-counterpart-id.ts'`.

export type ExpectedCounterpartId = Brand<string, 'ExpectedCounterpartId'>;
export type ExpectedCounterpartIdError = 'expected-counterpart-id-invalid';

export const generate = (): ExpectedCounterpartId => newUuid() as ExpectedCounterpartId;

export const rehydrate = (
  raw: string,
): Result<ExpectedCounterpartId, ExpectedCounterpartIdError> =>
  isUuidV4(raw) ? ok(raw as ExpectedCounterpartId) : err('expected-counterpart-id-invalid');
