import type { PaymentTargetError } from '../shared/payment-target.ts';
import type { SupplierDocumentError } from './supplier-document.ts';

// Erros do agregado `Supplier` — string union kebab EN. Compõe os erros dos VOs
// de payment target (`invalid-bank-account`/`invalid-pix-key`) e do documento
// (`invalid-supplier-document`).

export type SupplierError =
  | 'supplier-name-required'
  | 'supplier-email-required'
  | 'supplier-email-invalid'
  | 'supplier-corporate-name-required'
  | 'supplier-fantasy-name-required'
  // PF (CPF) não tem razão social nem nome fantasia: preenchidos são recusados, não ignorados (#1022).
  | 'supplier-corporate-name-not-allowed-for-pf'
  | 'supplier-fantasy-name-not-allowed-for-pf'
  | SupplierDocumentError
  | 'invalid-service-category'
  | 'invalid-service-rating'
  | 'supplier-payment-target-required'
  | PaymentTargetError
  | 'supplier-already-inactive'
  | 'supplier-already-active'
  | 'supplier-inactive-requires-deactivated-at';
