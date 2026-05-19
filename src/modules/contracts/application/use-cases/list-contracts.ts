import type { Result } from '../../../../shared/result.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type { ContractRepository, ContractRepositoryError } from '../ports/contract-repository.ts';

type Deps = Readonly<{ contractRepo: ContractRepository }>;

export const listContracts =
  (deps: Deps) => async (): Promise<Result<readonly Contract[], ContractRepositoryError>> =>
    deps.contractRepo.list();
