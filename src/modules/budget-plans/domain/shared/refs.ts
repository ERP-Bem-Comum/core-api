import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Refs cross-BC leves (mesmo padrão de financial/domain/shared/refs.ts): o plano
// orçamentário guarda programa e parceiros (estado/município — módulo partners) por
// ref branded, sem importar o domínio dono. Rehydrate-only — o ref nasce no módulo dono.
// Validação só de FORMATO, mas por tipo de identidade (cada um tem a sua):
//   - ProgramRef: UUID v4 — Programa é entidade gerada, identidade sintética.
//   - PartnerStateRef: UF (sigla de 2 letras) — chave natural do estado (IBGE/oficial).
//   - PartnerMunicipalityRef: código IBGE (7 dígitos) — chave natural do município.
// A Rede usa chave natural (UF/IBGE), não UUID: identidade oficial, única e estável,
// vinda do catálogo estático de geografia — surrogate UUID seria indireção sem ganho.

export type ProgramRef = Brand<string, 'BudgetPlanProgramRef'>;
export type PartnerStateRef = Brand<string, 'PartnerStateRef'>;
export type PartnerMunicipalityRef = Brand<string, 'PartnerMunicipalityRef'>;
export type BudgetPlanRefError = 'budget-plan-ref-invalid';

const UF_PATTERN = /^[A-Z]{2}$/;
const IBGE_PATTERN = /^[0-9]{7}$/;

export const ProgramRef = {
  rehydrate: (raw: string): Result<ProgramRef, BudgetPlanRefError> =>
    isUuidV4(raw) ? ok(raw as ProgramRef) : err('budget-plan-ref-invalid'),
} as const;

export const PartnerStateRef = {
  rehydrate: (raw: string): Result<PartnerStateRef, BudgetPlanRefError> =>
    UF_PATTERN.test(raw) ? ok(raw as PartnerStateRef) : err('budget-plan-ref-invalid'),
} as const;

export const PartnerMunicipalityRef = {
  rehydrate: (raw: string): Result<PartnerMunicipalityRef, BudgetPlanRefError> =>
    IBGE_PATTERN.test(raw) ? ok(raw as PartnerMunicipalityRef) : err('budget-plan-ref-invalid'),
} as const;
