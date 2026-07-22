/**
 * Mapper ETL do modulo Orcamento (BGP-ETL-READER-MAPPER, fatia 3/3): linhas legadas ->
 * inputs plain das 6 entidades `bgp_*`. Funcoes PURAS (sem I/O): cada uma recebe uma linha ja
 * pre-juntada pelo reader (siglas/UF resolvidas no legado) + refs de core injetadas como Map, e
 * devolve `Result<Mapped*, readonly QuarantineReason[]>`. Refs de UUID (id novo, parentId, de-para)
 * sao responsabilidade do `main.ts` — o mapper so carrega `legacyId` + os `*LegacyId` de FK.
 *
 * Fonte da verdade das regras: `.claude/.pipeline/ETL-BUDGET-PLANS/000-request.md` (mapa campo a
 * campo, numeros medidos no dump `Cloud_SQL_Export_2026-04-30`). ADR-0006: a ETL so conhece a
 * public-api do modulo (os *EtlInput plain rows) — este mapper nao importa domain/ nem application/.
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';

// ── Linhas legadas (donas do mapper — pre-juntadas pelo reader) ────────────────

export type LegacyBudgetPlanRow = Readonly<{
  id: number;
  year: number;
  scenarioName: string | null;
  version: number;
  status: string;
  // Pre-junta do reader: budget_plans.programId -> programs.abbreviation (sigla legada).
  programSigla: string;
  // budget_plans.updatedById (id do usuario no auth legado); null quando sem autor.
  updatedById: number | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacyBudgetRow = Readonly<{
  id: number;
  budgetPlanId: number;
  // Estado SEMPRE presente no legado (pre-junta partnerStateId -> partner_states.abbreviation).
  stateAbbreviation: string;
  // Municipio so quando municipal (pre-junta partnerMunicipalityId -> cod IBGE + uf); senao null.
  municipalityCod: string | null;
  municipalityUf: string | null;
}>;

export type LegacyCostCenterRow = Readonly<{
  id: number;
  budgetPlanId: number;
  name: string;
  type: string;
  active: boolean;
}>;

export type LegacyCategoryRow = Readonly<{
  id: number;
  costCenterId: number;
  name: string;
  active: boolean;
}>;

export type LegacySubcategoryRow = Readonly<{
  id: number;
  costCenterCategoryId: number;
  name: string;
  releaseType: string;
  type: string;
  active: boolean;
}>;

export type LegacyBudgetResultRow = Readonly<{
  id: number;
  budgetId: number;
  costCenterSubCategoryId: number;
  month: number;
  valueInCents: number;
}>;

// ── Refs de core injetadas (resolvidas pelo main a partir do reader + core) ────

export type BudgetPlanMapRefs = Readonly<{
  // programs.abbreviation (sigla legada) -> prg_programs.id (uuid). Medido: so PARC e EPV.
  programRefBySigla: ReadonlyMap<string, string>;
  // auth.legacy_id (updatedById legado) -> auth_user.id (uuid). Medido: so 2 usuarios.
  updatedByByLegacyId: ReadonlyMap<number, string>;
}>;

export type BudgetResultMapRefs = Readonly<{
  // subcategoria.legacy_id -> launchType (releaseType) da subcategoria. Origem do `model` derivado.
  launchTypeBySubcategoryLegacyId: ReadonlyMap<number, string>;
}>;

// ── Saidas mapeadas (input = *EtlInput da fatia 2 menos os UUIDs, resolvidos no main) ──

export type MappedBudgetPlan = Readonly<{
  legacyId: number;
  parentLegacyId: number | null;
  input: Readonly<{
    year: number;
    programRef: string;
    versionMajor: number;
    versionMinor: number;
    status: string;
    scenarioName: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}>;

export type MappedBudget = Readonly<{
  legacyId: number;
  budgetPlanLegacyId: number;
  input: Readonly<{ partnerKind: string; partnerRef: string }>;
}>;

export type MappedCostCenter = Readonly<{
  legacyId: number;
  budgetPlanLegacyId: number;
  input: Readonly<{ name: string; direction: string; active: boolean }>;
}>;

export type MappedCategory = Readonly<{
  legacyId: number;
  costCenterLegacyId: number;
  input: Readonly<{ name: string; active: boolean }>;
}>;

export type MappedSubcategory = Readonly<{
  legacyId: number;
  categoryLegacyId: number;
  input: Readonly<{ name: string; launchType: string; active: boolean }>;
}>;

export type MappedBudgetResult = Readonly<{
  legacyId: number;
  budgetLegacyId: number;
  subcategoryLegacyId: number;
  input: Readonly<{ month: number; model: string; valueCents: number }>;
}>;

// ── 1. budget_plans -> bgp_budget_plans ───────────────────────────────────────

// version (float) -> (major, minor). Parte inteira = major; 1a decimal = minor. >1 casa decimal
// e' irrepresentavel no alvo (o float nao distingue 1.10 de 1.1) -> quarentena, nunca arredonda.
// Usa a repr. string (String(1.1)==='1.1', String(1.0)==='1', String(1.25)==='1.25').
type VersionParts = Readonly<{ major: number; minor: number }>;

const parseVersion = (version: number): VersionParts | null => {
  const s = String(version);
  const dot = s.indexOf('.');
  if (dot === -1) {
    return { major: Math.trunc(version), minor: 0 };
  }
  const frac = s.slice(dot + 1);
  if (frac.length > 1) return null; // >1 casa decimal -> quarentena
  return { major: Math.trunc(version), minor: Number(frac) };
};

export const mapBudgetPlanRow = (
  row: LegacyBudgetPlanRow,
  refs: BudgetPlanMapRefs,
): Result<MappedBudgetPlan, readonly QuarantineReason[]> => {
  const errors: QuarantineReason[] = [];

  const version = parseVersion(row.version);
  if (version === null) {
    errors.push({ tag: 'PrecisionUnsupported', field: 'version', attempted: String(row.version) });
  }

  const programRef = refs.programRefBySigla.get(row.programSigla);
  if (programRef === undefined) {
    // Sigla orfa: nunca inventar programa (CA7). Reusa RequiredFieldMissing (contrato W0).
    errors.push({ tag: 'RequiredFieldMissing', field: 'program_ref' });
  }

  if (errors.length > 0 || version === null || programRef === undefined) return err(errors);

  // updatedById -> updatedBy via auth.legacy_id. Miss/null -> null (nullable, NAO quarentena).
  const updatedBy =
    row.updatedById === null ? null : (refs.updatedByByLegacyId.get(row.updatedById) ?? null);

  return ok({
    legacyId: row.id,
    parentLegacyId: row.parentId,
    input: {
      year: row.year,
      programRef,
      versionMajor: version.major,
      versionMinor: version.minor,
      status: row.status,
      scenarioName: row.scenarioName,
      updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  });
};

// ── 2. budgets -> bgp_budgets (Rede: estado XOR municipio) ─────────────────────

export const mapBudgetRow = (
  row: LegacyBudgetRow,
): Result<MappedBudget, readonly QuarantineReason[]> => {
  // Municipio preenchido -> ('municipality', cod IBGE); senao -> ('state', UF abbreviation).
  if (row.municipalityCod !== null) {
    // Guarda: a UF do municipio DEVE coincidir com a abbreviation do estado (medido: Fortaleza/CE).
    if (row.municipalityUf !== row.stateAbbreviation) {
      return err([
        {
          tag: 'CrossFieldMismatch',
          field: 'partner_uf',
          attempted: `${row.municipalityUf ?? '(null)'}!=${row.stateAbbreviation}`,
        },
      ]);
    }
    return ok({
      legacyId: row.id,
      budgetPlanLegacyId: row.budgetPlanId,
      input: { partnerKind: 'municipality', partnerRef: row.municipalityCod },
    });
  }
  return ok({
    legacyId: row.id,
    budgetPlanLegacyId: row.budgetPlanId,
    input: { partnerKind: 'state', partnerRef: row.stateAbbreviation },
  });
};

// ── 3. cost_centers -> bgp_cost_centers ───────────────────────────────────────

export const mapCostCenterRow = (
  row: LegacyCostCenterRow,
): Result<MappedCostCenter, readonly QuarantineReason[]> =>
  // type -> direction direto (enums identicos: 'A PAGAR'/'A RECEBER'). name/active direto.
  ok({
    legacyId: row.id,
    budgetPlanLegacyId: row.budgetPlanId,
    input: { name: row.name, direction: row.type, active: row.active },
  });

// ── 4. cost_centers_categories -> bgp_categories ──────────────────────────────

export const mapCategoryRow = (
  row: LegacyCategoryRow,
): Result<MappedCategory, readonly QuarantineReason[]> =>
  ok({
    legacyId: row.id,
    costCenterLegacyId: row.costCenterId,
    input: { name: row.name, active: row.active },
  });

// ── 5. cost_centers_sub_categories -> bgp_subcategories ───────────────────────

export const mapSubcategoryRow = (
  row: LegacySubcategoryRow,
): Result<MappedSubcategory, readonly QuarantineReason[]> => {
  // type INSTITUCIONAL nao tem onde ser guardado (o alvo so guarda REDE) -> quarentena (CA8),
  // nunca descarte silencioso. Medido: as 390 sao REDE. Reusa EnumUnknown com o valor tentado.
  if (row.type !== 'REDE') {
    return err([{ tag: 'EnumUnknown', field: 'sub_category_type', attempted: row.type }]);
  }
  // releaseType -> launchType direto (enums identicos). name/active direto.
  return ok({
    legacyId: row.id,
    categoryLegacyId: row.costCenterCategoryId,
    input: { name: row.name, launchType: row.releaseType, active: row.active },
  });
};

// ── 6. budget_results -> bgp_budget_results (o volume: 4.679; `model` DERIVADO) ─

export const mapBudgetResultRow = (
  row: LegacyBudgetResultRow,
  refs: BudgetResultMapRefs,
): Result<MappedBudgetResult, readonly QuarantineReason[]> => {
  // model DERIVADO do launchType da subcategoria (o legado nao tem a coluna, CA4). Sem launchType
  // nas refs o model nao e' inventavel -> quarentena (nao descarta em silencio).
  const model = refs.launchTypeBySubcategoryLegacyId.get(row.costCenterSubCategoryId);
  if (model === undefined) {
    return err([{ tag: 'RequiredFieldMissing', field: 'model' }]);
  }
  // NENHUM insumo de calculo atravessa (CA7/CA9): input = { month, model, valueCents } e nada mais.
  return ok({
    legacyId: row.id,
    budgetLegacyId: row.budgetId,
    subcategoryLegacyId: row.costCenterSubCategoryId,
    input: { month: row.month, model, valueCents: row.valueInCents },
  });
};
