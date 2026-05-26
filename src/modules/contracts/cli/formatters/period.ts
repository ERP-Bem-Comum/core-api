import type { Period } from '#src/shared/kernel/period.ts';
import { formatPlainDate } from './plain-date.ts';

export const formatPeriod = (p: Period): string => {
  switch (p.kind) {
    case 'Fixed':
      return `${formatPlainDate(p.start)} a ${formatPlainDate(p.end)}`;
    case 'Indefinite':
      return `${formatPlainDate(p.start)} (indefinido)`;
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
};
