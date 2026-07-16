import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as CostCenterId from '../../domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '../../domain/cost-structure/category-id.ts';
import * as SubcategoryId from '../../domain/cost-structure/subcategory-id.ts';
import {
  renameCostCenter,
  renameCategory,
  renameSubcategory,
  setCostCenterActive,
  setCategoryActive,
  setSubcategoryActive,
} from '../../domain/cost-structure/cost-structure.ts';
import type { CostStructure } from '../../domain/cost-structure/types.ts';
import type {
  CostStructureRepository,
  CostStructureMutateError,
} from '../../domain/cost-structure/repository.ts';

/** Nível da árvore que o PATCH endereça — vem do path da rota, não do body. */
export type CostNodeLevel = 'cost-center' | 'category' | 'subcategory';

export type PatchCostNodeCommand = Readonly<{
  budgetPlanId: string;
  level: CostNodeLevel;
  nodeId: string;
  name?: string;
  active?: boolean;
}>;

export type PatchCostNodeError =
  | BudgetPlanId.BudgetPlanIdError
  | CostCenterId.CostCenterIdError
  | CategoryId.CategoryIdError
  | SubcategoryId.SubcategoryIdError
  | 'cost-node-patch-empty'
  | CostStructureMutateError;

export type PatchCostNodeDeps = Readonly<{
  costStructureRepo: CostStructureRepository;
}>;

// Um use case para os 3 níveis × 2 campos: o fluxo é idêntico (validar id → mutate → domínio) e a
// única variação é qual função do domínio chamar. Seis use cases seriam seis cópias do mesmo texto.
//
// `name` e `active` na mesma chamada aplicam em sequência DENTRO do mesmo `mutate` — um só commit,
// e o guard de status (plano APROVADO) roda uma vez, no primeiro.
export const patchCostNode =
  (deps: PatchCostNodeDeps) =>
  async (cmd: PatchCostNodeCommand): Promise<Result<CostStructure, PatchCostNodeError>> => {
    const planId = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!planId.ok) return planId;

    // PATCH sem campo nenhum não é sucesso silencioso — é pedido malformado (400 na borda).
    if (cmd.name === undefined && cmd.active === undefined) return err('cost-node-patch-empty');

    const { name, active } = cmd;

    switch (cmd.level) {
      case 'cost-center': {
        const nodeId = CostCenterId.rehydrate(cmd.nodeId);
        if (!nodeId.ok) return nodeId;
        return deps.costStructureRepo.mutate(planId.value, (structure, status) => {
          let next = structure;
          if (name !== undefined) {
            const r = renameCostCenter(next, nodeId.value, name, status);
            if (!r.ok) return r;
            next = r.value;
          }
          if (active !== undefined) {
            const r = setCostCenterActive(next, nodeId.value, active, status);
            if (!r.ok) return r;
            next = r.value;
          }
          return ok(next);
        });
      }
      case 'category': {
        const nodeId = CategoryId.rehydrate(cmd.nodeId);
        if (!nodeId.ok) return nodeId;
        return deps.costStructureRepo.mutate(planId.value, (structure, status) => {
          let next = structure;
          if (name !== undefined) {
            const r = renameCategory(next, nodeId.value, name, status);
            if (!r.ok) return r;
            next = r.value;
          }
          if (active !== undefined) {
            const r = setCategoryActive(next, nodeId.value, active, status);
            if (!r.ok) return r;
            next = r.value;
          }
          return ok(next);
        });
      }
      case 'subcategory': {
        const nodeId = SubcategoryId.rehydrate(cmd.nodeId);
        if (!nodeId.ok) return nodeId;
        return deps.costStructureRepo.mutate(planId.value, (structure, status) => {
          let next = structure;
          if (name !== undefined) {
            const r = renameSubcategory(next, nodeId.value, name, status);
            if (!r.ok) return r;
            next = r.value;
          }
          if (active !== undefined) {
            const r = setSubcategoryActive(next, nodeId.value, active, status);
            if (!r.ok) return r;
            next = r.value;
          }
          return ok(next);
        });
      }
    }
  };
