import type { Result } from '../../../../shared/primitives/result.ts';

// Port de LEITURA da categorização do contrato (#178). Único caminho pelo qual o financial deriva
// a categorização herdada (categoria/programa/plano/centro de custo) de um `contractRef`, via a
// public-api de contracts (ADR-0006) — sem tocar `ctr_*` cru nem o agregado interno.
//
// `programId`/`budgetPlanId` são refs leves (UUID, fonte canônica = módulo Orçamento #113);
// `categorizacao`/`centroDeCusto` são rótulos livres do contrato. Todos opcionais.

export type ContractCategorizationReadError = 'contract-categorization-read-unavailable';

export type ContractCategorizationView = Readonly<{
  contractId: string;
  programId: string | null;
  budgetPlanId: string | null;
  categorizacao: string | null;
  centroDeCusto: string | null;
}>;

export type ContractCategorizationReadPort = Readonly<{
  // id inexistente → ok(null) (não é erro). Falha de infra → err (sem vazar Error).
  getCategorization: (
    contractId: string,
  ) => Promise<Result<ContractCategorizationView | null, ContractCategorizationReadError>>;
}>;
