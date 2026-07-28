/**
 * Adapter InMemory do `CashflowReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado de linhas de Payables; sem seed, devolve lista vazia. Aceita (e IGNORA) o
 * filtro — as rows semeadas já são AGREGADAS (não têm os eixos de filtro por payable: due_date,
 * status vivo, budget-plan…), então o filtro real vive no SQL (adapter drizzle). Paridade com
 * `InMemoryPaymentPositionRead`. `Receivables` é SEMPRE `[]` (montado no DTO da borda, #179).
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { CashflowReadPort, CashflowRow } from '../../application/ports/cashflow-read.ts';

export const InMemoryCashflowRead = (seed: readonly CashflowRow[] = []): CashflowReadPort => ({
  list: async () => ok(seed),
});
