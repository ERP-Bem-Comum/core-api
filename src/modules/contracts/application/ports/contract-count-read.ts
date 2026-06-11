// 010-partner-contract-counts — read port REVERSO: contagem de contratos/aditivos por contratado.
// Exposto via contracts/public-api e consumido por partners (borda HTTP dos grids). NÃO é o
// `contractor-view` (esse vive em partners/public-api e é consumido por contracts) — aqui é o inverso.
//
// `countByContractor` é em LOTE (uma chamada por página, sem N+1). Conta TODOS os estados (clarify).
// O filtro de situação contratual do Fornecedor usa os métodos de pertinência por status.

import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractorType } from '../../domain/shared/contractor.ts';
import type { ContractStatus } from '../../domain/contract/types.ts';

export type { ContractorType } from '../../domain/shared/contractor.ts';

export type ContractorCount = Readonly<{ contracts: number; amendments: number }>;

export type ContractCountReadError = 'contract-count-read-unavailable';

export type ContractCountReadPort = Readonly<{
  // ids ausentes do resultado ⇒ { contracts: 0, amendments: 0 } (preenchido pelo adapter).
  countByContractor: (
    type: ContractorType,
    ids: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, ContractorCount>, ContractCountReadError>>;
  // R2: contratados (do tipo) que têm ao menos um contrato no estado dado.
  contractorIdsWithContractStatus: (
    type: ContractorType,
    status: ContractStatus,
  ) => Promise<Result<ReadonlySet<string>, ContractCountReadError>>;
  // R2: contratados (do tipo) com qualquer contrato — "sem contrato" é o complemento.
  contractorIdsWithAnyContract: (
    type: ContractorType,
  ) => Promise<Result<ReadonlySet<string>, ContractCountReadError>>;
}>;
