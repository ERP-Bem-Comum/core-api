/**
 * Port `ActRepository` — contrato de persistência do agregado `Act` (ADR-0036).
 *
 * Unicidades: CPF e email (espelhando Collaborator). Sem outbox nesta fase.
 *
 * Adapters esperados:
 *   - `makeInMemoryActStore` — teste/CLI.
 *   - `DrizzleActRepository` — MySQL `par_acts` (futuro).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { ActId } from './act-id.ts';
import type { Act } from './types.ts';

export type ActRepositoryError =
  | 'act-repo-unavailable'
  | 'act-cpf-duplicate'
  | 'act-email-duplicate';

export type ActRepository = Readonly<{
  findById: (id: ActId) => Promise<Result<Act | null, ActRepositoryError>>;
  findByCpf: (cpf: Cpf) => Promise<Result<Act | null, ActRepositoryError>>;
  findByEmail: (email: string) => Promise<Result<Act | null, ActRepositoryError>>;
  list: () => Promise<Result<readonly Act[], ActRepositoryError>>;
  save: (act: Act) => Promise<Result<void, ActRepositoryError>>;
}>;
