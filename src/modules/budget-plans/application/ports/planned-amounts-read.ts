/**
 * BGP-READ-PORT — Port de LEITURA (read-only) do ORÇADO do módulo budget-plans, consumível
 * cross-módulo SÓ pela `public-api/read.ts` (ADR-0006/ADR-0014). Open Host Service do papel que
 * o ADR-0051 já dá ao módulo: owner da taxonomia do planejável.
 *
 * Saída PLANA: uma linha por `(subcategoria, mês)` com os 3 níveis da árvore desnormalizados.
 * O consumidor (`reports`) costura orçado × realizado ANTES de montar a árvore — devolver árvore
 * pronta obrigaria a desmontá-la (decisão travada no W0).
 *
 * A GRADE DE 12 MESES É CONTRATO: toda subcategoria DO PLANO devolve exatamente 12 linhas,
 * `plannedCents = 0` nos meses sem lançamento — inclusive a subcategoria sem nenhum lançamento.
 * A árvore vem do PLANO, nunca dos lançamentos.
 */

import type { Result } from '../../../../shared/primitives/result.ts';

/** Linha plana do orçado. Só `string`/`number` — nunca VO, Money ou agregado (ADR-0006). */
export type PlannedAmountRow = Readonly<{
  budgetPlanId: string;
  costCenterId: string;
  costCenterName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  /** Mês do exercício, 1..12. */
  month: number;
  /** Soma das Redes (`bgp_budgets`) que o filtro deixou entrar. 0 quando não há lançamento. */
  plannedCents: number;
}>;

/**
 * Filtros combináveis em **AND**. Todos opcionais; ausente = sem restrição.
 * `partnerStateRef`/`partnerMunicipalityRef` são refs OPACOS (o módulo não resolve nome).
 * Não há filtro por status de plano nem escolha de "versão vigente" — quem escolhe o plano é
 * o consumidor, via `budgetPlanId`.
 */
export type PlannedAmountsFilter = Readonly<{
  programRef?: string;
  budgetPlanId?: string;
  year?: number;
  partnerStateRef?: string;
  partnerMunicipalityRef?: string;
}>;

export type BudgetPlansReadError = 'budget-plans-read-query-failed';

export type PlannedAmountsReadPort = Readonly<{
  listPlannedAmounts: (
    filter: PlannedAmountsFilter,
  ) => Promise<Result<readonly PlannedAmountRow[], BudgetPlansReadError>>;
}>;
