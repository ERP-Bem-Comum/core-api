import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Refs cross-BC leves (mesmo padrão de financial/domain/shared/refs.ts): o plano
// orçamentário guarda programa e parceiros (estado/município — módulo partners) por
// ID branded, sem importar o domínio dono. Rehydrate-only — o ID nasce no módulo dono.
// Validação só de formato (UUID v4).

export type ProgramRef = Brand<string, 'BudgetPlanProgramRef'>;
export type PartnerStateRef = Brand<string, 'PartnerStateRef'>;
export type PartnerMunicipalityRef = Brand<string, 'PartnerMunicipalityRef'>;
export type BudgetPlanRefError = 'budget-plan-ref-invalid';

const rehydrateAs = <B>(raw: string): Result<B, BudgetPlanRefError> =>
  isUuidV4(raw) ? ok(raw as B) : err('budget-plan-ref-invalid');

export const ProgramRef = {
  rehydrate: (raw: string): Result<ProgramRef, BudgetPlanRefError> => rehydrateAs<ProgramRef>(raw),
} as const;

export const PartnerStateRef = {
  rehydrate: (raw: string): Result<PartnerStateRef, BudgetPlanRefError> =>
    rehydrateAs<PartnerStateRef>(raw),
} as const;

export const PartnerMunicipalityRef = {
  rehydrate: (raw: string): Result<PartnerMunicipalityRef, BudgetPlanRefError> =>
    rehydrateAs<PartnerMunicipalityRef>(raw),
} as const;
