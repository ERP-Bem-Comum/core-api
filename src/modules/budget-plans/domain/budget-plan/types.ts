import type { Money } from '../../../../shared/kernel/money.ts';
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

export type Budget = Readonly<{
  id: BudgetId;
  partner: BudgetPartner;
  value: Money;
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
}>;
