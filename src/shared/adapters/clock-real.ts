import type { Clock } from '../ports/clock.ts';

export const ClockReal = (): Clock => ({
  now: () => new Date(),
});
