/**
 * Use case `checkFirstThreeNumbersCpf` — passo 1 do fluxo público de auto-cadastro.
 * Verifica os 3 primeiros dígitos do CPF e devolve o `Collaborator` para o formulário.
 * rehydrate id → `findById` (not-found) → `verifyCpfPrefix` → retorna o agregado. Query (não muta).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import { verifyCpfPrefix, type CpfPrefixError } from './verify-cpf-prefix.ts';

export type CheckFirstThreeNumbersCpfCommand = Readonly<{
  collaboratorId: string;
  cpfPrefix: string;
}>;

export type CheckFirstThreeNumbersCpfError =
  | 'check-cpf-invalid-id'
  | 'check-cpf-not-found'
  | CpfPrefixError
  | CollaboratorRepositoryError;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository }>;

export const checkFirstThreeNumbersCpf =
  (deps: Deps) =>
  async (
    cmd: CheckFirstThreeNumbersCpfCommand,
  ): Promise<Result<Collaborator, CheckFirstThreeNumbersCpfError>> => {
    const id = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!id.ok) return err('check-cpf-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('check-cpf-not-found');

    const verified = verifyCpfPrefix(fetched.value.cpf, cmd.cpfPrefix);
    if (!verified.ok) return verified;

    return ok(fetched.value);
  };
