/**
 * Serialização CSV da listagem de contratos (C4). Achata o agregado discriminado por `status`
 * (via `contractToListItem`, C1) em células planas; a mecânica de formato (escape RFC 4180,
 * anti-fórmula, BOM) vem do util compartilhado `#src/shared/utils/csv.ts`. Colunas em ordem fixa (D2).
 */

import { toCsv } from '#src/shared/utils/csv.ts';
import type { Contract } from '../../domain/contract/types.ts';
import { contractToListItem } from './contract-dto.ts';
import type { ContractListItemDto } from './schemas.ts';

const HEADER: readonly string[] = [
  'id',
  'sequentialNumber',
  'title',
  'objective',
  'status',
  'originalValueCents',
  'originalPeriodStart',
  'originalPeriodEnd',
  'signedAt',
  'currentValueCents',
  'currentPeriodStart',
  'currentPeriodEnd',
  'endedAt',
];

type PeriodDto = ContractListItemDto['originalPeriod'];
const periodEnd = (p: PeriodDto): string => (p.kind === 'Fixed' ? p.end : '');

// Achata o DTO discriminado em 13 células (ordem do HEADER). Switch exaustivo por `status`:
// campos de estado efetivo só existem em Active/Expired/Terminated; `endedAt` só nos terminais.
const cellsFor = (dto: ContractListItemDto): readonly string[] => {
  const registration = [
    dto.id,
    dto.sequentialNumber,
    dto.title,
    dto.objective,
    dto.status,
    String(dto.originalValue.cents),
    dto.originalPeriod.start,
    periodEnd(dto.originalPeriod),
  ];
  switch (dto.status) {
    case 'Pending':
      return [...registration, '', '', '', '', ''];
    case 'Active':
      return [
        ...registration,
        dto.signedAt,
        String(dto.currentValue.cents),
        dto.currentPeriod.start,
        periodEnd(dto.currentPeriod),
        '',
      ];
    case 'Expired':
    case 'Terminated':
      return [
        ...registration,
        dto.signedAt,
        String(dto.currentValue.cents),
        dto.currentPeriod.start,
        periodEnd(dto.currentPeriod),
        dto.endedAt,
      ];
  }
};

export const contractsToCsv = (contracts: readonly Contract[]): string =>
  toCsv(
    HEADER,
    contracts.map((c) => cellsFor(contractToListItem(c))),
  );
