/**
 * Adapter InMemory do `GeneralReportReadPort` — driver `memory` (testes, boot HTTP sem DB).
 * Aceita um array semeado; sem seed, devolve página vazia. IGNORA o filtro (as rows semeadas já
 * são o read-model plano; o filtro real vive no SQL do adapter drizzle — paridade com o InMemory
 * do REP-4), mas HONRA a paginação (slice + total) para exercitar o contrato `Page<T>` na borda.
 *
 * Slice C (#442): honra o gate `includeBankData` — quando `false`, zera `pixKey`/`bankAccount` do
 * seed (redação campo-a-campo), espelhando o adapter real que nem resolve o supplier no partners.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type {
  GeneralReportReadPort,
  GeneralReportRow,
} from '../../application/ports/general-report-read.ts';

export const InMemoryGeneralReportRead = (
  seed: readonly GeneralReportRow[] = [],
): GeneralReportReadPort => ({
  list: async (_filter, pagination, options) => {
    const { page, limit } = pagination;
    const start = (page - 1) * limit;
    const sliced = seed.slice(start, start + limit);
    const items = options.includeBankData
      ? sliced
      : sliced.map((r) => ({ ...r, pixKey: null, bankAccount: null }));
    return ok({
      items,
      page,
      pageSize: limit,
      total: seed.length,
    });
  },
});
