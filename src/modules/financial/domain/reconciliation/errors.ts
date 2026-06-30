// Erros do agregado Reconciliation (string-literal union EN kebab-case — domínio puro).
export type ReconciliationError =
  | 'title-not-paid'
  | 'reconciliation-not-balanced'
  | 'reconciliation-already-undone'
  | 'empty-reconciliation'
  // #141/#247: sinal da diferença classificada incoerente com o tratamento
  // (Discount/Partial exigem < 0; Interest/Penalty/Fee exigem > 0).
  | 'difference-sign-invalid';
