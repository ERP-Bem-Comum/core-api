// Erros do agregado Reconciliation (string-literal union EN kebab-case — domínio puro).
export type ReconciliationError =
  | 'title-not-paid'
  | 'reconciliation-not-balanced'
  | 'reconciliation-already-undone'
  | 'empty-reconciliation';
