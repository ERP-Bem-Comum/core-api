export type BudgetPlanError =
  | 'budget-plan-invalid-year'
  | 'budget-plan-duplicate-partner'
  | 'budget-not-found'
  // Ciclo de vida (US4)
  | 'budget-plan-not-approved'
  | 'budget-plan-is-scenario'
  | 'budget-plan-already-approved'
  | 'budget-plan-calibration-open'
  | 'budget-plan-scenery-limit';
