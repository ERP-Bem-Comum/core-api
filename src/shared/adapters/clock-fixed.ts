import type { Clock } from '../ports/clock.ts';
import { utcCalendarDayOf } from './utc-calendar-day.ts';

export const ClockFixed = (at: Date): Clock => ({
  now: () => at,
  today: () => utcCalendarDayOf(at),
});
