/**
 * Adapter InMemory do `PaymentPositionReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado; sem seed, devolve lista vazia.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type {
  PaymentPositionReadPort,
  PaymentPositionRow,
} from '../../application/ports/payment-position-read.ts';

export const InMemoryPaymentPositionRead = (
  seed: readonly PaymentPositionRow[] = [],
): PaymentPositionReadPort => ({
  list: async () => ok(seed),
});
