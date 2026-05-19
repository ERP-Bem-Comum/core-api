import type { Result } from '../../../../shared/result.ts';
import type { AmendmentId } from '../../domain/shared/ids.ts';
import type { Amendment } from '../../domain/amendment/types.ts';

export type AmendmentRepositoryError = 'amendment-repo-unavailable' | 'amendment-repo-conflict';

export type AmendmentRepository = Readonly<{
  findById: (id: AmendmentId) => Promise<Result<Amendment | null, AmendmentRepositoryError>>;
  save: (amendment: Amendment) => Promise<Result<void, AmendmentRepositoryError>>;
}>;
