import type { PaymentTargetError } from './payment-target.ts';

// Erros do agregado `Supplier` — string union kebab EN. Compõe os erros dos VOs
// de payment target (`invalid-bank-account`/`invalid-pix-key`).

export type SupplierError =
  | 'supplier-name-required'
  | 'supplier-email-required'
  | 'supplier-email-invalid'
  | 'supplier-corporate-name-required'
  | 'supplier-fantasy-name-required'
  | 'invalid-cnpj'
  | 'invalid-service-category'
  | 'invalid-service-rating'
  | 'supplier-payment-target-required'
  | PaymentTargetError
  | 'supplier-already-inactive'
  | 'supplier-already-active'
  | 'supplier-inactive-requires-deactivated-at';
