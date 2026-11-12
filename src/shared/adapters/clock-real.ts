import type { Clock } from '../ports/clock.ts';
import { utcCalendarDayOf } from './utc-calendar-day.ts';

export const ClockReal = (): Clock => ({
  now: () => new Date(),
  today: () => utcCalendarDayOf(new Date()),
});
