/**
 * BGP-PLAN-LABELS-READ — Port de LEITURA (read-only) do RÓTULO do Plano Orçamentário, consumível
 * cross-módulo SÓ pela `public-api/read.ts` (ADR-0006/ADR-0014). Open Host Service: o budget-plans
 * é o owner do rótulo (compõe `(programa, ano, versão)` + `scenarioName`); o consumidor (`reports`,
 * REP-3 · #446) apenas costura `budgetPlanRef → rótulo` na sua borda.
 *
 * Saída PLANA: `Map<id, rótulo>` só com `string` — nunca VO/agregado. Ids ausentes do resultado
 * (plano inexistente) simplesmente não aparecem no Map; o consumidor decide o fallback.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetPlansReadError } from './planned-amounts-read.ts';

export type PlanLabelsReadPort = Readonly<{
  resolvePlanLabels: (
    ids: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, string>, BudgetPlansReadError>>;
}>;
