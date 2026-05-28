/**
 * Serialização CSV da listagem de contratos (C4) — RFC 4180 + hardening anti-fórmula.
 *
 * Função pura: `contractsToCsv(contracts) => string`. Reusa `contractToListItem` (C1) para
 * achatar o agregado discriminado por `status` em campos planos — sem reduplicar a lógica de
 * `Money`/`Period`. Colunas em ordem fixa (D2). BOM UTF-8 no início (D5, Excel + PT-BR).
 *
 * Escape (D3/D4):
 *  - Anti-fórmula (CSV injection): célula iniciando em `= + - @ \t \r` recebe prefixo `'` —
 *    senão Excel/Sheets executam a fórmula (security-backend MUST).
 *  - RFC 4180: célula com `,` `"` `\n` `\r` é envolta em aspas; `"` interno vira `""`.
 */

import type { Contract } from '../../domain/contract/types.ts';
import { contractToListItem } from './contract-dto.ts';
import type { ContractListItemDto } from './schemas.ts';

const BOM = '﻿';
const SEPARATOR = ',';
const LINE_TERMINATOR = '\r\n';

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

const FORMULA_TRIGGERS: ReadonlySet<string> = new Set(['=', '+', '-', '@', '\t', '\r']);
const RFC4180_SPECIAL = /[",\n\r]/;

const neutralizeFormula = (value: string): string => {
  const first = value[0];
  return first !== undefined && FORMULA_TRIGGERS.has(first) ? `'${value}` : value;
};

const escapeCell = (raw: string): string => {
  const neutralized = neutralizeFormula(raw);
  return RFC4180_SPECIAL.test(neutralized) ? `"${neutralized.replaceAll('"', '""')}"` : neutralized;
};

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

const toLine = (cells: readonly string[]): string => cells.map(escapeCell).join(SEPARATOR);

export const contractsToCsv = (contracts: readonly Contract[]): string => {
  const rows = [toLine(HEADER), ...contracts.map((c) => toLine(cellsFor(contractToListItem(c))))];
  return BOM + rows.join(LINE_TERMINATOR) + LINE_TERMINATOR;
};
