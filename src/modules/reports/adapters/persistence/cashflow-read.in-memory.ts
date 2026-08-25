/**
 * Adapter InMemory do `CashflowReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado de linhas de Payables; sem seed, devolve lista vazia. Aceita (e IGNORA) o
 * filtro — as rows semeadas já são AGREGADAS (não têm os eixos de filtro por payable: due_date,
 * status vivo, budget-plan…), então o filtro real vive no SQL (adapter drizzle). Paridade com
 * `InMemoryPaymentPositionRead`. `Receivables` é SEMPRE `[]` (montado no DTO da borda, #179).
 */
import { ok } from '#src/shared/primitives/result.ts';
import type {
  CashflowReadPort,
  CashflowRow,
  CashflowChartRow,
} from '../../application/ports/cashflow-read.ts';

export const InMemoryCashflowRead = (
  seed: readonly CashflowRow[] = [],
  chartSeed: readonly CashflowChartRow[] = [],
): CashflowReadPort => ({
  list: async () => ok(seed),
  // Slice B (#590): série temporal — seed próprio (aceita `installmentsDueDate`); sem seed, vazio.
  listChart: async () => ok(chartSeed),
});
