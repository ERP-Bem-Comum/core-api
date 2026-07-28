/**
 * Adapter InMemory do `GeneralReportReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado; sem seed, devolve página vazia. IGNORA o filtro (as rows semeadas já
 * são o read-model plano; o filtro real vive no SQL do adapter drizzle — paridade com o InMemory
 * do REP-4), mas HONRA a paginação (slice + total) para exercitar o contrato `Page<T>` na borda.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type {
  GeneralReportReadPort,
  GeneralReportRow,
} from '../../application/ports/general-report-read.ts';

export const InMemoryGeneralReportRead = (
  seed: readonly GeneralReportRow[] = [],
): GeneralReportReadPort => ({
  list: async (_filter, pagination) => {
    const { page, limit } = pagination;
    const start = (page - 1) * limit;
    return ok({
      items: seed.slice(start, start + limit),
      page,
      pageSize: limit,
      total: seed.length,
    });
  },
});
