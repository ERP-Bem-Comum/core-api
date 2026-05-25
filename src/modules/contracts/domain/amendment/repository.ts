import type { Result } from '../../../../shared/primitives/result.ts';
import type { AmendmentId } from '../shared/ids.ts';
import type { Amendment } from './types.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../application/ports/event-bus.ts';

// Port do repositório de Amendment — posicionado em domain/ pelo Critério H2 (§3.H.2 DO H§34):
// este port é ditado pelo ciclo-de-vida do agregado Amendment.

// CA-2 (CTR-OUTBOX-INTEGRATION-IN-REPOS): OutboxAppendError integra o union de erros.
export type AmendmentRepositoryError =
  | 'amendment-repo-unavailable'
  | 'amendment-repo-conflict'
  | OutboxAppendError;

export type AmendmentRepository = Readonly<{
  findById: (id: AmendmentId) => Promise<Result<Amendment | null, AmendmentRepositoryError>>;
  // CA-2: 2º argumento `events` — adapter persiste state + outbox atomicamente (D2).
  save: (
    amendment: Amendment,
    events: readonly ContractsModuleEvent[],
  ) => Promise<Result<void, AmendmentRepositoryError>>;
}>;
