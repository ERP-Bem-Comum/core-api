import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Referências de parceiro expostas a outros módulos (ADR-0031 §7). Contratos e
// Financeiro guardam um parceiro por ID branded, NUNCA importam o domínio de
// `partners`. Rehydrate-only: o ID nasce dentro de `partners`, não aqui.
//
// Cada ref é um namespace-objeto (`SupplierRef.rehydrate(...)`). O algoritmo é
// idêntico ao `UserRef` do kernel — UUID v4 ou erro.

export type SupplierRef = Brand<string, 'SupplierRef'>;
export type FinancierRef = Brand<string, 'FinancierRef'>;
export type CollaboratorRef = Brand<string, 'CollaboratorRef'>;
export type PartnerRefError = 'partner-ref-invalid';

const rehydrateAs = <B>(raw: string): Result<B, PartnerRefError> =>
  isUuidV4(raw) ? ok(raw as B) : err('partner-ref-invalid');

export const SupplierRef = {
  rehydrate: (raw: string): Result<SupplierRef, PartnerRefError> => rehydrateAs<SupplierRef>(raw),
} as const;

export const FinancierRef = {
  rehydrate: (raw: string): Result<FinancierRef, PartnerRefError> => rehydrateAs<FinancierRef>(raw),
} as const;

export const CollaboratorRef = {
  rehydrate: (raw: string): Result<CollaboratorRef, PartnerRefError> =>
    rehydrateAs<CollaboratorRef>(raw),
} as const;
