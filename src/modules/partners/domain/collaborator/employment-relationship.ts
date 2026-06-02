import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Vínculo empregatício. ADR-0031 §D2: códigos legados LITERAIS (database.dbml
// Enum employment_relationship). Termos jurídicos BR, mantidos opacos.

export type EmploymentRelationship = 'CLT' | 'PJ';
export type EmploymentRelationshipError = 'invalid-employment-relationship';

const VALUES: ReadonlySet<string> = new Set<EmploymentRelationship>(['CLT', 'PJ']);

export const parse = (raw: string): Result<EmploymentRelationship, EmploymentRelationshipError> =>
  VALUES.has(raw) ? ok(raw as EmploymentRelationship) : err('invalid-employment-relationship');
