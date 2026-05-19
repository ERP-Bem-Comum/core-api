import type { Period } from '../../domain/shared/period.ts';
import { formatDate } from './date.ts';

export const formatPeriod = (p: Period): string => {
  switch (p.kind) {
    case 'Fixed':
      return `${formatDate(p.start)} a ${formatDate(p.end)}`;
    case 'Indefinite':
      return `${formatDate(p.start)} (indefinido)`;
    default: {
      const _exhaustive: never = p;
      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
    }
  }
};
