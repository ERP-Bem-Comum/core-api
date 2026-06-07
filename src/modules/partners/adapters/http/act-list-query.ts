/**
 * Composição de leitura/filtro de Atos na borda (placeholder ADR-0036). Act não tem
 * `actMatchesFilter` no domínio (sem filtro avançado nesta fase), então o predicado mínimo
 * (search em name/email/cpf + active) vive aqui — espelha o filtro inline do `act-plugin` e o
 * `*ForExport` dos demais tipos. Funções puras, sem IO.
 */

import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import type { ActListQuery } from './act-schemas.ts';

export type ActExportFilter = Readonly<{ search?: string; active?: boolean }>;

export const queryToFilter = (q: Pick<ActListQuery, 'search' | 'active'>): ActExportFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.active !== undefined ? { active: q.active === 1 } : {}),
});

const matches = (act: Act, filter: ActExportFilter): boolean => {
  if (filter.search !== undefined) {
    const needle = filter.search.toLowerCase();
    const hit =
      act.name.toLowerCase().includes(needle) ||
      act.email.toLowerCase().includes(needle) ||
      String(act.cpf).includes(needle);
    if (!hit) return false;
  }
  if (filter.active !== undefined && (act.status === 'Active') !== filter.active) return false;
  return true;
};

/** Export: filtra (sem paginar) e ordena por nome; devolve os agregados p/ `actsToCsv`. */
export const actsForExport = (
  records: readonly ActReadRecord[],
  filter: ActExportFilter,
): readonly Act[] =>
  records
    .filter((r) => matches(r.act, filter))
    .sort((a, b) => a.act.name.localeCompare(b.act.name))
    .map((r) => r.act);
