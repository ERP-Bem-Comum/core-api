import type { Clock } from '../ports/clock.ts';
import * as PlainDate from '../kernel/plain-date.ts';

export const ClockReal = (): Clock => ({
  now: () => new Date(),
  today: () => PlainDate.fromDate(new Date()),
});
