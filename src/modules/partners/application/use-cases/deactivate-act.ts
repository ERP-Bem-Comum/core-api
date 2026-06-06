/**
 * Use case `deactivateAct` — Active → Inactive (soft-delete simples, sem disableBy).
 * rehydrate id → findById → Act.deactivate → save.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { Act as ActAggregate } from '#src/modules/partners/domain/act/types.ts';
import type { ActError } from '#src/modules/partners/domain/act/errors.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';

export type DeactivateActCommand = Readonly<{ actId: string }>;

export type DeactivateActError =
  | 'deactivate-act-invalid-id'
  | 'deactivate-act-not-found'
  | ActError
  | ActRepositoryError;

export type DeactivateActOutput = Readonly<{ act: ActAggregate }>;

type Deps = Readonly<{ actRepo: ActRepository; clock: Clock }>;

export const deactivateAct =
  (deps: Deps) =>
  async (cmd: DeactivateActCommand): Promise<Result<DeactivateActOutput, DeactivateActError>> => {
    const id = ActId.rehydrate(cmd.actId);
    if (!id.ok) return err('deactivate-act-invalid-id');

    const fetched = await deps.actRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('deactivate-act-not-found');

    if (fetched.value.status === 'Inactive') return err('act-already-inactive');

    const inactive = Act.deactivate(fetched.value, deps.clock.now());

    const saved = await deps.actRepo.save(inactive);
    if (!saved.ok) return saved;

    return ok({ act: inactive });
  };
