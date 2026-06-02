/**
 * Query `findCollaboratorByCpf` — busca single por CPF. Valida o CPF na borda
 * (`Cpf.parse`); `null` é o "não encontrado" canônico (não-erro).
 */

import type { Result } from '#src/shared/index.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import type { CpfError } from '#src/shared/kernel/cpf.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';

export type FindCollaboratorByCpfCommand = Readonly<{ cpf: string }>;

export type FindCollaboratorByCpfError = CpfError | CollaboratorRepositoryError;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository }>;

export const findCollaboratorByCpf =
  (deps: Deps) =>
  async (
    cmd: FindCollaboratorByCpfCommand,
  ): Promise<Result<Collaborator | null, FindCollaboratorByCpfError>> => {
    const cpf = Cpf.parse(cmd.cpf);
    if (!cpf.ok) return cpf;
    return deps.collaboratorRepo.findByCpf(cpf.value);
  };
