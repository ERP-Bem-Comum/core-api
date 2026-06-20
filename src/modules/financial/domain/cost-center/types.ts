import type { CostCenterId } from './cost-center-id.ts';

// Centro de custo — dado de referência LOCAL do financeiro (`fin_cost_centers`, Decisão A,
// research.md D1). Dimensão de rateio: `code` (CC-001…) + `name`. Identidade estável via seed
// UUID fixo (SC-002). Read-only nesta feature (sem CRUD — FR-008). Sem `group` (≠ Category).
export type CostCenter = Readonly<{
  id: CostCenterId;
  code: string;
  name: string;
  active: boolean;
}>;

export type CreateInput = Readonly<{
  id: CostCenterId;
  code: string;
  name: string;
  active?: boolean;
}>;

export type CostCenterError = 'cost-center-code-empty' | 'cost-center-name-empty';
