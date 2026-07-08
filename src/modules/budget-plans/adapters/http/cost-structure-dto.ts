/**
 * Mapeador da árvore de custos (domínio) -> DTO HTTP (Fatia 2/US2, BDG-COST-STRUCTURE).
 * Serializa branded ids (`BudgetPlanId`/`CostCenterId`/…) como string. Usado tanto no GET
 * quanto nas respostas 201 dos 3 POSTs (todos devolvem a árvore inteira após a operação).
 */

import type { CostStructure } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import type { CostStructureTreeDto } from './schemas.ts';

export const costStructureToDto = (structure: CostStructure): CostStructureTreeDto => ({
  budgetPlanId: String(structure.budgetPlanId),
  costCenters: structure.costCenters.map((cc) => ({
    id: String(cc.id),
    name: cc.name,
    direction: cc.direction,
    categories: cc.categories.map((cat) => ({
      id: String(cat.id),
      name: cat.name,
      subcategories: cat.subcategories.map((sub) => ({
        id: String(sub.id),
        name: sub.name,
        launchType: sub.launchType,
      })),
    })),
  })),
});
