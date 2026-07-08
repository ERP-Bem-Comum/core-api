export type CostStructureError =
  | 'budget-plan-not-editable' // escrita só com plano RASCUNHO/EM_CALIBRACAO (CA3)
  | 'cost-node-name-required'
  | 'cost-node-parent-not-found' // pai (cost-center/category) inexistente na árvore
  | 'cost-node-invalid-direction'
  | 'cost-node-invalid-launch-type';
