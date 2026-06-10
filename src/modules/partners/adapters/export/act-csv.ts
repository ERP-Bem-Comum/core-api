/**
 * Serialização CSV da listagem de Acordos de Cooperação Técnica. Achata o agregado `Act`
 * (discriminado por `status`) nos campos do acordo; formato (escape RFC 4180, anti-fórmula,
 * BOM) vem do util compartilhado. Espelha `supplier-csv.ts`.
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { Act } from '../../domain/act/types.ts';

const HEADER: readonly string[] = [
  'id',
  'actNumber',
  'name',
  'email',
  'cnpj',
  'corporateName',
  'fantasyName',
  'occupationArea',
  'legalRepresentative',
  'startDate',
  'endDate',
  'hasFinancialTransfer',
  'status',
  'deactivatedAt',
];

const actToCells = (a: Act): readonly string[] => {
  const validityEnd = a.validity.kind === 'Fixed' ? a.validity.end : a.validity.start;
  const identity = [
    String(a.id),
    String(a.actNumber),
    a.name,
    a.email,
    String(a.cnpj),
    a.corporateName,
    a.fantasyName,
    a.occupationArea,
    a.legalRepresentative,
    PlainDate.toISOString(a.validity.start),
    PlainDate.toISOString(validityEnd),
    a.hasFinancialTransfer ? 'true' : 'false',
    a.status,
  ];
  switch (a.status) {
    case 'Active':
      return [...identity, ''];
    case 'Inactive':
      return [...identity, a.deactivatedAt.toISOString()];
  }
};

export const actsToCsv = (acts: readonly Act[]): string => toCsv(HEADER, acts.map(actToCells));
