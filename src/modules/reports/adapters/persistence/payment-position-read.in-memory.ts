/**
 * Adapter InMemory do `PaymentPositionReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado; sem seed, devolve lista vazia. #588: aceita (e IGNORA) o filtro — as
 * rows semeadas já são AGREGADAS (não têm os eixos de filtro por payable: due_date, status vivo,
 * budget-plan…), então o filtro real vive no SQL (adapter drizzle). Paridade com `InMemoryAnalysisRead`.
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
