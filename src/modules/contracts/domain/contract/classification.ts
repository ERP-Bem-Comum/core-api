import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// Classificação do contrato (ADR-0032: atributo do próprio contrato → agregado).
// `ServiceOrder` (Ordem de Serviço) tem teto de valor (R1). Códigos literais EN;
// rótulo PT-BR (Contrato/Ordem de Serviço) no formatter da CLI/DTO, não aqui.

export type Classification = 'Contract' | 'ServiceOrder';
export type ClassificationError = 'invalid-classification';

const VALUES: ReadonlySet<string> = new Set<Classification>(['Contract', 'ServiceOrder']);

export const parse = (raw: string): Result<Classification, ClassificationError> =>
  VALUES.has(raw) ? ok(raw as Classification) : err('invalid-classification');
