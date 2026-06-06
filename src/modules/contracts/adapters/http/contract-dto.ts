/**
 * Mapper agregado `Contract` → DTO de resposta da borda HTTP.
 *
 * Serializa os VOs do kernel para JSON: `Money` → `{ cents }`, `Period` →
 * `{ kind, start, end? }` (datas via `PlainDate.toISOString`), `Date` → ISO 8601.
 * Switch exaustivo sobre `status` (compilador trava variante faltante). Não expõe
 * campos internos do agregado (`homologatedAmendmentIds`).
 */

import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { Period } from '#src/shared/kernel/period.ts';

import type { Contract } from '../../domain/contract/types.ts';
import type { ContractDetail } from '../../application/use-cases/get-contract-detail.ts';
import { amendmentToDto } from './amendment-dto.ts';
import { documentToDto } from './document-dto.ts';
import type { ContractorBlock } from './contractor-composition.ts';
import type { ContractDetailDto, ContractListItemDto } from './schemas.ts';

type PeriodDto =
  | Readonly<{ kind: 'Fixed'; start: string; end: string }>
  | Readonly<{ kind: 'Indefinite'; start: string }>;

const periodToDto = (p: Period): PeriodDto =>
  p.kind === 'Fixed'
    ? { kind: 'Fixed', start: PlainDate.toISOString(p.start), end: PlainDate.toISOString(p.end) }
    : { kind: 'Indefinite', start: PlainDate.toISOString(p.start) };

export const contractToListItem = (c: Contract): ContractListItemDto => {
  const registration = {
    id: c.id,
    sequentialNumber: c.sequentialNumber,
    title: c.title,
    objective: c.objective,
    originalValue: { cents: c.originalValue.cents },
    originalPeriod: periodToDto(c.originalPeriod),
  };

  switch (c.status) {
    case 'Pending':
      return { ...registration, status: 'Pending' };
    case 'Active':
      return {
        ...registration,
        status: 'Active',
        signedAt: c.signedAt.toISOString(),
        currentValue: { cents: c.currentValue.cents },
        currentPeriod: periodToDto(c.currentPeriod),
      };
    case 'Expired':
      return {
        ...registration,
        status: 'Expired',
        signedAt: c.signedAt.toISOString(),
        currentValue: { cents: c.currentValue.cents },
        currentPeriod: periodToDto(c.currentPeriod),
        endedAt: c.endedAt.toISOString(),
      };
    case 'Terminated':
      return {
        ...registration,
        status: 'Terminated',
        signedAt: c.signedAt.toISOString(),
        currentValue: { cents: c.currentValue.cents },
        currentPeriod: periodToDto(c.currentPeriod),
        endedAt: c.endedAt.toISOString(),
      };
  }
};

/**
 * Mapper do read-model `ContractDetail` → DTO de detalhe enriquecido
 * (CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES, ADR-0032).
 *
 * Reusa `contractToListItem` para o cabeçalho do contrato e aninha
 * `amendments[]` (ordenados por `amendmentNumber` asc) + `documents[]`. A composição
 * é de LEITURA na borda — os mappers de filho (`amendmentToDto`, `documentToDto`) já
 * fazem o switch exaustivo sobre os discriminated unions do domínio.
 */
export const contractToDetailDto = (
  detail: ContractDetail,
  contractor: ContractorBlock,
): ContractDetailDto => {
  const amendments = [...detail.amendments]
    .sort((a, b) => a.amendmentNumber.localeCompare(b.amendmentNumber))
    .map(amendmentToDto);
  return {
    ...contractToListItem(detail.contract),
    contractor,
    observations: detail.contract.observations,
    email: detail.contract.email,
    telephone: detail.contract.telephone,
    amendments,
    documents: detail.documents.map(documentToDto),
  };
};
