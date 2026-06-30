/**
 * Port `CollaboratorRepository` — contrato de persistência do agregado `Collaborator`.
 *
 * Posicionado em `domain/collaborator/`: as unicidades de CPF **e** email são invariantes
 * do agregado (legado `collaborators.cpf`/`collaborators.email` UNIQUE) e entram na
 * superfície do port como `collaborator-cpf-duplicate` / `collaborator-email-duplicate`.
 * Espelha `SupplierRepository`, acrescido da 2ª unicidade.
 *
 * Sem outbox nesta fase — Collaborator não publica eventos cross-módulo ainda (YAGNI).
 *
 * Adapters esperados:
 *   - `InMemoryCollaboratorStore` (este ticket) — teste/CLI.
 *   - `DrizzleCollaboratorRepository` (futuro) — MySQL `par_collaborators`, UNIQUE em `cpf`/`email`.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { CollaboratorId } from './collaborator-id.ts';
import type { Collaborator } from './types.ts';

export type CollaboratorRepositoryError =
  | 'collaborator-repo-unavailable' // transient (timeout/conexão) no adapter real
  | 'collaborator-cpf-duplicate' // CPF já usado por outro Collaborator
  | 'collaborator-email-duplicate'; // email já usado por outro Collaborator

export type CollaboratorRepository = Readonly<{
  findById: (
    id: CollaboratorId,
  ) => Promise<Result<Collaborator | null, CollaboratorRepositoryError>>;
  findByCpf: (cpf: Cpf) => Promise<Result<Collaborator | null, CollaboratorRepositoryError>>;
  findByEmail: (email: string) => Promise<Result<Collaborator | null, CollaboratorRepositoryError>>;
  list: () => Promise<Result<readonly Collaborator[], CollaboratorRepositoryError>>;
  save: (collaborator: Collaborator) => Promise<Result<void, CollaboratorRepositoryError>>;
}>;
