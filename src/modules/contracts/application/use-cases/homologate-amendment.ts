import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import {
  type AmendmentIdError,
  type ContractIdError,
  type UserRefError,
  AmendmentId,
  ContractId,
  UserRef,
} from '../../domain/shared/ids.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type {
  Contract as ContractEntity,
  ContractAdjustment,
} from '../../domain/contract/types.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import { Amendment } from '../../domain/amendment/amendment.ts';
import type { Amendment as AmendmentEntity } from '../../domain/amendment/types.ts';
import type { AmendmentError } from '../../domain/amendment/errors.ts';
import type { ContractRepository, ContractRepositoryError } from '../ports/contract-repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../ports/amendment-repository.ts';
import type { ContractsModuleEvent, EventBus, EventBusError } from '../ports/event-bus.ts';

export type HomologateAmendmentCommand = Readonly<{
  amendmentId: string;
  contractId: string;
  homologatedBy: string;
}>;

export type HomologateAmendmentError =
  | AmendmentIdError
  | ContractIdError
  | UserRefError
  | AmendmentRepositoryError
  | ContractRepositoryError
  | EventBusError
  | AmendmentError
  | ContractError
  | 'amendment-not-found'
  | 'contract-not-found'
  | 'amendment-contract-mismatch';

export type HomologateAmendmentOutput = Readonly<{
  contract: ContractEntity;
  amendment: AmendmentEntity;
  events: readonly ContractsModuleEvent[];
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  eventBus: EventBus;
  clock: Clock;
}>;

export const toContractAdjustment = (amendment: AmendmentEntity): ContractAdjustment => {
  const amendmentId: AmendmentId = amendment.id;
  switch (amendment.kind) {
    case 'Addition':
      return { kind: 'ValueIncrease', amount: amendment.impactValue, amendmentId };
    case 'Suppression':
      return { kind: 'ValueDecrease', amount: amendment.impactValue, amendmentId };
    case 'TermChange':
      return { kind: 'PeriodExtension', newEnd: amendment.newEndDate, amendmentId };
    case 'Misc':
      return { kind: 'Acknowledgment', amendmentId };
    default: {
      const _exhaustive: never = amendment;
      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
    }
  }
};

export const homologateAmendment =
  (deps: Deps) =>
  async (
    cmd: HomologateAmendmentCommand,
  ): Promise<Result<HomologateAmendmentOutput, HomologateAmendmentError>> => {
    // 1. Validate inputs (rehydrate branded types)
    const amendmentIdResult = AmendmentId.rehydrate(cmd.amendmentId);
    if (!amendmentIdResult.ok) return amendmentIdResult;

    const contractIdResult = ContractId.rehydrate(cmd.contractId);
    if (!contractIdResult.ok) return contractIdResult;

    const userRefResult = UserRef.rehydrate(cmd.homologatedBy);
    if (!userRefResult.ok) return userRefResult;

    // 2. Load amendment
    const amendmentLoad = await deps.amendmentRepo.findById(amendmentIdResult.value);
    if (!amendmentLoad.ok) return amendmentLoad;
    if (amendmentLoad.value === null) return err('amendment-not-found');
    const amendment = amendmentLoad.value;

    // 3. Load contract
    const contractLoad = await deps.contractRepo.findById(contractIdResult.value);
    if (!contractLoad.ok) return contractLoad;
    if (contractLoad.value === null) return err('contract-not-found');
    const contract = contractLoad.value;

    // 4. Validate amendment belongs to contract
    if (amendment.contractId !== contract.id) {
      return err('amendment-contract-mismatch');
    }

    // 5. Homologate amendment (domain rule check happens here)
    const at = deps.clock.now();
    const homologated = Amendment.homologate(amendment, userRefResult.value, at);
    if (!homologated.ok) return homologated;

    // 6. Translate to ContractAdjustment and apply to contract
    const adjustment = toContractAdjustment(homologated.value.amendment);
    const contractUpdated = Contract.applyHomologatedAdjustment(contract, adjustment, at);
    if (!contractUpdated.ok) return contractUpdated;

    // 7. Persist amendment first, then contract
    const saveAmendment = await deps.amendmentRepo.save(homologated.value.amendment);
    if (!saveAmendment.ok) return saveAmendment;

    const saveContract = await deps.contractRepo.save(contractUpdated.value.contract);
    if (!saveContract.ok) return saveContract;

    // 8. Publish events in order: AmendmentHomologated, then ContractStateUpdated
    const events: readonly ContractsModuleEvent[] = [
      homologated.value.event,
      contractUpdated.value.event,
    ];
    for (const event of events) {
      const published = await deps.eventBus.publish(event);
      if (!published.ok) return published;
    }

    return ok({
      contract: contractUpdated.value.contract,
      amendment: homologated.value.amendment,
      events,
    });
  };
