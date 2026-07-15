/**
 * Seed de catálogo do budget-plans via env para E2E/dev (BGP-MEMORY-SEED-CATALOG, #330).
 *
 * `parseE2eBudgetPlansSeed` é puro e tem **guarda dupla**: só devolve um `BudgetPlansSeed`
 * quando `CORE_API_E2E === '1'` E `BUDGET_PLANS_SEED_JSON` está presente e bem-formado. Em
 * produção (`CORE_API_E2E` ausente) devolve `undefined` — o seed é inerte, jamais lido, e o
 * catálogo de programas do driver memory nasce vazio (o comportamento real de produção).
 *
 * ⚠️ `CORE_API_E2E`/`BUDGET_PLANS_SEED_JSON` são EXCLUSIVOS de dev/test/E2E — nunca setados em
 * produção. JSON malformado ou shape inválido sob a flag → erro de boot (falha cedo, ambiente
 * controlado). Espelho literal de `auth/adapters/http/e2e-seed.ts`.
 */

import type { BudgetPlansSeed } from './composition.ts';

const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((item) => typeof item === 'string');

const isProgramSnapshot = (v: unknown): boolean => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p['ref'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['abbreviation'] === 'string' &&
    typeof p['active'] === 'boolean'
  );
};

const isPartnerNode = (v: unknown): boolean => {
  if (typeof v !== 'object' || v === null) return false;
  const n = v as Record<string, unknown>;
  return (
    typeof n['ref'] === 'string' && typeof n['name'] === 'string' && typeof n['uf'] === 'string'
  );
};

const isPlanSeed = (v: unknown): boolean => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p['id'] === 'string' &&
    typeof p['year'] === 'number' &&
    typeof p['programRef'] === 'string' &&
    typeof p['status'] === 'string'
  );
};

const isBudgetPlansSeed = (v: unknown): v is BudgetPlansSeed => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  // `programs` é obrigatório aqui (o driver memory nasce do catálogo semeado).
  if (!Array.isArray(s['programs']) || !s['programs'].every(isProgramSnapshot)) return false;
  if (
    s['partnerStates'] !== undefined &&
    !(Array.isArray(s['partnerStates']) && s['partnerStates'].every(isPartnerNode))
  ) {
    return false;
  }
  if (
    s['partnerMunicipalities'] !== undefined &&
    !(Array.isArray(s['partnerMunicipalities']) && s['partnerMunicipalities'].every(isPartnerNode))
  ) {
    return false;
  }
  if (s['plans'] !== undefined && !(Array.isArray(s['plans']) && s['plans'].every(isPlanSeed))) {
    return false;
  }
  if (s['budgetsExisting'] !== undefined && !isStringArray(s['budgetsExisting'])) return false;
  if (
    s['subcategoryLaunchTypes'] !== undefined &&
    (typeof s['subcategoryLaunchTypes'] !== 'object' || s['subcategoryLaunchTypes'] === null)
  ) {
    return false;
  }
  return true;
};

export const parseE2eBudgetPlansSeed = (
  env: Readonly<Record<string, string | undefined>>,
): BudgetPlansSeed | undefined => {
  if (env['CORE_API_E2E'] !== '1') return undefined;
  const raw = env['BUDGET_PLANS_SEED_JSON'];
  if (raw === undefined || raw === '') return undefined;

  const parsed: unknown = JSON.parse(raw); // lança SyntaxError em JSON malformado (boot dev/test)
  if (!isBudgetPlansSeed(parsed)) {
    throw new Error(
      'parseE2eBudgetPlansSeed: BUDGET_PLANS_SEED_JSON com shape inválido (esperado { programs: [{ ref, name, abbreviation, active }], partnerStates?, partnerMunicipalities?, plans? })',
    );
  }
  return parsed;
};
