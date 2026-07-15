import type { Result } from '../../../../shared/primitives/result.ts';

// Port de LEITURA dos contratantes que possuem contrato ATIVO (#437). Único caminho pelo qual outro
// módulo (reports — relatório "Fornecedores sem Contrato") obtém esse conjunto, via a public-api de
// contracts (ADR-0006) — sem tocar `ctr_*` cru nem o agregado interno.
//
// Semântica: SÓ `status = 'Active'` conta. `Pending` é rascunho sem assinatura/vigência (CHECK
// `ctr_contracts_pending_consistency_chk`) e NÃO é contrato; `Expired`/`Terminated`/`Cancelled`
// também não. Escopo `contractor_type = 'supplier'` — o relatório consumidor é de fornecedores.
//
// Distinto de `ContractCountReadPort`, cujos LIVE_STATUSES incluem 'Pending' por paridade
// backfill × worker (`contract-count-read.drizzle.ts`). São perguntas diferentes; não unificar.

export type ActiveContractorReadError = 'active-contractor-read-unavailable';

export type ActiveContractorReadPort = Readonly<{
  listContractorsWithActiveContract: () => Promise<
    Result<readonly string[], ActiveContractorReadError>
  >;
}>;
