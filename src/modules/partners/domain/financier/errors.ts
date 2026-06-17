/**
 * Erros do agregado `Financier` — string literal union kebab EN, consistente com
 * o restante do módulo `partners` (CLAUDE.md §idioma) e com os VOs do kernel
 * (`invalid-cnpj`). `invalid-cnpj` é reexportado do VO `Cnpj`.
 */

import type { PaymentTargetError } from '../shared/payment-target.ts';

export type FinancierError =
  | 'financier-name-required'
  | 'financier-corporate-name-required'
  | 'financier-legal-representative-required'
  | 'financier-telephone-required'
  | 'financier-address-required'
  | 'invalid-cnpj'
  | PaymentTargetError
  | 'financier-already-inactive'
  | 'financier-already-active'
  | 'financier-inactive-requires-deactivated-at';
