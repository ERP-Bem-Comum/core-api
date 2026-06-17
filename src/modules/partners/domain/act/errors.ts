import type { CnpjError } from '#src/shared/kernel/cnpj.ts';
import type { PeriodError } from '#src/shared/kernel/period.ts';
import type { PlainDateError } from '#src/shared/kernel/plain-date.ts';
import type { OccupationAreaError } from '../collaborator/occupation-area.ts';
import type { PaymentTargetError } from '../shared/payment-target.ts';
import type { ActNumberError } from './act-number.ts';

// Erros do agregado `Act` (Acordo de Cooperação Técnica) — string union kebab EN.

export type ActError =
  | 'act-name-required'
  | 'act-email-required'
  | 'act-email-invalid'
  | 'act-corporate-name-required'
  | 'act-fantasy-name-required'
  | 'act-legal-representative-required'
  | 'act-payment-target-required'
  | 'act-already-inactive'
  | 'act-already-active'
  | ActNumberError
  | CnpjError
  | PeriodError
  | PlainDateError
  | OccupationAreaError
  | PaymentTargetError;
