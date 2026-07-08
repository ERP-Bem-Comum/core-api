// Valores de fio idênticos ao legado (ERP-BACKEND BudgetPlanStatus) — precedente:
// ProgramStatus 'ATIVO' | 'INATIVO'. Transições EM_CALIBRACAO/APROVADO são a Fatia 4 (#318).
export type BudgetPlanStatus = 'RASCUNHO' | 'EM_CALIBRACAO' | 'APROVADO';

export const BUDGET_PLAN_STATUSES: readonly BudgetPlanStatus[] = [
  'RASCUNHO',
  'EM_CALIBRACAO',
  'APROVADO',
] as const;

export const isBudgetPlanStatus = (raw: string): raw is BudgetPlanStatus =>
  (BUDGET_PLAN_STATUSES as readonly string[]).includes(raw);
