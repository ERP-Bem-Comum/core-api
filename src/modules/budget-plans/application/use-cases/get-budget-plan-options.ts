import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
} from '../../domain/budget-plan/repository.ts';
import type { ProgramCatalogPort, ProgramCatalogError } from '../ports/program-catalog.ts';
import type {
  PartnerNetworkPort,
  PartnerNetworkError,
  NetworkPartnerView,
} from '../ports/partner-network.ts';

export type ProgramOption = Readonly<{
  ref: string;
  name: string;
  abbreviation: string;
}>;

export type BudgetPlanOptions = Readonly<{
  programs: readonly ProgramOption[];
  years: readonly number[];
  redes: readonly NetworkPartnerView[];
}>;

export type GetBudgetPlanOptionsError =
  | ProgramCatalogError
  | PartnerNetworkError
  | BudgetPlanRepositoryError;

export type GetBudgetPlanOptionsDeps = Readonly<{
  planRepo: BudgetPlanRepository;
  programCatalog: ProgramCatalogPort;
  partnerNetwork: PartnerNetworkPort;
  clock: Clock;
}>;

// DECISÃO DE CONTRATO (000-request.md): diverge do legado — a CA5 da #315 pede
// programas/anos/redes para a tela de criação. years = anos distintos dos planos
// existentes ∪ {anoCorrente, anoCorrente+1}, dedup, ordenado asc.
export const getBudgetPlanOptions =
  (deps: GetBudgetPlanOptionsDeps) =>
  async (): Promise<Result<BudgetPlanOptions, GetBudgetPlanOptionsError>> => {
    const programs = await deps.programCatalog.listActive();
    if (!programs.ok) return programs;

    const planYears = await deps.planRepo.listYears();
    if (!planYears.ok) return planYears;

    const redes = await deps.partnerNetwork.listNetworkPartners();
    if (!redes.ok) return redes;

    const currentYear = deps.clock.now().getUTCFullYear();
    const years = [...new Set([...planYears.value, currentYear, currentYear + 1])].toSorted(
      (a, b) => a - b,
    );

    return ok({
      programs: programs.value.map((p) => ({
        ref: p.ref,
        name: p.name,
        abbreviation: p.abbreviation,
      })),
      years,
      redes: redes.value,
    });
  };
