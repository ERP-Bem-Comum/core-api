import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as AmendmentId from '../../domain/shared/amendment-id.ts';
import type { AmendmentIdError } from '../../domain/shared/amendment-id.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import type { UserRefError } from '#src/shared/kernel/user-ref.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { ActiveContract, ContractAdjustment } from '../../domain/contract/types.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import { Amendment } from '../../domain/amendment/amendment.ts';
import type { Amendment as AmendmentEntity } from '../../domain/amendment/types.ts';
import type { AmendmentError } from '../../domain/amendment/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';
import type { ContractsModuleEvent } from '../ports/event-bus.ts';

// CA-5+CA-6 (CTR-OUTBOX-INTEGRATION-IN-REPOS):
//   - eventBus removido de Deps.
//   - CA-10: homologateAmendment emite 2 eventos em 2 saves separados:
//       amendmentRepo.save(homologated.amendment, [homologated.event])
//       contractRepo.save(contractUpdated.contract, [contractUpdated.event])
//   Atomicidade LOCAL de cada agregado + seus eventos é garantida.
//   Atomicidade DISTRIBUÍDA entre os 2 saves é limitação MVP — documentada aqui.

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
  | AmendmentError
  | ContractError
  | 'amendment-not-found'
  | 'contract-not-found'
  | 'amendment-contract-mismatch'
  // R4 (04-aditivos-context.md:86): aditivo com data retroativa ao início (signedAt) do Contrato Mãe.
  | 'amendment-retroactive-to-contract-start';

export type HomologateAmendmentOutput = Readonly<{
  contract: ActiveContract;
  amendment: AmendmentEntity;
  events: readonly ContractsModuleEvent[];
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  clock: Clock;
}>;

export const toContractAdjustment = (amendment: AmendmentEntity): ContractAdjustment => {
  const amendmentId: AmendmentId.AmendmentId = amendment.id;
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
      return _exhaustive;
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

    // 4. Refine to ActiveContract na borda (RN-CV-01/R3): só contrato vigente
    //    homologa aditivo. Pendente (sem `signedAt`/efetividade) e terminais recusam.
    //    Feito ANTES das checagens que leem `signedAt`.
    const activeContract = Contract.parseActive(contractLoad.value);
    if (!activeContract.ok) return activeContract;
    const contract = activeContract.value;

    // 4b. Validate amendment belongs to contract
    if (amendment.contractId !== contract.id) {
      return err('amendment-contract-mismatch');
    }

    // 4c. R4 cronologia (04-aditivos-context.md:86): não homologar aditivo com data
    //     retroativa ao início do Contrato Mãe (= signedAt). Igualdade é permitida.
    if (amendment.createdAt.getTime() < contract.signedAt.getTime()) {
      return err('amendment-retroactive-to-contract-start');
    }

    // 5. DO D§21: parsePendingWithDocument na borda.
    const pendingWithDoc = Amendment.parsePendingWithDocument(amendment);
    if (!pendingWithDoc.ok) return pendingWithDoc;

    // 5b. Homologate amendment
    const at = deps.clock.now();
    const homologated = Amendment.homologate(pendingWithDoc.value, userRefResult.value, at);
    if (!homologated.ok) return homologated;

    // 7. Translate to ContractAdjustment and apply to contract
    const adjustment = toContractAdjustment(homologated.value.amendment);
    const contractUpdated = Contract.applyHomologatedAdjustment(
      activeContract.value,
      adjustment,
      at,
    );
    if (!contractUpdated.ok) return contractUpdated;

    // 8. Persist amendment first, with its event atomically (CA-10).
    const saveAmendment = await deps.amendmentRepo.save(homologated.value.amendment, [
      homologated.value.event,
    ]);
    if (!saveAmendment.ok) return saveAmendment;

    // 9. Persist contract with its event atomically (CA-10).
    // NOTE: atomicidade LOCAL por agregado garantida. Atomicidade DISTRIBUÍDA
    // entre os 2 saves é limitação MVP (2 transações sequenciais).
    const saveContract = await deps.contractRepo.save(contractUpdated.value.contract, [
      contractUpdated.value.event,
    ]);
    if (!saveContract.ok) return saveContract;

    const events: readonly ContractsModuleEvent[] = [
      homologated.value.event,
      contractUpdated.value.event,
    ];

    return ok({
      contract: contractUpdated.value.contract,
      amendment: homologated.value.amendment,
      events,
    });
  };
