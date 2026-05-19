import type { Clock } from '../ports/clock.ts';

export const ClockFixed = (at: Date): Clock => ({
  now: () => at,
});
