import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractId, AmendmentId } from '../shared/ids.ts';
import type { TimelineEntry } from './types.ts';

// Port do read-model da Timeline (ADR-0022). Projeção derivada — `append` é
// idempotente por `eventId` (reprocessar o stream não duplica).
export type TimelineRepositoryError = 'timeline-repo-unavailable';

export type TimelineRepository = Readonly<{
  append: (entry: TimelineEntry) => Promise<Result<void, TimelineRepositoryError>>;
  listByContract: (
    contractId: ContractId,
  ) => Promise<Result<readonly TimelineEntry[], TimelineRepositoryError>>;
  // Resolve o contrato de um aditivo (vínculo aprendido do AmendmentCreated) —
  // usado pelo projetor para atribuir eventos que não carregam contractId.
  findContractIdByAmendment: (
    amendmentId: AmendmentId,
  ) => Promise<Result<ContractId | null, TimelineRepositoryError>>;
}>;
