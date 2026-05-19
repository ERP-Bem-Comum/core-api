import { type Result, ok, err } from '../../../../shared/result.ts';
import { ContractId, type ContractIdError } from '../../domain/shared/ids.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type { ContractRepository, ContractRepositoryError } from '../ports/contract-repository.ts';

export type GetContractCommand = Readonly<{ contractId: string }>;

export type GetContractError = ContractIdError | ContractRepositoryError | 'contract-not-found';

type Deps = Readonly<{ contractRepo: ContractRepository }>;

export const getContract =
  (deps: Deps) =>
  async (cmd: GetContractCommand): Promise<Result<Contract, GetContractError>> => {
    const idResult = ContractId.rehydrate(cmd.contractId);
    if (!idResult.ok) return idResult;

    const load = await deps.contractRepo.findById(idResult.value);
    if (!load.ok) return load;
    if (load.value === null) return err('contract-not-found');

    return ok(load.value);
  };
