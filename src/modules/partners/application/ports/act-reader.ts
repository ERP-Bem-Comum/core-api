/**
 * Port `ActReader` — leitura enriquecida do Act para a borda HTTP v1.
 *
 * O agregado `Act` não carrega `legacyId`/`createdAt`/`updatedAt` (são da row
 * `par_acts`). A borda v1 inclui esses campos — daí um read-model que compõe
 * o agregado + metadados de persistência (read-only). Espelha `SupplierReader`.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { ActId } from '#src/modules/partners/domain/act/act-id.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';

export type ActReadRecord = Readonly<{
  act: Act;
  legacyId: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ActReaderError = 'act-read-unavailable';

export type ActReader = Readonly<{
  getById: (id: ActId) => Promise<Result<ActReadRecord | null, ActReaderError>>;
  list: () => Promise<Result<readonly ActReadRecord[], ActReaderError>>;
}>;
