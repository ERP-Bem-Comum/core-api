import type { Clock } from '../ports/clock.ts';
import * as PlainDate from '../kernel/plain-date.ts';

export const ClockFixed = (at: Date): Clock => ({
  now: () => at,
  today: () => PlainDate.fromDate(at),
});
