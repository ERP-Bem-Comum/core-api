/**
 * Query `listActs` — lista todos os Acts (sem filtro avançado nesta fase, ADR-0036).
 */

import type { Result } from '#src/shared/index.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import type {
  ActRepository,
  ActRepositoryError,
} from '#src/modules/partners/domain/act/repository.ts';

type Deps = Readonly<{ actRepo: ActRepository }>;

export const listActs =
  (deps: Deps) => async (): Promise<Result<readonly Act[], ActRepositoryError>> => {
    return deps.actRepo.list();
  };
