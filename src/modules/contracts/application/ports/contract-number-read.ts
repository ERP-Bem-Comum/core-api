import type { Result } from '../../../../shared/primitives/result.ts';

// Port de LEITURA do NÚMERO do contrato (REP-6 · #442 · Slice D). Único caminho pelo qual outro
// módulo (reports — "Relatório Geral") resolve o NÚMERO (`ctr_contracts.sequential_number`) a partir
// da ref/UUID do contrato (`ctr_contracts.id`), via a public-api de contracts (ADR-0006) — sem tocar
// `ctr_*` cru nem o agregado interno, e sem JOIN cross-módulo `ctr_*` × `fin_*` (ADR-0014).
//
// Batch por construção: recebe a lista de ids de UMA página e devolve o Map `id → sequential_number`.
// Ids ausentes (contrato inexistente) simplesmente NÃO aparecem no Map — a costura no reports degrada
// para `null`. `ids` vazio → `ok(Map vazio)` sem tocar o banco (o chamador nem precisa ramificar).

export type ContractNumberReadError = 'contract-number-read-unavailable';

export type ContractNumberReadPort = Readonly<{
  resolveContractNumbers: (
    ids: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, string>, ContractNumberReadError>>;
}>;
