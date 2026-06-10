/**
 * Use case `reactivateAct` — Inactive → Active.
 * rehydrate id → findById → Act.reactivate → save.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { ActiveAct } from '#src/modules/partners/domain/act/types.ts';
import type { ActError } from '#src/modules/partners/domain/act/errors.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';

export type ReactivateActCommand = Readonly<{ actId: string }>;

export type ReactivateActError =
  | 'reactivate-act-invalid-id'
  | 'reactivate-act-not-found'
  | ActError
  | ActRepositoryError;

export type ReactivateActOutput = Readonly<{ act: ActiveAct }>;

type Deps = Readonly<{ actRepo: ActRepository; clock: Clock }>;

export const reactivateAct =
  (deps: Deps) =>
  async (cmd: ReactivateActCommand): Promise<Result<ReactivateActOutput, ReactivateActError>> => {
    const id = ActId.rehydrate(cmd.actId);
    if (!id.ok) return err('reactivate-act-invalid-id');

    const fetched = await deps.actRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('reactivate-act-not-found');

    const reactivated = Act.reactivate(fetched.value, deps.clock.now());
    if (!reactivated.ok) return reactivated;

    const saved = await deps.actRepo.save(reactivated.value.act);
    if (!saved.ok) return saved;

    return ok({ act: reactivated.value.act });
  };
