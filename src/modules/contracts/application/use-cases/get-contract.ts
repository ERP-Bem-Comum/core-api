import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

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
