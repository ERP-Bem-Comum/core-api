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
import type { ContractListItemDto } from './schemas.ts';

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
