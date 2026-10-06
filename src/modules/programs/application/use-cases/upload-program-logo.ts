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

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50] as const;

// bytes é Uint8Array (sem variant readonly nativo no TS 6); a função não muta os bytes.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const startsWith = (bytes: Uint8Array, sig: readonly number[], offset = 0): boolean =>
  sig.every((b, i) => bytes[offset + i] === b);

/**
 * Confere a assinatura real dos bytes contra o mimeType declarado: defesa em profundidade contra
 * content-type spoofing (CWE-434). O mimeType vem do cliente e não prova nada sobre o conteúdo —
 * as rotas-irmãs (foto de usuário, documentos) já checam magic-bytes; o logo precisa do mesmo.
 * MIME fora de jpeg/png/webp devolve `false` (fail-closed) — e isso é inalcançável hoje, porque
 * `ALLOWED_MIME` barra antes, no começo do use case. A ordem importa: ver a nota abaixo.
 */
// ⚠️ O `default` é fail-CLOSED de propósito, e só PODE ser porque aqui a allowlist roda ANTES
// (`ALLOWED_MIME`, na entrada do use case). O perigo não é o código de hoje: é o dia em que
// alguém acrescentar um MIME à allowlist e esquecer a assinatura — com `return true`, aquele
// MIME passaria a aceitar conteúdo falsificado em silêncio (CWE-434, exatamente o defeito que
// esta função veio corrigir). Fail-closed troca isso por um 422 visível no primeiro upload.
//
// A função irmã em `auth/adapters/http/photo-upload.ts` é fail-OPEN, e está certa em ser: lá o
// magic-byte roda na borda e a allowlist só no use case, então fechar o default trocaria o
// código de erro da API. Alinhar as duas exige alinhar a ORDEM primeiro.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const imageMagicBytesMatch = (mimeType: string, bytes: Uint8Array): boolean => {
  switch (mimeType) {
    case 'image/jpeg':
      return startsWith(bytes, JPEG_SIGNATURE);
    case 'image/png':
      return startsWith(bytes, PNG_SIGNATURE);
    case 'image/webp':
      return startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, 8);
    default:
      return false;
  }
};

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
  | 'logo-content-mismatch'
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
    if (!imageMagicBytesMatch(cmd.mimeType, cmd.bytes)) return err('logo-content-mismatch');

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
