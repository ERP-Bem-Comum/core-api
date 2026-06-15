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
  payableRead: 'payable:read',
  payableApprove: 'payable:approve',
  payableUndoApproval: 'payable:undo-approval',
} as const;

export type FinancialPermission = (typeof FINANCIAL_PERMISSION)[keyof typeof FINANCIAL_PERMISSION];
