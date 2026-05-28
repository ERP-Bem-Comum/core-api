import type { PlainDate } from '../kernel/plain-date.ts';

export type Clock = Readonly<{
  now: () => Date;
  /** Data-calendário de hoje (UTC). Ver inquiry 0020 — base do Temporal. */
  today: () => PlainDate;
}>;
