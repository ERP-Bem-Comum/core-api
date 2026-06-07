/**
 * Serialização CSV da listagem de Atos (placeholder ADR-0036, clone enxuto de Collaborator).
 * Achata o agregado `Act` (discriminado por `status`) nos campos do core do placeholder; formato
 * (escape RFC 4180, anti-fórmula, BOM) vem do util compartilhado. Espelha `supplier-csv.ts`.
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import type { Act } from '../../domain/act/types.ts';

const HEADER: readonly string[] = [
  'id',
  'name',
  'email',
  'cpf',
  'occupationArea',
  'role',
  'startOfContract',
  'employmentRelationship',
  'registrationStatus',
  'status',
  'deactivatedAt',
];

const actToCells = (a: Act): readonly string[] => {
  const identity = [
    a.id,
    a.name,
    a.email,
    String(a.cpf),
    a.occupationArea,
    a.role,
    a.startOfContract.toISOString(),
    a.employmentRelationship,
    a.registrationStatus,
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
