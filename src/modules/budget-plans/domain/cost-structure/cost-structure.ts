import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { BudgetPlanStatus } from '../budget-plan/status.ts';
import * as CostDirection from './cost-direction.ts';
import * as LaunchType from './launch-type.ts';
import type { CostCenterId } from './cost-center-id.ts';
import type { CategoryId } from './category-id.ts';
import type { SubcategoryId } from './subcategory-id.ts';
import type { CostStructure, CostCenter, Category, Subcategory } from './types.ts';
import type { CostStructureError } from './errors.ts';

// Editabilidade (legado OPTIONS_FOR_UPDATE_BUDGET_PLAN): só RASCUNHO/EM_CALIBRACAO; APROVADO bloqueia.
const EDITABLE_STATUSES: readonly BudgetPlanStatus[] = ['RASCUNHO', 'EM_CALIBRACAO'];
const guardEditable = (status: BudgetPlanStatus): CostStructureError | null =>
  EDITABLE_STATUSES.includes(status) ? null : 'budget-plan-not-editable';

const cleanName = (raw: string): string => raw.trim();

export const empty = (budgetPlanId: BudgetPlanId): CostStructure => ({
  budgetPlanId,
  costCenters: [],
});

export type AddCostCenterInput = Readonly<{ id: CostCenterId; name: string; direction: string }>;

export const addCostCenter = (
  structure: CostStructure,
  input: AddCostCenterInput,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(input.name);
  if (name.length === 0) return err('cost-node-name-required');
  const direction = CostDirection.parse(input.direction);
  if (!direction.ok) return err('cost-node-invalid-direction');

  const costCenter: CostCenter = {
    id: input.id,
    name,
    direction: direction.value,
    active: true,
    categories: [],
  };
  return ok({ ...structure, costCenters: [...structure.costCenters, costCenter] });
};

export type AddCategoryInput = Readonly<{
  id: CategoryId;
  costCenterId: CostCenterId;
  name: string;
}>;

export const addCategory = (
  structure: CostStructure,
  input: AddCategoryInput,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(input.name);
  if (name.length === 0) return err('cost-node-name-required');

  if (!structure.costCenters.some((cc) => cc.id === input.costCenterId)) {
    return err('cost-node-parent-not-found');
  }
  const category: Category = { id: input.id, name, active: true, subcategories: [] };
  const costCenters = structure.costCenters.map((cc) =>
    cc.id === input.costCenterId ? { ...cc, categories: [...cc.categories, category] } : cc,
  );
  return ok({ ...structure, costCenters });
};

export type AddSubcategoryInput = Readonly<{
  id: SubcategoryId;
  categoryId: CategoryId;
  name: string;
  launchType: string;
}>;

export const addSubcategory = (
  structure: CostStructure,
  input: AddSubcategoryInput,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(input.name);
  if (name.length === 0) return err('cost-node-name-required');
  const launchType = LaunchType.parse(input.launchType);
  if (!launchType.ok) return err('cost-node-invalid-launch-type');

  const parentExists = structure.costCenters.some((cc) =>
    cc.categories.some((cat) => cat.id === input.categoryId),
  );
  if (!parentExists) return err('cost-node-parent-not-found');

  const subcategory: Subcategory = {
    id: input.id,
    name,
    launchType: launchType.value,
    active: true,
  };
  const costCenters = structure.costCenters.map((cc) => ({
    ...cc,
    categories: cc.categories.map((cat) =>
      cat.id === input.categoryId
        ? { ...cat, subcategories: [...cat.subcategories, subcategory] }
        : cat,
    ),
  }));
  return ok({ ...structure, costCenters });
};

// ─── Editar / desativar (#454 gap 3) ─────────────────────────────────────────
//
// Não há exclusão de nó: `bgp_budget_results.subcategory_id` aponta para subcategorias SEM FK, e
// apagar deixaria lançamento órfão. Só soft (`active`).
//
// `patchNode` percorre a árvore uma vez e aplica `edit` no nó de id alvo, no nível certo. Os 6
// exports abaixo (3 níveis × rename/setActive) são casos dele — o walk é o mesmo, muda só o que se
// altera e onde se procura.

type NodeEdit<T> = (node: T) => T;

// Aplica `edit` ao cost-center alvo. `null` se o id não existe (o caller vira cost-node-not-found).
const patchCostCenter = (
  structure: CostStructure,
  id: CostCenterId,
  edit: NodeEdit<CostCenter>,
): CostStructure | null => {
  if (!structure.costCenters.some((cc) => cc.id === id)) return null;
  return {
    ...structure,
    costCenters: structure.costCenters.map((cc) => (cc.id === id ? edit(cc) : cc)),
  };
};

const patchCategory = (
  structure: CostStructure,
  id: CategoryId,
  edit: NodeEdit<Category>,
): CostStructure | null => {
  if (!structure.costCenters.some((cc) => cc.categories.some((cat) => cat.id === id))) return null;
  return {
    ...structure,
    costCenters: structure.costCenters.map((cc) => ({
      ...cc,
      categories: cc.categories.map((cat) => (cat.id === id ? edit(cat) : cat)),
    })),
  };
};

const patchSubcategory = (
  structure: CostStructure,
  id: SubcategoryId,
  edit: NodeEdit<Subcategory>,
): CostStructure | null => {
  const exists = structure.costCenters.some((cc) =>
    cc.categories.some((cat) => cat.subcategories.some((sub) => sub.id === id)),
  );
  if (!exists) return null;
  return {
    ...structure,
    costCenters: structure.costCenters.map((cc) => ({
      ...cc,
      categories: cc.categories.map((cat) => ({
        ...cat,
        subcategories: cat.subcategories.map((sub) => (sub.id === id ? edit(sub) : sub)),
      })),
    })),
  };
};

// Guard + validação de nome, comuns aos 3 renames. O nome segue a MESMA regra do add.
const renamed = <T extends { readonly name: string }>(
  patched: (edit: NodeEdit<T>) => CostStructure | null,
  rawName: string,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(rawName);
  if (name.length === 0) return err('cost-node-name-required');
  const next = patched((node) => ({ ...node, name }));
  return next === null ? err('cost-node-not-found') : ok(next);
};

const activated = <T extends { readonly active: boolean }>(
  patched: (edit: NodeEdit<T>) => CostStructure | null,
  active: boolean,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const next = patched((node) => ({ ...node, active }));
  return next === null ? err('cost-node-not-found') : ok(next);
};

export const renameCostCenter = (
  structure: CostStructure,
  id: CostCenterId,
  name: string,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> =>
  renamed<CostCenter>((edit) => patchCostCenter(structure, id, edit), name, planStatus);

export const renameCategory = (
  structure: CostStructure,
  id: CategoryId,
  name: string,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> =>
  renamed<Category>((edit) => patchCategory(structure, id, edit), name, planStatus);

export const renameSubcategory = (
  structure: CostStructure,
  id: SubcategoryId,
  name: string,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> =>
  renamed<Subcategory>((edit) => patchSubcategory(structure, id, edit), name, planStatus);

// Desativar/reativar tocam SÓ o nó alvo — os filhos caem por herança na leitura (D2). Cascata na
// escrita destruiria a intenção de cada nó e tornaria a reativação ambígua.
export const setCostCenterActive = (
  structure: CostStructure,
  id: CostCenterId,
  active: boolean,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> =>
  activated<CostCenter>((edit) => patchCostCenter(structure, id, edit), active, planStatus);

export const setCategoryActive = (
  structure: CostStructure,
  id: CategoryId,
  active: boolean,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> =>
  activated<Category>((edit) => patchCategory(structure, id, edit), active, planStatus);

export const setSubcategoryActive = (
  structure: CostStructure,
  id: SubcategoryId,
  active: boolean,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> =>
  activated<Subcategory>((edit) => patchSubcategory(structure, id, edit), active, planStatus);

// Estado EFETIVO para leitura: um nó vale só se ele E todos os ancestrais estiverem ativos.
//
// É view, não estado: NUNCA persistir o resultado — a linha guarda a intenção do nó, e achatar o
// efetivo nela apagaria quem foi desativado à mão (a reativação do pai reviveria tudo).
export const withInheritedActive = (structure: CostStructure): CostStructure => ({
  ...structure,
  costCenters: structure.costCenters.map((cc) => ({
    ...cc,
    categories: cc.categories.map((cat) => ({
      ...cat,
      active: cc.active && cat.active,
      subcategories: cat.subcategories.map((sub) => ({
        ...sub,
        active: cc.active && cat.active && sub.active,
      })),
    })),
  })),
});

// US4/W1-C — clonagem profunda pai→filho. Reconstrói a árvore com novos ids (id-factory injetado —
// mantém a pureza; o domínio não gera uuid) preservando nomes/direção/launchType. Devolve o mapa
// oldSubcatId→newSubcatId para remapear os budget_results (o legado casa por nome; por id é mais robusto).
export type CloneIdFactory = Readonly<{
  costCenter: () => CostCenterId;
  category: () => CategoryId;
  subcategory: () => SubcategoryId;
}>;

export type ClonedCostStructure = Readonly<{
  structure: CostStructure;
  subcategoryIdMap: ReadonlyMap<string, SubcategoryId>;
}>;

export const clone = (
  source: CostStructure,
  targetPlanId: BudgetPlanId,
  ids: CloneIdFactory,
): ClonedCostStructure => {
  const subcategoryIdMap = new Map<string, SubcategoryId>();
  // `active` acompanha o clone (#454 gap 3): o cenário/calibração derivado nasce com a mesma árvore
  // do pai, e um nó desativado lá não deve reaparecer ativo aqui — seria ressuscitar por engano o
  // que o planejador tirou de circulação.
  const costCenters: readonly CostCenter[] = source.costCenters.map((cc: CostCenter) => ({
    id: ids.costCenter(),
    name: cc.name,
    direction: cc.direction,
    active: cc.active,
    categories: cc.categories.map((cat: Category) => ({
      id: ids.category(),
      name: cat.name,
      active: cat.active,
      subcategories: cat.subcategories.map((sub: Subcategory) => {
        const newId = ids.subcategory();
        subcategoryIdMap.set(String(sub.id), newId);
        return { id: newId, name: sub.name, launchType: sub.launchType, active: sub.active };
      }),
    })),
  }));
  return { structure: { budgetPlanId: targetPlanId, costCenters }, subcategoryIdMap };
};
