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
  // CTR-NUMBER-PROGRAM: classificação + metadados de cadastro crus (append no fim — as colunas
  // existentes preservam posição). O bloco `program` composto NÃO entra no CSV (é só leitura web).
  'classification',
  'programId',
  'budgetPlanId',
  'categorizacao',
  'centroDeCusto',
];

type PeriodDto = ContractListItemDto['originalPeriod'];
const periodEnd = (p: PeriodDto): string => (p.kind === 'Fixed' ? p.end : '');

// Células de estado efetivo (signedAt..endedAt). Switch exaustivo por `status`: campos de estado
// só existem em Active/Expired/Terminated; `endedAt` só nos terminais (incl. Cancelled).
const effectiveCells = (dto: ContractListItemDto): readonly string[] => {
  switch (dto.status) {
    case 'Pending':
      return ['', '', '', '', ''];
    case 'Cancelled':
      // ADR-0039: sem vigência efetiva; só `endedAt` (data do cancelamento).
      return ['', '', '', '', dto.endedAt];
    case 'Active':
      return [
        dto.signedAt,
        String(dto.currentValue.cents),
        dto.currentPeriod.start,
        periodEnd(dto.currentPeriod),
        '',
      ];
    case 'Expired':
    case 'Terminated':
      return [
        dto.signedAt,
        String(dto.currentValue.cents),
        dto.currentPeriod.start,
        periodEnd(dto.currentPeriod),
        dto.endedAt,
      ];
  }
};

// Achata o DTO discriminado em 18 células (ordem do HEADER): cadastro + estado efetivo +
// classificação/metadados crus (CTR-NUMBER-PROGRAM). Refs/rótulos nulos viram célula vazia.
const cellsFor = (dto: ContractListItemDto): readonly string[] => [
  dto.id,
  dto.sequentialNumber,
  dto.title,
  dto.objective,
  dto.status,
  String(dto.originalValue.cents),
  dto.originalPeriod.start,
  periodEnd(dto.originalPeriod),
  ...effectiveCells(dto),
  dto.classification,
  dto.programId ?? '',
  dto.budgetPlanId ?? '',
  dto.categorizacao ?? '',
  dto.centroDeCusto ?? '',
];

export const contractsToCsv = (contracts: readonly Contract[]): string =>
  toCsv(
    HEADER,
    contracts.map((c) => cellsFor(contractToListItem(c))),
  );
