import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// Modelo do contrato (ADR-0032: atributo do próprio contrato → agregado).
// Códigos literais EN; rótulo PT-BR (Serviço/Doação) no formatter da CLI/DTO.

export type ContractModel = 'Service' | 'Donation';
export type ContractModelError = 'invalid-contract-model';

const VALUES: ReadonlySet<string> = new Set<ContractModel>(['Service', 'Donation']);

export const parse = (raw: string): Result<ContractModel, ContractModelError> =>
  VALUES.has(raw) ? ok(raw as ContractModel) : err('invalid-contract-model');
