import { strict as assert } from 'node:assert';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { isOk } from '#src/shared/index.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryProgramCatalog } from '#src/modules/budget-plans/adapters/catalog/program-catalog.in-memory.ts';
import { InMemoryPartnerNetwork } from '#src/modules/budget-plans/adapters/network/partner-network.in-memory.ts';
import type { BudgetPlanRepository } from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
import type { ProgramCatalogPort } from '#src/modules/budget-plans/application/ports/program-catalog.ts';
import type { PartnerNetworkPort } from '#src/modules/budget-plans/application/ports/partner-network.ts';
import { createBudgetPlan } from '#src/modules/budget-plans/application/use-cases/create-budget-plan.ts';

export const NOW = new Date('2026-07-02T12:00:00.000Z');

export const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

export const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';
export const PROGRAM_PARC_REF = '22222222-2222-4222-8222-222222222222';
export const PROGRAM_INACTIVE_REF = '33333333-3333-4333-8333-333333333333';
export const PROGRAM_UNKNOWN_REF = '99999999-9999-4999-8999-999999999999';
export const STATE_CE_REF = '44444444-4444-4444-8444-444444444444';
export const MUN_FORTALEZA_REF = '55555555-5555-4555-8555-555555555555';

export const seedPrograms = [
  { ref: PROGRAM_ETI_REF, name: 'Ensino em Tempo Integral', abbreviation: 'ETI', active: true },
  { ref: PROGRAM_PARC_REF, name: 'Parceiros', abbreviation: 'PARC', active: true },
  { ref: PROGRAM_INACTIVE_REF, name: 'Programa Extinto', abbreviation: 'EXT', active: false },
] as const;

export const seedStates = [{ ref: STATE_CE_REF, name: 'Ceará', uf: 'CE' }] as const;

export const seedMunicipalities = [
  { ref: MUN_FORTALEZA_REF, name: 'Fortaleza', uf: 'CE' },
] as const;

export type Deps = Readonly<{
  planRepo: BudgetPlanRepository;
  programCatalog: ProgramCatalogPort;
  partnerNetwork: PartnerNetworkPort;
  clock: Clock;
}>;

export const makeDeps = (): Deps => ({
  planRepo: InMemoryBudgetPlanRepository().repo,
  programCatalog: InMemoryProgramCatalog(seedPrograms),
  partnerNetwork: InMemoryPartnerNetwork({
    states: seedStates,
    municipalities: seedMunicipalities,
  }),
  clock,
});

export const createPlanOrFail = async (
  deps: Deps,
  cmd: Readonly<{ year: number; programRef: string }>,
) => {
  const r = await createBudgetPlan(deps)(cmd);
  assert.ok(isOk(r), `createBudgetPlan falhou: ${JSON.stringify(r)}`);
  return r.value.plan;
};
