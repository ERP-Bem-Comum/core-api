// Adapters Drizzle dos LegacyEntityStore das 6 entidades bgp_* (modulo budget-plans).
//
// Persistencia ciente de legacy_id para a ETL (BGP-ETL-WRITE-PORT). Molde direto de
// `partners/adapters/persistence/repos/partners-etl-store.drizzle.ts`. Semantica de INSERT
// idempotente (skip-by-legacy_id), NUNCA UPDATE (re-run nao sobrescreve):
//   findByLegacyId: SELECT pk WHERE legacy_id=? (bgp_<x>_legacy_id_uq, type=const).
//   provision:      transacao — SELECT FOR UPDATE by legacy_id; se existe -> skip ('already-exists');
//                   senao INSERT { ...<input>, legacyId } ('created').
//                   ER_DUP_ENTRY em bgp_<x>_legacy_id_uq (corrida) -> 'already-exists'.
//
// Inputs sao PLAIN rows da public-api (ADR-0006), nao agregados de dominio — o port grava o que o
// mapper mandar. ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so bgp_*. Boundary: try/catch -> Result.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../../shared/ports/clock.ts';
import type {
  LegacyEntityStore,
  BudgetPlansEtlStoreError,
  ProvisionOutcome,
  BudgetPlanEtlInput,
  CostCenterEtlInput,
  CategoryEtlInput,
  SubcategoryEtlInput,
  BudgetEtlInput,
  BudgetResultEtlInput,
} from '../../../application/ports/legacy-entity-store.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';

// Serializacao defensiva para o stderr (molde partners): Error -> message + errno/code/sqlMessage
// do mysql2 quando presentes; objeto -> JSON; resto -> String.
const describeCause = (cause: unknown): string => {
  if (cause instanceof Error) {
    const obj = cause as unknown as Record<string, unknown>;
    const errno = obj['errno'];
    const code = obj['code'];
    const sqlMessage = obj['sqlMessage'];
    const extras: string[] = [];
    if (typeof errno === 'number') extras.push(`errno=${errno}`);
    if (typeof code === 'string') extras.push(`code=${code}`);
    if (typeof sqlMessage === 'string') extras.push(`sqlMessage=${sqlMessage}`);
    return extras.length > 0 ? `${cause.message} (${extras.join(' ')})` : cause.message;
  }
  if (typeof cause === 'object' && cause !== null) {
    try {
      return JSON.stringify(cause);
    } catch {
      return Object.prototype.toString.call(cause);
    }
  }
  return String(cause);
};

const log = (ctx: string, cause: unknown): void => {
  const nested =
    cause instanceof Error && cause.cause !== undefined
      ? ` | cause: ${describeCause(cause.cause)}`
      : '';
  process.stderr.write(`[budget-plans-etl-store:${ctx}] ${describeCause(cause)}${nested}\n`);
};

// Classe de erro de provision derivada do erro do mysql2 (eventualmente aninhado em .cause via
// DrizzleQueryError). PII-free: e' um literal fixo, jamais o valor duplicado do sqlMessage.
type ProvisionErrorClass = 'already-exists' | 'integrity-violation' | 'unavailable';

// Extrai o nome do indice citado por um ER_DUP_ENTRY (`... for key 'NOME'`), ou null.
const dupEntryIndexName = (cause: unknown): string | null => {
  const candidates: unknown[] = [cause];
  if (cause instanceof Error && cause.cause !== undefined) candidates.push(cause.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      const sqlMessage = obj['sqlMessage'];
      if (obj['errno'] === 1062 && typeof sqlMessage === 'string') {
        const match = /for key '([^']+)'/.exec(sqlMessage);
        if (match?.[1] !== undefined) return match[1];
      }
    }
  }
  return null;
};

// Classifica o erro de provision SEM tocar MySQL (testavel). Regras:
//   1062 em <legacyIdIndex>            -> 'already-exists'      (idempotencia ETL; nunca vaza UNIQUE)
//   1062 em outra UNIQUE bgp_*_uq      -> 'integrity-violation' (dado do legado, NAO infra)
//   demais (nao-1062, PRIMARY, opaco)  -> 'unavailable'         (infra; conservador)
export const classifyProvisionError = (
  cause: unknown,
  legacyIdIndex: string,
): ProvisionErrorClass => {
  const indexName = dupEntryIndexName(cause);
  if (indexName === null) return 'unavailable';
  if (indexName === legacyIdIndex) return 'already-exists';
  if (indexName.startsWith('bgp_') && indexName.endsWith('_uq')) return 'integrity-violation';
  return 'unavailable';
};

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, BudgetPlansEtlStoreError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    log(ctx, cause);
    return err('budget-plans-etl-store-unavailable');
  }
};

const runProvision = async (
  ctx: string,
  legacyIdIndex: string,
  body: () => Promise<ProvisionOutcome>,
): Promise<Result<ProvisionOutcome, BudgetPlansEtlStoreError>> => {
  try {
    return ok(await body());
  } catch (cause) {
    const klass = classifyProvisionError(cause, legacyIdIndex);
    switch (klass) {
      case 'already-exists':
        return ok('already-exists');
      case 'integrity-violation':
        log(ctx, cause);
        return err('budget-plans-etl-store-integrity-violation');
      case 'unavailable':
        log(ctx, cause);
        return err('budget-plans-etl-store-unavailable');
    }
  }
};

export const createDrizzleBudgetPlansEtlStores = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): Readonly<{
  plans: LegacyEntityStore<BudgetPlanEtlInput, string>;
  costCenters: LegacyEntityStore<CostCenterEtlInput, string>;
  categories: LegacyEntityStore<CategoryEtlInput, string>;
  subcategories: LegacyEntityStore<SubcategoryEtlInput, string>;
  budgets: LegacyEntityStore<BudgetEtlInput, string>;
  budgetResults: LegacyEntityStore<BudgetResultEtlInput, string>;
}> => {
  const { db, schema } = handle;

  const plans: LegacyEntityStore<BudgetPlanEtlInput, string> = {
    findByLegacyId: async (legacyId) =>
      safe('plans.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.budgetPlans.id })
          .from(schema.budgetPlans)
          .where(eq(schema.budgetPlans.legacyId, legacyId));
        return rows[0]?.id ?? null;
      }),
    provision: async (input, legacyId) =>
      runProvision('plans.provision', 'bgp_budget_plans_legacy_id_uq', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.budgetPlans.id })
            .from(schema.budgetPlans)
            .where(eq(schema.budgetPlans.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          const now = clock.now();
          await tx.insert(schema.budgetPlans).values({
            id: input.id,
            year: input.year,
            programRef: input.programRef,
            versionMajor: input.versionMajor,
            versionMinor: input.versionMinor,
            status: input.status,
            parentId: input.parentId,
            scenarioName: input.scenarioName,
            createdAt: now,
            updatedAt: now,
            legacyId,
          });
        });
        return outcome;
      }),
  };

  const costCenters: LegacyEntityStore<CostCenterEtlInput, string> = {
    findByLegacyId: async (legacyId) =>
      safe('costCenters.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.costCenters.id })
          .from(schema.costCenters)
          .where(eq(schema.costCenters.legacyId, legacyId));
        return rows[0]?.id ?? null;
      }),
    provision: async (input, legacyId) =>
      runProvision('costCenters.provision', 'bgp_cost_centers_legacy_id_uq', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.costCenters.id })
            .from(schema.costCenters)
            .where(eq(schema.costCenters.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx.insert(schema.costCenters).values({
            id: input.id,
            budgetPlanId: input.budgetPlanId,
            name: input.name,
            direction: input.direction,
            active: input.active,
            legacyId,
          });
        });
        return outcome;
      }),
  };

  const categories: LegacyEntityStore<CategoryEtlInput, string> = {
    findByLegacyId: async (legacyId) =>
      safe('categories.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.categories.id })
          .from(schema.categories)
          .where(eq(schema.categories.legacyId, legacyId));
        return rows[0]?.id ?? null;
      }),
    provision: async (input, legacyId) =>
      runProvision('categories.provision', 'bgp_categories_legacy_id_uq', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.categories.id })
            .from(schema.categories)
            .where(eq(schema.categories.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx.insert(schema.categories).values({
            id: input.id,
            costCenterId: input.costCenterId,
            name: input.name,
            active: input.active,
            legacyId,
          });
        });
        return outcome;
      }),
  };

  const subcategories: LegacyEntityStore<SubcategoryEtlInput, string> = {
    findByLegacyId: async (legacyId) =>
      safe('subcategories.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.subcategories.id })
          .from(schema.subcategories)
          .where(eq(schema.subcategories.legacyId, legacyId));
        return rows[0]?.id ?? null;
      }),
    provision: async (input, legacyId) =>
      runProvision('subcategories.provision', 'bgp_subcategories_legacy_id_uq', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.subcategories.id })
            .from(schema.subcategories)
            .where(eq(schema.subcategories.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx.insert(schema.subcategories).values({
            id: input.id,
            categoryId: input.categoryId,
            name: input.name,
            launchType: input.launchType,
            active: input.active,
            legacyId,
          });
        });
        return outcome;
      }),
  };

  const budgets: LegacyEntityStore<BudgetEtlInput, string> = {
    findByLegacyId: async (legacyId) =>
      safe('budgets.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.budgets.id })
          .from(schema.budgets)
          .where(eq(schema.budgets.legacyId, legacyId));
        return rows[0]?.id ?? null;
      }),
    provision: async (input, legacyId) =>
      runProvision('budgets.provision', 'bgp_budgets_legacy_id_uq', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.budgets.id })
            .from(schema.budgets)
            .where(eq(schema.budgets.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx.insert(schema.budgets).values({
            id: input.id,
            budgetPlanId: input.budgetPlanId,
            partnerKind: input.partnerKind,
            partnerRef: input.partnerRef,
            legacyId,
          });
        });
        return outcome;
      }),
  };

  const budgetResults: LegacyEntityStore<BudgetResultEtlInput, string> = {
    findByLegacyId: async (legacyId) =>
      safe('budgetResults.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.budgetResults.id })
          .from(schema.budgetResults)
          .where(eq(schema.budgetResults.legacyId, legacyId));
        return rows[0]?.id ?? null;
      }),
    provision: async (input, legacyId) =>
      runProvision('budgetResults.provision', 'bgp_budget_results_legacy_id_uq', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.budgetResults.id })
            .from(schema.budgetResults)
            .where(eq(schema.budgetResults.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx.insert(schema.budgetResults).values({
            id: input.id,
            budgetId: input.budgetId,
            subcategoryId: input.subcategoryId,
            month: input.month,
            model: input.model,
            valueCents: input.valueCents,
            legacyId,
          });
        });
        return outcome;
      }),
  };

  return { plans, costCenters, categories, subcategories, budgets, budgetResults };
};
