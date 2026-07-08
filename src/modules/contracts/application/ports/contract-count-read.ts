import type { Result } from '../../../../shared/primitives/result.ts';

// Port de LEITURA da contagem de contratos VIVOS por contraparte (#110 — PAR-CONTRACT-COUNT-BACKFILL).
// Único caminho pelo qual outro módulo (partners — backfill/reconciliação do read-model
// `par_contract_count_view`) lê essa contagem, via a public-api de contracts (ADR-0006) — sem tocar
// `ctr_*` cru nem o agregado interno.
//
// Semântica travada no recon (mesma do worker incremental `applyContractCountEvent`):
// `ContractCreated → +1` (Pending e Active), `ContractEnded`/`ContractCancelled → −1`. Logo:
//   activeCount(contractorRef) = #{contratos com status IN ('Pending','Active')}
// (equivalente a `endedAt IS NULL`). Divergir dessa regra quebra a paridade backfill × worker.

export type ContractCountByContractor = Readonly<{
  contractorRef: string;
  activeCount: number;
}>;

export type ContractCountReadError = 'contract-count-read-unavailable';

export type ContractCountReadPort = Readonly<{
  listActiveContractCountsByContractor: () => Promise<
    Result<readonly ContractCountByContractor[], ContractCountReadError>
  >;
}>;
