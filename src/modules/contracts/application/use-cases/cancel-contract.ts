import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { CancelledContract } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// CTR-HTTP-CANCEL-PENDING (ADR-0039): cancela (soft-delete) um contrato `Pending`.
// Orquestra: rehydrate id → fetch → parsePending → cancel → save (state + evento outbox).
// Só rascunhos são canceláveis (RN-CV-03); efetivados → ContractNotPending (409 na borda).

export type CancelContractCommand = Readonly<{ contractId: string }>;

export type CancelContractError =
  | ContractIdError
  | 'contract-not-found'
  | ContractError
  | ContractRepositoryError;

export type CancelContractOutput = Readonly<{
  contract: CancelledContract;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

export const cancelContract =
  (deps: Deps) =>
  async (
    cmd: CancelContractCommand,
  ): Promise<Result<CancelContractOutput, CancelContractError>> => {
    const idResult = ContractId.rehydrate(cmd.contractId);
    if (!idResult.ok) return idResult;

    const load = await deps.contractRepo.findById(idResult.value);
    if (!load.ok) return load;
    if (load.value === null) return err('contract-not-found');

    const pending = Contract.parsePending(load.value);
    if (!pending.ok) return pending;

    const cancelled = Contract.cancel(pending.value, deps.clock.now());
    if (!cancelled.ok) return cancelled;

    // Evento no 2º argumento de save — persiste state + outbox atomicamente (ADR-0015).
    const saveResult = await deps.contractRepo.save(cancelled.value.contract, [
      cancelled.value.event,
    ]);
    if (!saveResult.ok) return saveResult;

    return ok({ contract: cancelled.value.contract, event: cancelled.value.event });
  };
