import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// Centro de custo do contrato (ADR-0032: atributo do próprio contrato → agregado).
// Enum autocontido — NÃO é vínculo ao módulo Orçamentário. Códigos literais EN;
// rótulo PT-BR (RH/Serviços Gerais/Eventos) no formatter da CLI/DTO.

export type CostCenter = 'HR' | 'GeneralServices' | 'Events';
export type CostCenterError = 'invalid-cost-center';

const VALUES: ReadonlySet<string> = new Set<CostCenter>(['HR', 'GeneralServices', 'Events']);

export const parse = (raw: string): Result<CostCenter, CostCenterError> =>
  VALUES.has(raw) ? ok(raw as CostCenter) : err('invalid-cost-center');
