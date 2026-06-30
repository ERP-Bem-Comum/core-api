/**
 * Port `ActRepository` — contrato de persistência do agregado `Act`
 * (Acordo de Cooperação Técnica). Unicidade: `actNumber` (nº do instrumento, D1).
 * Sem outbox nesta fase.
 *
 * Adapters esperados:
 *   - `makeInMemoryActStore` — teste/CLI.
 *   - `createDrizzleActStore` — MySQL `par_acts`.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { ActId } from './act-id.ts';
import type { ActNumber } from './act-number.ts';
import type { Act } from './types.ts';

export type ActRepositoryError = 'act-repo-unavailable' | 'act-number-duplicate';

export type ActRepository = Readonly<{
  findById: (id: ActId) => Promise<Result<Act | null, ActRepositoryError>>;
  findByActNumber: (actNumber: ActNumber) => Promise<Result<Act | null, ActRepositoryError>>;
  list: () => Promise<Result<readonly Act[], ActRepositoryError>>;
  save: (act: Act) => Promise<Result<void, ActRepositoryError>>;
}>;
