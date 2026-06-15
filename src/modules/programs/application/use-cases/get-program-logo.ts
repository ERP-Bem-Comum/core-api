/**
 * getProgramLogo - use case do modulo programs (PRG-LOGO-CONTENT).
 *
 * Devolve os bytes + contentType do logo do programa para a borda HTTP servir
 * (GET /programs/:id/logo) - contraparte de leitura do uploadProgramLogo.
 * Sequencia: validar id -> fetch program (404) -> sem logoKey? program-logo-not-found ->
 * storage.download (objeto sumido -> logo-object-missing, mapeia 404 na borda). Read puro,
 * sem evento. Espelha getProfilePhoto. ASCII puro.
 */

import { type Result, err } from '#src/shared/primitives/result.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import type {
  ProgramRepository,
  ProgramRepositoryError,
} from '#src/modules/programs/domain/program/repository.ts';
import type {
  DownloadedLogo,
  LogoDownloadError,
  LogoStorage,
} from '#src/modules/programs/application/ports/logo-storage.ts';

type Deps = Readonly<{
  programRepo: ProgramRepository;
  storage: LogoStorage;
}>;

export type GetProgramLogoCommand = Readonly<{ targetId: string }>;

export type GetProgramLogoOutput = DownloadedLogo;

export type GetProgramLogoError =
  | 'program-id-invalid'
  | 'program-not-found'
  | 'program-logo-not-found'
  | LogoDownloadError
  | ProgramRepositoryError;

export const getProgramLogo =
  (deps: Deps) =>
  async (
    cmd: GetProgramLogoCommand,
  ): Promise<Result<GetProgramLogoOutput, GetProgramLogoError>> => {
    const idR = ProgramId.rehydrate(cmd.targetId);
    if (!idR.ok) return err('program-id-invalid');

    const found = await deps.programRepo.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('program-not-found');

    if (found.value.logoKey === null) return err('program-logo-not-found');

    return deps.storage.download(found.value.logoKey);
  };
