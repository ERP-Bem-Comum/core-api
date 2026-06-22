import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Refs cross-BC leves (ADR-0001/0031): o Financeiro guarda contrato/plano/categoria/programa
// por ID branded, sem importar o domínio dono. Rehydrate-only — o ID nasce no módulo dono.
// `SupplierRef` é reusado de `partners/public-api/refs.ts` (não recriado aqui).
// Validação só de formato (UUID v4) — clarify Q2.

export type ContractRef = Brand<string, 'ContractRef'>;
export type BudgetPlanRef = Brand<string, 'BudgetPlanRef'>;
export type CategoryRef = Brand<string, 'CategoryRef'>;
export type CostCenterRef = Brand<string, 'CostCenterRef'>;
export type ProgramRef = Brand<string, 'ProgramRef'>;
export type FinancialRefError = 'financial-ref-invalid';

const rehydrateAs = <B>(raw: string): Result<B, FinancialRefError> =>
  isUuidV4(raw) ? ok(raw as B) : err('financial-ref-invalid');

export const ContractRef = {
  rehydrate: (raw: string): Result<ContractRef, FinancialRefError> => rehydrateAs<ContractRef>(raw),
} as const;

export const BudgetPlanRef = {
  rehydrate: (raw: string): Result<BudgetPlanRef, FinancialRefError> =>
    rehydrateAs<BudgetPlanRef>(raw),
} as const;

export const CategoryRef = {
  rehydrate: (raw: string): Result<CategoryRef, FinancialRefError> => rehydrateAs<CategoryRef>(raw),
} as const;

export const CostCenterRef = {
  rehydrate: (raw: string): Result<CostCenterRef, FinancialRefError> =>
    rehydrateAs<CostCenterRef>(raw),
} as const;

export const ProgramRef = {
  rehydrate: (raw: string): Result<ProgramRef, FinancialRefError> => rehydrateAs<ProgramRef>(raw),
} as const;
