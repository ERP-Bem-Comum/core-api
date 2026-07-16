/**
 * Mapeador da árvore de custos (domínio) -> DTO HTTP (Fatia 2/US2, BDG-COST-STRUCTURE).
 * Serializa branded ids (`BudgetPlanId`/`CostCenterId`/…) como string. Usado tanto no GET
 * quanto nas respostas 201 dos 3 POSTs (todos devolvem a árvore inteira após a operação).
 */

import type { CostStructure } from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import { withInheritedActive } from '#src/modules/budget-plans/domain/cost-structure/cost-structure.ts';
import type { CostStructureTreeDto } from './schemas.ts';

// O `active` que sai daqui é o EFETIVO (#454 gap 3): a herança é resolvida no domínio, não no front.
// Sem isto, uma subcategoria ativa pendurada num centro desativado voltaria como `active: true` e a
// tela mostraria um nó que o backend considera fora de circulação.
export const costStructureToDto = (structure: CostStructure): CostStructureTreeDto => {
  const view = withInheritedActive(structure);
  return {
    budgetPlanId: String(view.budgetPlanId),
    costCenters: view.costCenters.map((cc) => ({
      id: String(cc.id),
      name: cc.name,
      direction: cc.direction,
      active: cc.active,
      categories: cc.categories.map((cat) => ({
        id: String(cat.id),
        name: cat.name,
        active: cat.active,
        subcategories: cat.subcategories.map((sub) => ({
          id: String(sub.id),
          name: sub.name,
          launchType: sub.launchType,
          active: sub.active,
        })),
      })),
    })),
  };
};
