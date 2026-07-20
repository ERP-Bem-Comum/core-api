// Adapter Drizzle do `PlannedAmountsReadPort` (BGP-READ-PORT) — LEITURA read-only do orçado.
// Boundary try/catch → Result. Zero escrita, zero throw cruzando a borda. Só `bgp_*` (ADR-0014).
//
// A QUERY, em uma frase: a árvore vem do PLANO (INNER JOIN plans → cost_centers → categories →
// subcategories), é multiplicada por um CALENDÁRIO de 12 literais (CROSS JOIN) e só então os
// lançamentos entram por LEFT JOIN. Por isso toda subcategoria do plano devolve 12 linhas, mesmo
// sem nenhum lançamento (CA2/CA3) — `COALESCE(SUM(value_cents), 0)` transforma o "não existe" em 0.
//
//   FROM      bgp_budget_plans p
//   JOIN      bgp_cost_centers cc  ON cc.budget_plan_id = p.id
//   JOIN      bgp_categories   cat ON cat.cost_center_id = cc.id
//   JOIN      bgp_subcategories s  ON s.category_id = cat.id
//   CROSS JOIN (SELECT 1 AS m UNION ALL ... SELECT 12) cal        -- calendário, ADR-0020
//   LEFT JOIN bgp_budgets b ON b.budget_plan_id = p.id [AND <filtro de Rede>]
//   LEFT JOIN bgp_budget_results r ON r.subcategory_id = s.id AND r.budget_id = b.id AND r.month = cal.m
//   WHERE     <filtros de plano: id / ano / programa>
//   GROUP BY  p.id, cc.id, cc.name, cat.id, cat.name, s.id, s.name, cal.m
//
// ⚠️ O FILTRO DE REDE (estado/município) VIVE NO `ON` DO LEFT JOIN, NUNCA NO `WHERE`. No `WHERE`
// ele descartaria as linhas cujo LEFT JOIN não casou — apagando justamente os meses zerados que o
// contrato exige (CA3). No `ON`, ele apenas escolhe QUAIS Redes entram na soma.
//
// `bgp_budget_results` não tem FK para `bgp_budgets`/`bgp_subcategories` (D1 do #317): o join é por
// identidade, exatamente como o resto do módulo faz.

import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  PlannedAmountsReadPort,
  PlannedAmountsFilter,
  PlannedAmountRow,
  BudgetPlansReadError,
} from '#src/modules/budget-plans/application/ports/planned-amounts-read.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';

// Calendário 1..12 como derivada de literais (ADR-0020 permite UNION ALL; criar tabela de
// calendário seria mudança de schema — fora de escopo). É o que materializa a grade de 12 meses.
const MONTHS_CALENDAR: SQL = sql`(
  SELECT 1 AS m UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
  UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) AS cal`;

// `string | number` é honesto: o que o driver devolve para uma coluna de derivada não é provado pelo
// typecheck. O mapper normaliza com `Number()`, como faz com `plannedCents`.
const CALENDAR_MONTH: SQL<string | number> = sql<string | number>`cal.m`;

export const createDrizzlePlannedAmountsReader = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PlannedAmountsReadPort => {
  const { db } = handle;

  const listPlannedAmounts = async (
    filter: PlannedAmountsFilter,
  ): Promise<Result<readonly PlannedAmountRow[], BudgetPlansReadError>> => {
    // Filtros do PLANO — restringem quais nós da árvore aparecem. Vão no WHERE (AND).
    const planConditions: SQL[] = [];
    if (filter.budgetPlanId !== undefined) {
      planConditions.push(eq(schema.budgetPlans.id, filter.budgetPlanId));
    }
    if (filter.year !== undefined) {
      planConditions.push(eq(schema.budgetPlans.year, filter.year));
    }
    if (filter.programRef !== undefined) {
      planConditions.push(eq(schema.budgetPlans.programRef, filter.programRef));
    }

    // Filtros da REDE — restringem quais orçamentos entram na SOMA, nunca quais nós aparecem.
    // Por isso ficam no ON do LEFT JOIN (ver cabeçalho). Conjunção literal: pedir estado E
    // município ao mesmo tempo não casa nenhuma linha de `bgp_budgets` (uma Rede é estadual XOR
    // municipal) e o resultado sai zerado — leitura estritamente AND, nunca OR.
    const budgetJoinConditions: SQL[] = [eq(schema.budgets.budgetPlanId, schema.budgetPlans.id)];
    if (filter.partnerStateRef !== undefined) {
      budgetJoinConditions.push(
        eq(schema.budgets.partnerKind, 'state'),
        eq(schema.budgets.partnerRef, filter.partnerStateRef),
      );
    }
    if (filter.partnerMunicipalityRef !== undefined) {
      budgetJoinConditions.push(
        eq(schema.budgets.partnerKind, 'municipality'),
        eq(schema.budgets.partnerRef, filter.partnerMunicipalityRef),
      );
    }

    try {
      const rows = await db
        .select({
          budgetPlanId: schema.budgetPlans.id,
          costCenterId: schema.costCenters.id,
          costCenterName: schema.costCenters.name,
          categoryId: schema.categories.id,
          categoryName: schema.categories.name,
          subcategoryId: schema.subcategories.id,
          subcategoryName: schema.subcategories.name,
          month: CALENDAR_MONTH,
          // mysql2 devolve SUM (agregado sobre BIGINT) como string; COALESCE preserva o tipo do
          // agregado. A anotação é honesta com o runtime e o Number() abaixo reconstrói o cents.
          plannedCents: sql<string | number>`coalesce(sum(${schema.budgetResults.valueCents}), 0)`,
        })
        .from(schema.budgetPlans)
        .innerJoin(schema.costCenters, eq(schema.costCenters.budgetPlanId, schema.budgetPlans.id))
        .innerJoin(schema.categories, eq(schema.categories.costCenterId, schema.costCenters.id))
        .innerJoin(schema.subcategories, eq(schema.subcategories.categoryId, schema.categories.id))
        .crossJoin(MONTHS_CALENDAR)
        .leftJoin(schema.budgets, and(...budgetJoinConditions))
        .leftJoin(
          schema.budgetResults,
          and(
            eq(schema.budgetResults.subcategoryId, schema.subcategories.id),
            eq(schema.budgetResults.budgetId, schema.budgets.id),
            sql`${schema.budgetResults.month} = cal.m`,
          ),
        )
        .where(planConditions.length > 0 ? and(...planConditions) : undefined)
        .groupBy(
          schema.budgetPlans.id,
          schema.costCenters.id,
          schema.costCenters.name,
          schema.categories.id,
          schema.categories.name,
          schema.subcategories.id,
          schema.subcategories.name,
          CALENDAR_MONTH,
        )
        // Ordenação é contrato do port (o consumidor não reordena): árvore por nome, meses 1..12.
        // Os ids desempatam nomes iguais — determinismo não pode depender de dado do usuário.
        .orderBy(
          asc(schema.costCenters.name),
          asc(schema.costCenters.id),
          asc(schema.categories.name),
          asc(schema.categories.id),
          asc(schema.subcategories.name),
          asc(schema.subcategories.id),
          asc(CALENDAR_MONTH),
        );

      return ok(
        rows.map((r) => ({
          budgetPlanId: r.budgetPlanId,
          costCenterId: r.costCenterId,
          costCenterName: r.costCenterName,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          subcategoryId: r.subcategoryId,
          subcategoryName: r.subcategoryName,
          // `sql<number>` é asserção não-verificada: o typecheck não prova o que o driver devolve.
          // Normalizado como o `plannedCents` para o contrato não depender dessa promessa.
          month: Number(r.month),
          plannedCents: Number(r.plannedCents),
        })),
      );
    } catch (cause) {
      process.stderr.write(`[budget-plans-read:listPlannedAmounts] ${String(cause)}\n`);
      return err('budget-plans-read-query-failed');
    }
  };

  return { listPlannedAmounts };
};
