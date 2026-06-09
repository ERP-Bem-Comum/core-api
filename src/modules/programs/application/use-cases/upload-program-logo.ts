import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import { Program } from '#src/modules/programs/domain/program/program.ts';
import type { Program as ProgramAggregate } from '#src/modules/programs/domain/program/types.ts';
import type { ProgramEvent } from '#src/modules/programs/domain/program/events.ts';
import type { ProgramError } from '#src/modules/programs/domain/program/errors.ts';
import type {
  ProgramRepository,
  ProgramRepositoryError,
} from '#src/modules/programs/domain/program/repository.ts';
import type {
  LogoStorage,
  LogoStorageError,
} from '#src/modules/programs/application/ports/logo-storage.ts';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MiB (FR-021)

// Key determinística: um logo por programa; troca sobrescreve (idempotente).
const logoKey = (programId: string): string => `programs/${programId}/logo`;

type Deps = Readonly<{ programRepo: ProgramRepository; storage: LogoStorage; clock: Clock }>;

export type UploadProgramLogoCommand = Readonly<{
  programId: string;
  bytes: Uint8Array;
  mimeType: string;
}>;

export type UploadProgramLogoError =
  | 'program-not-found'
  | 'logo-type-unsupported'
  | 'logo-empty'
  | 'logo-too-large'
  | LogoStorageError
  | ProgramError
  | ProgramRepositoryError;

export type UploadProgramLogoOutput = Readonly<{ program: ProgramAggregate; event: ProgramEvent }>;

// validar id → validar mime/tamanho → fetch (404) → storage.upload → setLogo → save.
// O upload precede o save: se o storage falhar, o agregado não referencia objeto inexistente.
export const uploadProgramLogo =
  (deps: Deps) =>
  async (
    // cmd.bytes é Uint8Array (sem variant readonly nativo); o use case não muta os bytes.
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    cmd: UploadProgramLogoCommand,
  ): Promise<Result<UploadProgramLogoOutput, UploadProgramLogoError>> => {
    const id = ProgramId.rehydrate(cmd.programId);
    if (!id.ok) return err('program-not-found');

    if (!ALLOWED_MIME.includes(cmd.mimeType as (typeof ALLOWED_MIME)[number])) {
      return err('logo-type-unsupported');
    }
    if (cmd.bytes.length === 0) return err('logo-empty');
    if (cmd.bytes.length > MAX_LOGO_BYTES) return err('logo-too-large');

    const fetched = await deps.programRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('program-not-found');

    const key = logoKey(cmd.programId);
    const uploaded = await deps.storage.upload({ key, bytes: cmd.bytes, mimeType: cmd.mimeType });
    if (!uploaded.ok) return uploaded;

    const updated = Program.setLogo(fetched.value, key, deps.clock.now());
    if (!updated.ok) return updated;

    const saved = await deps.programRepo.save(updated.value.program, [updated.value.event]);
    if (!saved.ok) return saved;

    return ok(updated.value);
  };
