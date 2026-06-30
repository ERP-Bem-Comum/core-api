import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { ActiveContract } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

// CTR-USECASE-ACTIVATE-CONTRACT (ADR-0023, RN-CV-02): ativa um contrato `Pending`
// somente quando há documento `signed_contract` `Active` vinculado. O evento
// `ContractActivated` é persistido junto do estado via `contractRepo.save`.

export type ActivateContractCommand = Readonly<{
  contractId: string;
  signedAt: string;
}>;

export type ActivateContractError =
  | ContractIdError
  | 'activate-contract-invalid-signed-at'
  | 'contract-not-found'
  | 'contract-not-pending'
  | 'activate-contract-no-signed-document'
  | ContractError
  | ContractRepositoryError
  | DocumentRepositoryError;

export type ActivateContractOutput = Readonly<{
  contract: ActiveContract;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  documentRepo: DocumentRepository;
}>;

export const activateContract =
  (deps: Deps) =>
  async (
    cmd: ActivateContractCommand,
  ): Promise<Result<ActivateContractOutput, ActivateContractError>> => {
    const contractIdR = ContractId.rehydrate(cmd.contractId);
    if (!contractIdR.ok) return contractIdR;

    const signedAt = new Date(cmd.signedAt);
    if (!isValidDate(signedAt)) return err('activate-contract-invalid-signed-at');

    const loaded = await deps.contractRepo.findById(contractIdR.value);
    if (!loaded.ok) return loaded;
    if (loaded.value === null) return err('contract-not-found');

    // Narrowing inline na union discriminada — só `Pending` ativa (RN-CV-01/CV-02).
    const contract = loaded.value;
    if (contract.status !== 'Pending') return err('contract-not-pending');

    // RN-CV-02: exige documento assinado do contrato (`signed_contract` Active).
    const docs = await deps.documentRepo.findByParent('Contract', contractIdR.value);
    if (!docs.ok) return docs;
    const hasSignedContract = docs.value.some(
      (d) => d.categoria === 'signed_contract' && d.status === 'Active',
    );
    if (!hasSignedContract) return err('activate-contract-no-signed-document');

    const activated = Contract.activate(contract, signedAt);
    if (!activated.ok) return activated;

    const saved = await deps.contractRepo.save(activated.value.contract, [activated.value.event]);
    if (!saved.ok) return saved;

    return ok(activated.value);
  };
