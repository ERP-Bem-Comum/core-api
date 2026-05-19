import type { Result } from '../../../../shared/result.ts';
import type { ContractId } from '../../domain/shared/ids.ts';
import type { Contract } from '../../domain/contract/types.ts';

export type ContractRepositoryError = 'contract-repo-unavailable' | 'contract-repo-conflict';

export type ContractRepository = Readonly<{
  findById: (id: ContractId) => Promise<Result<Contract | null, ContractRepositoryError>>;
  // Defeito #5: necessário para garantir unicidade de sequentialNumber (regra R4 do handbook).
  // MySQL real exigirá UNIQUE INDEX na coluna; InMemory faz busca linear.
  findBySequentialNumber: (
    sequentialNumber: string,
  ) => Promise<Result<Contract | null, ContractRepositoryError>>;
  list: () => Promise<Result<readonly Contract[], ContractRepositoryError>>;
  save: (contract: Contract) => Promise<Result<void, ContractRepositoryError>>;
}>;
