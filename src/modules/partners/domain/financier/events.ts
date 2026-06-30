/**
 * Eventos de domínio do agregado `Financier`. PascalCase passado (DO D§24).
 * `occurredAt` é injetado pelo caller (não `new Date()` — DO B§14).
 */

import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { FinancierId } from './financier-id.ts';

export type FinancierEvent = Readonly<
  | { type: 'FinancierRegistered'; financierId: FinancierId; cnpj: Cnpj; occurredAt: Date }
  | { type: 'FinancierDeactivated'; financierId: FinancierId; occurredAt: Date }
  | { type: 'FinancierReactivated'; financierId: FinancierId; occurredAt: Date }
  | { type: 'FinancierEdited'; financierId: FinancierId; occurredAt: Date }
>;
