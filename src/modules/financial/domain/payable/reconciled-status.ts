// Derivação do status de conciliação de um título a partir da soma REALMENTE conciliada (#141/#247).
//
// A conciliação parcial (delta #247) grava por item o valor real alocado (`reconciledValueCents`),
// não mais sempre o valor do título. O status do título passa a ser DERIVADO da soma das conciliações
// ativas contra ele: soma >= valor → fecha (`Reconciled`); soma > 0 e < valor → saldo aberto
// (`PartiallyReconciled`). Função pura — sem I/O, sem estado. O caller (repositório) conhece a soma
// acumulada e aplica a transição.

// Status de conciliação derivado (subconjunto de DocumentStatus relativo à conciliação).
export type ReconciledStatus = 'Reconciled' | 'PartiallyReconciled';

// `valueCents` = valor original do título; `reconciledSumCents` = soma das conciliações ativas (> 0).
export const deriveReconciledStatus = (
  valueCents: number,
  reconciledSumCents: number,
): ReconciledStatus => (reconciledSumCents >= valueCents ? 'Reconciled' : 'PartiallyReconciled');
