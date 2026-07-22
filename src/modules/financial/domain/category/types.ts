import type { CategoryId } from './category-id.ts';
import type { CategoryGroup } from './category-group.ts';
import type { CostCenterId } from '../cost-center/cost-center-id.ts';

// Categoria de classificação financeira — dado de referência local (`fin_categories`, Decisão A,
// research.md D1). Agrupada por natureza (`group`). Identidade estável via seed UUID fixo (SC-002).
// Read-only nesta feature (sem CRUD — FR-008).
export type Category = Readonly<{
  id: CategoryId;
  name: string;
  group: CategoryGroup;
  active: boolean;
  // Hierarquia auto-referente (#147 F3): null = categoria top-level; preenchido = subcategoria
  // (filha de outra categoria). O documento referencia a folha selecionada via `categoryRef`.
  parentId: CategoryId | null;
  // #341: nível Centro de Custo → Categoria. null = categoria sem centro (back-compat pré-#341);
  // preenchido = pertence ao centro. Soft ref a `fin_cost_centers` (sem FK — ADR-0014, igual ao parentId).
  costCenterId: CostCenterId | null;
}>;

export type CreateInput = Readonly<{
  id: CategoryId;
  name: string;
  group: string; // raw (seed/row) — validado contra o union no smart constructor
  active?: boolean;
  parentId?: CategoryId | null;
  costCenterId?: CostCenterId | null;
}>;

export type CategoryError = 'category-name-empty' | 'category-group-invalid';
