/**
 * Composição de leitura da lista de Acordos na borda (ADR-0032, transitório).
 * Mapeia a query → `ActListFilter` e reusa `actMatchesFilter` (fonte única no use case).
 * Funções puras, sem IO. Espelha `supplier-list-query.ts`.
 */

import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import type { Act } from '#src/modules/partners/domain/act/types.ts';
import {
  actMatchesFilter,
  type ActListFilter,
} from '#src/modules/partners/application/use-cases/list-acts.ts';
import type { ActListQuery } from './act-schemas.ts';

export const queryToFilter = (
  q: Pick<ActListQuery, 'search' | 'active' | 'hasFinancialTransfer' | 'occupationArea'>,
): ActListFilter => ({
  ...(q.search !== undefined ? { search: q.search } : {}),
  ...(q.active !== undefined ? { active: q.active === 1 } : {}),
  ...(q.hasFinancialTransfer !== undefined
    ? { hasFinancialTransfer: q.hasFinancialTransfer === 1 }
    : {}),
  ...(q.occupationArea !== undefined ? { occupationArea: q.occupationArea } : {}),
});

/** Export: filtra (sem paginar) e ordena por nome; devolve os agregados p/ `actsToCsv`. */
export const actsForExport = (
  records: readonly ActReadRecord[],
  filter: ActListFilter,
): readonly Act[] =>
  records
    .filter((r) => actMatchesFilter(r.act, filter))
    .sort((a, b) => a.act.name.localeCompare(b.act.name))
    .map((r) => r.act);
