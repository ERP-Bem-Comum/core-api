/**
 * Use case `importCollaborators` — importação em massa insert-only, **não-transacional**
 * (import parcial: linhas válidas entram, inválidas viram `failed`). Reusa `registerCollaborator`
 * linha a linha (DRY) — cada linha valida domínio + unicidade CPF/email (banco e intra-arquivo) + save.
 *
 * Loop **sequencial** (await por linha) é intencional: a unicidade intra-arquivo exige que a linha N
 * seja salva antes de a linha N+1 ser verificada ("primeira ocorrência ganha"). Paralelizar tornaria
 * a detecção de duplicado intra-arquivo não-determinística.
 *
 * Sempre `ok(report)` — não há erro global; falhas individuais vão em `failed` (`Result<_, never>`).
 */

import { type Result, ok } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';
import {
  registerCollaborator,
  type RegisterCollaboratorCommand,
  type RegisterCollaboratorError,
} from './register-collaborator.ts';

export type ImportCollaboratorsCommand = Readonly<{
  rows: readonly RegisterCollaboratorCommand[];
}>;

export type ImportCollaboratorFailure = Readonly<{
  index: number;
  error: RegisterCollaboratorError;
}>;

export type ImportCollaboratorsOutput = Readonly<{
  importedCount: number;
  failed: readonly ImportCollaboratorFailure[];
  isPartialImport: boolean;
}>;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository; clock: Clock }>;

export const importCollaborators =
  (deps: Deps) =>
  async (cmd: ImportCollaboratorsCommand): Promise<Result<ImportCollaboratorsOutput, never>> => {
    const register = registerCollaborator(deps);
    const failed: ImportCollaboratorFailure[] = [];
    let importedCount = 0;

    for (const [index, row] of cmd.rows.entries()) {
      // sequencial intencional — ver cabeçalho (unicidade intra-arquivo determinística)
      const result = await register(row);
      if (result.ok) importedCount += 1;
      else failed.push({ index, error: result.error });
    }

    return ok({
      importedCount,
      failed,
      isPartialImport: importedCount > 0 && failed.length > 0,
    });
  };
