/**
 * reader.ts — leitura do Planejamento Orcamentario legado (BGP-ETL-READER-MAPPER, fatia 3/3).
 *
 * Conecta SELECT-only via `connectReadonly` (ETL_LEGACY_CONNECTION_STRING, sem Docker —
 * ETL-LEGACY-DIRECT-CONNECTION; env ausente -> throw 'etl-legacy-connection-string-missing',
 * capturado pelo main -> Result err, CA8). PRE-JUNTA no legado para o mapper ficar PURO:
 *   - budget_plans.programId          -> programs.abbreviation        (programSigla)
 *   - budgets.partnerStateId          -> partner_states.abbreviation  (stateAbbreviation)
 *   - budgets.partnerMunicipalityId   -> partner_municipalities.cod   (municipalityCod)
 *                                     + estado do municipio.abbreviation (municipalityUf)
 * Os `Legacy*Row` sao donas do mapper (`./mapper.ts`) — o reader so os popula. ASCII puro.
 *
 * ⚠️ Nomes de coluna/JOIN das tabelas legadas seguem o mapa `ETL-BUDGET-PLANS/000-request.md`
 * (schema TypeORM camelCase). Conferir contra o banco de referencia no W3 (a integracao e' gated).
 */

import type { RowDataPacket } from 'mysql2/promise';

import { connectReadonly } from '../legacy/connect.ts';
import type {
  LegacyBudgetPlanRow,
  LegacyBudgetRow,
  LegacyCostCenterRow,
  LegacyCategoryRow,
  LegacySubcategoryRow,
  LegacyBudgetResultRow,
} from './mapper.ts';

export type LegacyBudgetPlansData = Readonly<{
  plans: readonly LegacyBudgetPlanRow[];
  budgets: readonly LegacyBudgetRow[];
  costCenters: readonly LegacyCostCenterRow[];
  categories: readonly LegacyCategoryRow[];
  subcategories: readonly LegacySubcategoryRow[];
  budgetResults: readonly LegacyBudgetResultRow[];
  // Reconciliacao APENAS (CA5/CA10): budget.legacy_id -> valueInCents gravado no legado. NAO migra
  // (descarte do mapa — o total por Rede e' derivado dos lancamentos); usado so para provar diff 0.
  budgetValueCentsByLegacyId: ReadonlyMap<number, number>;
}>;

const asNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v));
const asNullableNumber = (v: unknown): number | null =>
  v === null || v === undefined ? null : asNumber(v);
const asString = (v: unknown): string => (typeof v === 'string' ? v : String(v));
const asNullableString = (v: unknown): string | null =>
  v === null || v === undefined ? null : asString(v);
const asBool = (v: unknown): boolean => v === 1 || v === true || v === '1';
const asDate = (v: unknown): Date => (v instanceof Date ? v : new Date(String(v)));

// SELECTs explicitos com aliases: pre-juntam as chaves naturais para o mapper puro. `data`,
// `totalInCents`, `mpath`, `costCenterCategoryId` do lancamento e `valueInCents` do budget NAO sao
// selecionados — descartes do mapa, nunca atravessam para o input (CA7/CA9).
const SQL = {
  plans: `
    SELECT bp.id            AS id,
           bp.year          AS year,
           bp.scenarioName  AS scenarioName,
           bp.version       AS version,
           bp.status        AS status,
           pg.abbreviation  AS programSigla,
           bp.updatedById   AS updatedById,
           bp.parentId      AS parentId,
           bp.createdAt     AS createdAt,
           bp.updatedAt     AS updatedAt
    FROM budget_plans bp
    LEFT JOIN programs pg ON pg.id = bp.programId`,
  budgets: `
    SELECT b.id                    AS id,
           b.budgetPlanId          AS budgetPlanId,
           s.abbreviation          AS stateAbbreviation,
           pm.cod                  AS municipalityCod,
           ms.abbreviation         AS municipalityUf,
           b.valueInCents          AS valueInCents
    FROM budgets b
    LEFT JOIN partner_states s          ON s.id = b.partnerStateId
    LEFT JOIN partner_municipalities pm ON pm.id = b.partnerMunicipalityId
    LEFT JOIN partner_states ms         ON ms.id = pm.partnerStateId`,
  costCenters: `
    SELECT id, budgetPlanId, name, type, active
    FROM cost_centers`,
  categories: `
    SELECT id, costCenterId, name, active
    FROM cost_centers_categories`,
  subcategories: `
    SELECT id, costCenterCategoryId, name, releaseType, type, active
    FROM cost_centers_sub_categories`,
  budgetResults: `
    SELECT id, budgetId, costCenterSubCategoryId, month, valueInCents
    FROM budget_results`,
} as const;

/** Conecta SELECT-only, le as 6 tabelas + pre-juntas, popula os Legacy*Row. `end()` garantido. */
export const readLegacyBudgetPlansData = async (): Promise<LegacyBudgetPlansData> => {
  const conn = await connectReadonly();
  try {
    const select = async (sql: string): Promise<readonly Readonly<Record<string, unknown>>[]> => {
      const [rows] = await conn.query<RowDataPacket[]>(sql);
      return rows;
    };

    const plans: LegacyBudgetPlanRow[] = (await select(SQL.plans)).map((r) => ({
      id: asNumber(r['id']),
      year: asNumber(r['year']),
      scenarioName: asNullableString(r['scenarioName']),
      version: asNumber(r['version']),
      status: asString(r['status']),
      programSigla: asString(r['programSigla']),
      updatedById: asNullableNumber(r['updatedById']),
      parentId: asNullableNumber(r['parentId']),
      createdAt: asDate(r['createdAt']),
      updatedAt: asDate(r['updatedAt']),
    }));

    const budgetRaws = await select(SQL.budgets);
    const budgets: LegacyBudgetRow[] = budgetRaws.map((r) => ({
      id: asNumber(r['id']),
      budgetPlanId: asNumber(r['budgetPlanId']),
      stateAbbreviation: asString(r['stateAbbreviation']),
      municipalityCod: asNullableString(r['municipalityCod']),
      municipalityUf: asNullableString(r['municipalityUf']),
    }));
    const budgetValueCentsByLegacyId = new Map<number, number>();
    for (const r of budgetRaws) {
      budgetValueCentsByLegacyId.set(asNumber(r['id']), asNumber(r['valueInCents']));
    }

    const costCenters: LegacyCostCenterRow[] = (await select(SQL.costCenters)).map((r) => ({
      id: asNumber(r['id']),
      budgetPlanId: asNumber(r['budgetPlanId']),
      name: asString(r['name']),
      type: asString(r['type']),
      active: asBool(r['active']),
    }));

    const categories: LegacyCategoryRow[] = (await select(SQL.categories)).map((r) => ({
      id: asNumber(r['id']),
      costCenterId: asNumber(r['costCenterId']),
      name: asString(r['name']),
      active: asBool(r['active']),
    }));

    const subcategories: LegacySubcategoryRow[] = (await select(SQL.subcategories)).map((r) => ({
      id: asNumber(r['id']),
      costCenterCategoryId: asNumber(r['costCenterCategoryId']),
      name: asString(r['name']),
      releaseType: asString(r['releaseType']),
      type: asString(r['type']),
      active: asBool(r['active']),
    }));

    const budgetResults: LegacyBudgetResultRow[] = (await select(SQL.budgetResults)).map((r) => ({
      id: asNumber(r['id']),
      budgetId: asNumber(r['budgetId']),
      costCenterSubCategoryId: asNumber(r['costCenterSubCategoryId']),
      month: asNumber(r['month']),
      valueInCents: asNumber(r['valueInCents']),
    }));

    return {
      plans,
      budgets,
      costCenters,
      categories,
      subcategories,
      budgetResults,
      budgetValueCentsByLegacyId,
    };
  } finally {
    await conn.end().catch(() => {
      /* fechamento best-effort */
    });
  }
};
