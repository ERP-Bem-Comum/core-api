/**
 * Serialização CSV da listagem de financiadores. Achata o agregado `Financier` (discriminado por
 * `status`) em células planas; formato (escape RFC 4180, anti-fórmula, BOM) vem do util
 * compartilhado `#src/shared/utils/csv.ts`. Espelha `supplier-csv.ts`. Adapter puro, sem IO.
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import type { Financier } from '../../domain/financier/types.ts';

const HEADER: readonly string[] = [
  'id',
  'name',
  'corporateName',
  'legalRepresentative',
  'cnpj',
  'telephone',
  'address',
  'status',
  'deactivatedAt',
];

const financierToCells = (f: Financier): readonly string[] => {
  const identity = [
    f.id,
    f.name,
    f.corporateName,
    f.legalRepresentative,
    String(f.cnpj),
    f.telephone,
    f.address,
    f.status,
  ];
  switch (f.status) {
    case 'Active':
      return [...identity, ''];
    case 'Inactive':
      return [...identity, f.deactivatedAt.toISOString()];
  }
};

export const financiersToCsv = (financiers: readonly Financier[]): string =>
  toCsv(HEADER, financiers.map(financierToCells));
