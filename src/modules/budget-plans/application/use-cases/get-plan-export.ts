import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import type { BudgetPlan as BudgetPlanEntity } from '../../domain/budget-plan/types.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type {
  CostStructureRepository,
  CostStructureRepositoryError,
} from '../../domain/cost-structure/repository.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';
import type { PartnerNetworkPort, PartnerNetworkError } from '../ports/partner-network.ts';

// Seção serializável de export de um plano (US5). A application CARREGA os dados; o adapter HTTP
// FORMATA o CSV (`adapters/http/budget-plan-csv.ts`) — a application não conhece CSV nem produz
// string PT-BR. Uma linha de CSV nasce do produto `budgets × subcategories`.
export type PlanExportBudget = Readonly<{ id: string; partnerName: string }>;
export type PlanExportSubcategory = Readonly<{
  id: string;
  costCenterName: string;
  categoryName: string;
  name: string;
  launchType: string;
}>;
export type PlanExportValue = Readonly<{
  budgetId: string;
  subcategoryId: string;
  valueCents: number;
}>;
export type PlanExportSection = Readonly<{
  planId: string;
  planLabel: string;
  budgets: readonly PlanExportBudget[];
  subcategories: readonly PlanExportSubcategory[];
  values: readonly PlanExportValue[];
}>;

export type PlanExportLoadError =
  | ProgramCatalogError
  | PartnerNetworkError
  | CostStructureRepositoryError
  | BudgetResultRepositoryError;

export type PlanExportDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  costStructureRepo: CostStructureRepository;
  budgetResultRepo: BudgetResultRepository;
  programCatalog: ProgramCatalogPort;
  partnerNetwork: PartnerNetworkPort;
}>;

// Loader compartilhado (CA2 + CA3): achata um plano em PlanExportSection. Rótulo = ano + nome do
// programa + versão (major); parceiro (Rede) resolvido por ref; subcategorias vindas da árvore de
// custos; valores por (orçamento × subcategoria) a partir dos budget_results.
export const loadPlanExportSection = async (
  deps: PlanExportDeps,
  plan: BudgetPlanEntity,
): Promise<Result<PlanExportSection, PlanExportLoadError>> => {
  const program = await deps.programCatalog.getByRef(plan.programRef);
  if (!program.ok) return program;
  const programName = program.value?.name ?? String(plan.programRef);
  const planLabel = `${plan.year} ${programName} ${plan.version.major}`;

  const partners = await deps.partnerNetwork.listNetworkPartners();
  if (!partners.ok) return partners;
  const nameByRef = new Map(partners.value.map((p) => [p.ref, p.name] as const));
  const budgets: readonly PlanExportBudget[] = plan.budgets.map((b) => ({
    id: String(b.id),
    partnerName: nameByRef.get(String(b.partner.ref)) ?? String(b.partner.ref),
  }));

  const tree = await deps.costStructureRepo.findByBudgetPlanId(plan.id);
  if (!tree.ok) return tree;
  const subcategories: readonly PlanExportSubcategory[] = tree.value.costCenters.flatMap((cc) =>
    cc.categories.flatMap((cat) =>
      cat.subcategories.map((sub) => ({
        id: String(sub.id),
        costCenterName: cc.name,
        categoryName: cat.name,
        name: sub.name,
        launchType: sub.launchType,
      })),
    ),
  );

  const values: PlanExportValue[] = [];
  for (const b of plan.budgets) {
    const results = await deps.budgetResultRepo.listByBudgetId(b.id);
    if (!results.ok) return results;
    for (const r of results.value) {
      values.push({
        budgetId: String(b.id),
        subcategoryId: String(r.subcategoryId),
        valueCents: r.value.cents,
      });
    }
  }

  return ok({ planId: String(plan.id), planLabel, budgets, subcategories, values });
};

export type GetPlanExportCommand = Readonly<{ planId: string }>;

export type GetPlanExportError =
  | BudgetPlanId.BudgetPlanIdError
  | 'budget-plan-not-found'
  | 'plan-not-approved-for-consolidation'
  | BudgetPlanRepositoryError
  | PlanExportLoadError;

// CA3 — export CSV de um plano. Exige plano APROVADO (FR-005: plan-not-approved-for-consolidation).
export const getPlanExport =
  (deps: PlanExportDeps) =>
  async (cmd: GetPlanExportCommand): Promise<Result<PlanExportSection, GetPlanExportError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.planId);
    if (!planId.ok) return planId;

    const found = await deps.planRepo.findById(planId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('budget-plan-not-found');
    if (found.value.status !== 'APROVADO') return err('plan-not-approved-for-consolidation');

    return loadPlanExportSection(deps, found.value);
  };
