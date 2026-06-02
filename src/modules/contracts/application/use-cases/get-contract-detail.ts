/**
 * Use case de LEITURA agregada (CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES, ADR-0032).
 *
 * Compõe a visão rica do detalhe de um contrato: o agregado `Contract` + seus
 * `Amendment[]` + os `ContractDocument[]` vinculados (ao contrato e aos seus
 * aditivos). É composição de LEITURA — sem regra de negócio, sem mutação, sem
 * publicação de evento. O domínio e os use cases de escrita permanecem intocados.
 *
 * Documentos compostos: os de `parentType:'Contract'` (parentId = contractId) +
 * os anexados a cada aditivo (`parentType:'Amendment'`). Ordenação dos aditivos é
 * responsabilidade do repositório (`findByContractId` retorna por `amendmentNumber` asc).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type { Amendment } from '../../domain/amendment/types.ts';
import type { ContractDocument } from '../../domain/document/types.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

export type GetContractDetailCommand = Readonly<{ contractId: string }>;

/** Read-model da visão de detalhe — agregado + filhos compostos. */
export type ContractDetail = Readonly<{
  contract: Contract;
  amendments: readonly Amendment[];
  documents: readonly ContractDocument[];
}>;

export type GetContractDetailError =
  | ContractIdError
  | ContractRepositoryError
  | AmendmentRepositoryError
  | DocumentRepositoryError
  | 'contract-not-found';

type Deps = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  documentRepo: DocumentRepository;
}>;

export const getContractDetail =
  (deps: Deps) =>
  async (
    cmd: GetContractDetailCommand,
  ): Promise<Result<ContractDetail, GetContractDetailError>> => {
    const idResult = ContractId.rehydrate(cmd.contractId);
    if (!idResult.ok) return idResult;
    const contractId = idResult.value;

    const contractLoad = await deps.contractRepo.findById(contractId);
    if (!contractLoad.ok) return contractLoad;
    if (contractLoad.value === null) return err('contract-not-found');
    const contract = contractLoad.value;

    const amendmentsLoad = await deps.amendmentRepo.findByContractId(contractId);
    if (!amendmentsLoad.ok) return amendmentsLoad;
    const amendments = amendmentsLoad.value;

    // Documentos do contrato + documentos anexados a cada aditivo.
    const contractDocsLoad = await deps.documentRepo.findByParent('Contract', contractId);
    if (!contractDocsLoad.ok) return contractDocsLoad;
    const documents: ContractDocument[] = [...contractDocsLoad.value];

    for (const amendment of amendments) {
      const amendmentDocsLoad = await deps.documentRepo.findByParent('Amendment', amendment.id);
      if (!amendmentDocsLoad.ok) return amendmentDocsLoad;
      documents.push(...amendmentDocsLoad.value);
    }

    return ok({ contract, amendments, documents });
  };
