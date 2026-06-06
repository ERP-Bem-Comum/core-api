import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as ContractorRef from './contractor.ts'`.
//
// Referência leve do CONTRATADO — atributo próprio do agregado Contract (ADR-0032
// §"Campos do próprio contrato ≠ composição"). O contratado é aggregate root de
// OUTRO Bounded Context (Parceiros); referenciamos por identidade, não por objeto
// (Vernon, Implementing DDD, p.460). As variantes ricas (Supplier|Financier|
// Collaborator|Act com payload) vivem só no `ContractorView` da public-api de
// Parceiros, compostas na borda HTTP — NUNCA no domínio de contracts (FR-012).

export type ContractorType = 'supplier' | 'financier' | 'collaborator' | 'act';

export type ContractorId = Brand<string, 'ContractorId'>;

export type ContractorRef = Readonly<{ type: ContractorType; id: ContractorId }>;

export type ContractorRefError =
  | 'contractor-type-unknown'
  | 'contractor-id-empty'
  | 'contractor-id-invalid';

const CONTRACTOR_TYPES: readonly ContractorType[] = [
  'supplier',
  'financier',
  'collaborator',
  'act',
];

const isContractorType = (raw: string): raw is ContractorType =>
  (CONTRACTOR_TYPES as readonly string[]).includes(raw);

export const parseType = (raw: string): Result<ContractorType, 'contractor-type-unknown'> =>
  isContractorType(raw) ? ok(raw) : err('contractor-type-unknown');

export const parseId = (
  raw: string,
): Result<ContractorId, 'contractor-id-empty' | 'contractor-id-invalid'> => {
  if (raw.length === 0) return err('contractor-id-empty');
  return isUuidV4(raw) ? ok(raw as ContractorId) : err('contractor-id-invalid');
};

export const make = (type: string, id: string): Result<ContractorRef, ContractorRefError> => {
  const t = parseType(type);
  if (!t.ok) return t;
  const i = parseId(id);
  if (!i.ok) return i;
  return ok({ type: t.value, id: i.value });
};
