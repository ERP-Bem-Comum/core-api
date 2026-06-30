import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import { updateContract } from '../../domain/contract/types.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// CONTRACTS-PATCH-METADATA-HTTP (US-002): edição de metadados de cadastro
// (title/objective/observations/email/telephone). Valor/período/datas/sequentialNumber
// são imutáveis (mudam por aditivo) — barrados na borda (Zod `.strict()`), nunca chegam aqui.
// Modelo RBAC puro: sem ownership por tenant; contrato inexistente → `contract-not-found`.

export type ContractMetadataPatch = Readonly<{
  title?: string;
  objective?: string;
  observations?: string | null;
  email?: string | null;
  telephone?: string | null;
}>;

export type UpdateContractMetadataCommand = Readonly<{
  contractId: string;
  patch: ContractMetadataPatch;
}>;

export type UpdateContractMetadataError =
  | ContractIdError
  | ContractRepositoryError
  | 'contract-not-found';

export type UpdateContractMetadataOutput = Readonly<{ contract: Contract }>;

type Deps = Readonly<{ contractRepo: ContractRepository }>;

export const updateContractMetadata =
  (deps: Deps) =>
  async (
    cmd: UpdateContractMetadataCommand,
  ): Promise<Result<UpdateContractMetadataOutput, UpdateContractMetadataError>> => {
    const idR = ContractId.rehydrate(cmd.contractId);
    if (!idR.ok) return idR;

    const load = await deps.contractRepo.findById(idR.value);
    if (!load.ok) return load;
    if (load.value === null) return err('contract-not-found');

    const updated = updateContract(load.value, cmd.patch);

    const saved = await deps.contractRepo.save(updated, []);
    if (!saved.ok) return saved;

    return ok({ contract: updated });
  };
