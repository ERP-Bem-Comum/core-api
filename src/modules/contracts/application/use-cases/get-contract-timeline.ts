import type { Result } from '../../../../shared/primitives/result.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import type { TimelineEntry } from '../../domain/timeline/types.ts';
import type {
  TimelineRepository,
  TimelineRepositoryError,
} from '../../domain/timeline/repository.ts';

// UC-08 (05-timeline-context.md): ler a trilha cronológica de um contrato.
// Query pura sobre o read-model projetado (ADR-0022).

export type GetContractTimelineCommand = Readonly<{ contractId: string }>;

export type GetContractTimelineError = ContractIdError | TimelineRepositoryError;

type Deps = Readonly<{ timelineRepo: TimelineRepository }>;

export const getContractTimeline =
  (deps: Deps) =>
  async (
    cmd: GetContractTimelineCommand,
  ): Promise<Result<readonly TimelineEntry[], GetContractTimelineError>> => {
    const idResult = ContractId.rehydrate(cmd.contractId);
    if (!idResult.ok) return idResult;

    return deps.timelineRepo.listByContract(idResult.value);
  };
