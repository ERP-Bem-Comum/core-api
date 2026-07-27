// Adapter Drizzle do `PlanLabelsReadPort` (BGP-PLAN-LABELS-READ) — LEITURA read-only do rótulo do
// Plano Orçamentário (REP-3 · #446 Slice C). Boundary try/catch → Result. Só `bgp_*` (ADR-0014);
// o nome do programa vem via `ProgramCatalogPort` (ACL do próprio módulo), NUNCA por JOIN
// cross-módulo no SQL.
//
//   SELECT id, scenario_name, year, program_ref, version_major, version_minor
//   FROM   bgp_budget_plans
//   WHERE  id IN (:ids)
//
// Resolução do programa em LOTE (dedupe por ref, um getByRef por ref distinto) — o catálogo tem
// poucas linhas e o adapter de programs relê tudo e filtra (sem cache, coerente com o módulo).
// Programa não resolvido (catálogo indisponível OU ref órfã) → `programName: null` e o compositor
// cai no fallback gracioso. Nunca quebra por causa do nome.

import { inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { PlanLabelsReadPort } from '#src/modules/budget-plans/application/ports/plan-labels-read.ts';
import type { BudgetPlansReadError } from '#src/modules/budget-plans/application/ports/planned-amounts-read.ts';
import type { ProgramCatalogPort } from '#src/modules/budget-plans/application/ports/program-catalog.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { composePlanLabel } from './plan-label.ts';

export const createDrizzlePlanLabelsReader = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  programCatalog: ProgramCatalogPort,
): PlanLabelsReadPort => {
  const { db } = handle;

  // Resolve o nome de cada `program_ref` distinto, gracioso: erro/null/ref-inválida → null.
  const resolveProgramNames = async (
    refs: readonly string[],
  ): Promise<ReadonlyMap<string, string | null>> => {
    const names = new Map<string, string | null>();
    for (const raw of refs) {
      const refR = ProgramRef.rehydrate(raw);
      if (!refR.ok) {
        names.set(raw, null);
        continue;
      }
      const snapR = await programCatalog.getByRef(refR.value);
      names.set(raw, snapR.ok && snapR.value !== null ? snapR.value.name : null);
    }
    return names;
  };

  const resolvePlanLabels = async (
    ids: readonly string[],
  ): Promise<Result<ReadonlyMap<string, string>, BudgetPlansReadError>> => {
    if (ids.length === 0) return ok(new Map());
    try {
      const rows = await db
        .select({
          id: schema.budgetPlans.id,
          scenarioName: schema.budgetPlans.scenarioName,
          year: schema.budgetPlans.year,
          programRef: schema.budgetPlans.programRef,
          versionMajor: schema.budgetPlans.versionMajor,
          versionMinor: schema.budgetPlans.versionMinor,
        })
        .from(schema.budgetPlans)
        .where(inArray(schema.budgetPlans.id, [...ids]));

      const distinctRefs = [...new Set(rows.map((r) => r.programRef))];
      const programNames = await resolveProgramNames(distinctRefs);

      const out = new Map<string, string>();
      for (const r of rows) {
        out.set(
          r.id,
          composePlanLabel({
            scenarioName: r.scenarioName,
            programName: programNames.get(r.programRef) ?? null,
            year: r.year,
            versionMajor: r.versionMajor,
            versionMinor: r.versionMinor,
          }),
        );
      }
      return ok(out);
    } catch (cause) {
      process.stderr.write(`[budget-plans-read:resolvePlanLabels] ${String(cause)}\n`);
      return err('budget-plans-read-query-failed');
    }
  };

  return { resolvePlanLabels };
};
