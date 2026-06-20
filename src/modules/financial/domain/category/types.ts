import type { CategoryId } from './category-id.ts';
import type { CategoryGroup } from './category-group.ts';

// Categoria de classificação financeira — dado de referência local (`fin_categories`, Decisão A,
// research.md D1). Agrupada por natureza (`group`). Identidade estável via seed UUID fixo (SC-002).
// Read-only nesta feature (sem CRUD — FR-008).
export type Category = Readonly<{
  id: CategoryId;
  name: string;
  group: CategoryGroup;
  active: boolean;
}>;

export type CreateInput = Readonly<{
  id: CategoryId;
  name: string;
  group: string; // raw (seed/row) — validado contra o union no smart constructor
  active?: boolean;
}>;

export type CategoryError = 'category-name-empty' | 'category-group-invalid';
