import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { ProgramRef, PartnerStateRef, PartnerMunicipalityRef } from '../shared/refs.ts';
import type { BudgetPlanStatus } from './status.ts';
import type { PlanVersion } from './version.ts';

// "Rede" (funcional) = estado parceiro XOR município parceiro (legado: budgets.partnerStateId
// XOR partnerMunicipalityId). União discriminada elimina a dualidade nullable do legado.
export type BudgetPartner = Readonly<
  { kind: 'state'; ref: PartnerStateRef } | { kind: 'municipality'; ref: PartnerMunicipalityRef }
>;

// #458 — Orçamento = plano + Rede, e nada mais. O `value` informado saiu: o total por Rede é a soma
// dos lançamentos (bgp_budget_results), derivada na leitura. É o modelo do legado (o CreateBudgetDto
// não tem valor; a coluna era cache que ninguém escrevia).
export type Budget = Readonly<{
  id: BudgetId;
  partner: BudgetPartner;
}>;

export type BudgetPlan = Readonly<{
  id: BudgetPlanId;
  year: number;
  programRef: ProgramRef;
  version: PlanVersion;
  status: BudgetPlanStatus;
  budgets: readonly Budget[];
  // Árvore de planos (US4, legado @Tree): raiz tem parentId=null e scenarioName=null; calibração/cenário
  // são filhos derivados. scenarioName != null identifica um cenário (calibração mantém null).
  parentId: BudgetPlanId | null;
  scenarioName: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Autoria da última escrita (BGP-UPDATED-BY-AUDIT/#373) — espelha `updatedAt`, mesmas 6
  // transições do header. Nullable: linhas legadas (pré-#373) não têm autor conhecido (D3).
  updatedByRef: UserRef | null;
}>;
