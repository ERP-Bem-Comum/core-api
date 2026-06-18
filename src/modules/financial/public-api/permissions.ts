/**
 * Catálogo de permissões do módulo financial (RBAC).
 *
 * SSoT única das permissions `resource:action` deste módulo. Substitui magic strings
 * inline por acesso nomeado type-safe — typo vira erro de `tsc` + autocomplete.
 * Espelha o padrão de contracts/public-api/permissions.ts (ADR-0006).
 */

export const FINANCIAL_PERMISSION = {
  // fiscal-document: operações sobre documentos fiscais (Fato Gerador)
  read: 'fiscal-document:read',
  write: 'fiscal-document:write',
  cancel: 'fiscal-document:cancel',
  // payable: operações sobre títulos gerados
  // payableRead e payableUndoApproval removidas (FR-010/ADR-0004 010 - permissoes inertes: sem rota enforca).
  payableApprove: 'payable:approve',
  // reconciliation: conciliação bancária (US1 importação/leitura; US2/3/4 conciliar/desfazer)
  reconciliationImport: 'reconciliation:import',
  reconciliationRead: 'reconciliation:read',
  reconciliationWrite: 'reconciliation:write',
} as const;

export type FinancialPermission = (typeof FINANCIAL_PERMISSION)[keyof typeof FINANCIAL_PERMISSION];
